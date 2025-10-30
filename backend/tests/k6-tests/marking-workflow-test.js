import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  stages: config.loadPatterns.moderate,
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Allow up to 2s for marking operations
    http_req_failed: ['rate<0.15'],
  },
};

const { baseUrl, apiBase, credentials } = config;

function login(userType) {
  const creds = credentials[userType];
  const response = http.post(
    `${apiBase}/auth/login`,
    `username=${creds.username}&password=${creds.password}`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  
  return response.status === 200 ? response.json('access_token') : null;
}

function makeAuthRequest(token, endpoint, method = 'GET', payload = null) {
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
  };
  
  if (method === 'GET') {
    return http.get(`${apiBase}${endpoint}`, params);
  } else if (method === 'POST' && payload) {
    params.headers['Content-Type'] = 'application/json';
    return http.post(`${apiBase}${endpoint}`, JSON.stringify(payload), params);
  } else if (method === 'PATCH' && payload) {
    params.headers['Content-Type'] = 'application/json';
    return http.patch(`${apiBase}${endpoint}`, JSON.stringify(payload), params);
  }
}

export default function () {
  // Simulate marker behavior (staff)
  const userTypes = ['admin', 'staff'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  const token = login(userType);
  if (!token) {
    console.error(`Failed to login as ${userType}`);
    return;
  }

  // Get assessments
  const assessmentsResponse = makeAuthRequest(token, '/assessments/');
  if (assessmentsResponse.status !== 200) {
    console.error('Failed to get assessments');
    return;
  }

  const assessments = assessmentsResponse.json();
  if (assessments.length === 0) {
    console.log('No assessments available for marking');
    return;
  }

  const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)];
  const assessmentId = randomAssessment.id;

  sleep(0.5);

  // Test 1: Get assessment questions (first step in marking workflow)
  const questionsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/questions`);
  check(questionsResponse, {
    'questions load for marking': (r) => r.status === 200,
    'questions response time < 1s': (r) => r.timings.duration < 1000,
    'questions returns array': (r) => Array.isArray(r.json()),
  });

  if (questionsResponse.status !== 200) {
    console.log('No questions available');
    return;
  }

  const questions = questionsResponse.json();
  if (questions.length === 0) {
    console.log('Assessment has no questions');
    return;
  }

  sleep(0.5);

  // Test 2: Get answer sheets to mark
  const answerSheetsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/answer-sheets`);
  check(answerSheetsResponse, {
    'answer sheets load': (r) => r.status === 200 || r.status === 403,
    'answer sheets response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  if (answerSheetsResponse.status === 200) {
    const answerSheets = answerSheetsResponse.json();
    
    if (answerSheets.length > 0) {
      const randomSheet = answerSheets[Math.floor(Math.random() * answerSheets.length)];
      const fileId = randomSheet.id;
      const studentId = randomSheet.student_id;
      
      sleep(0.5);
      
      // Test 3: Download answer sheet PDF (marker viewing submission)
      const pdfResponse = makeAuthRequest(token, `/uploaded-files/${fileId}/answer-sheet`);
      check(pdfResponse, {
        'answer sheet PDF loads': (r) => r.status === 200 || r.status === 404,
        'PDF load time < 3s': (r) => r.timings.duration < 3000,
        'PDF is correct type': (r) => {
          if (r.status === 200) {
            const contentType = r.headers['Content-Type'] || '';
            return contentType.includes('application/pdf');
          }
          return r.status === 404;
        },
      });

      sleep(0.5);

      // Test 4: Submit question results
      // Randomly mark a question
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      const questionId = randomQuestion.id;
      const maxMarks = randomQuestion.max_marks || 10;
      
      // Generate a random mark (between 0 and max_marks)
      const randomMark = Math.floor(Math.random() * (maxMarks + 1));
      
      const markingPayload = {
        student_id: studentId,
        assessment_id: assessmentId,
        question_id: questionId,
        mark: randomMark,
        comment: 'K6 test marking',
      };
      
      const markingResponse = makeAuthRequest(token, '/question-results/', 'POST', markingPayload);
      check(markingResponse, {
        'marking submission works': (r) => r.status === 200 || r.status === 201 || r.status === 409,
        'marking response time < 1.5s': (r) => r.timings.duration < 1500,
        'marking returns result': (r) => {
          if (r.status === 200 || r.status === 201) {
            const result = r.json();
            return result.hasOwnProperty('mark') && result.hasOwnProperty('student_id');
          }
          return r.status === 409; // OK if already exists
        },
      });

      sleep(0.5);

      // Test 5: Get student results to verify marking
      const studentResultsResponse = makeAuthRequest(
        token, 
        `/student-results/assessments/${assessmentId}/my-results`
      );
      check(studentResultsResponse, {
        'student results loads': (r) => r.status === 200 || r.status === 403,
        'student results response time < 1s': (r) => r.timings.duration < 1000,
      });
    }
  }

  sleep(0.5);

  // Test 6: Get assessment stats (marker checking progress)
  const statsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/stats`);
  check(statsResponse, {
    'stats load after marking': (r) => r.status === 200,
    'stats response time < 3s': (r) => r.timings.duration < 3000,
    'stats shows marking progress': (r) => {
      if (r.status === 200) {
        const stats = r.json();
        return stats.hasOwnProperty('grading_completion') &&
               stats.hasOwnProperty('question_performance');
      }
      return false;
    },
  });

  sleep(0.5);

  // Test 7: Get question results for a specific student/question combination (requires params)
  const questionResultsResponse = makeAuthRequest(
    token, 
    `/question-results/?student_id=${studentId}&assessment_id=${assessmentId}&question_id=${questionId}`
  );
  check(questionResultsResponse, {
    'question result loads': (r) => r.status === 200,
    'question result response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
