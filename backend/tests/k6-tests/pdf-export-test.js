import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  stages: [
    { duration: '20s', target: 2 },   // Very gradual ramp up for heavy PDF operations
    { duration: '40s', target: 2 },   // Steady state with low concurrency
    { duration: '20s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'], // Allow up to 30s for PDF generation and ZIP
    http_req_failed: ['rate<0.3'],      // Allow higher failure rate (PDFs might not exist)
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
  }
}

export default function () {
  // Only staff/admin can export PDFs
  const userTypes = ['admin', 'staff'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  console.log(`Testing PDF export as ${userType}`);
  
  const token = login(userType);
  if (!token) {
    console.error(`Failed to login as ${userType}`);
    return;
  }

  // Get courses
  const coursesResponse = makeAuthRequest(token, '/courses/');
  if (coursesResponse.status !== 200) {
    console.error('Failed to get courses');
    return;
  }

  const courses = coursesResponse.json();
  if (courses.length === 0) {
    console.log('No courses available for PDF export testing');
    return;
  }

  const randomCourse = courses[Math.floor(Math.random() * courses.length)];
  const courseId = randomCourse.id;

  console.log(`Testing with course: ${courseId}`);

  sleep(1);

  // Get assessments for the course
  const assessmentsResponse = makeAuthRequest(token, `/courses/${courseId}/assessments`);
  if (assessmentsResponse.status !== 200) {
    console.error('Failed to get assessments');
    return;
  }

  const assessments = assessmentsResponse.json();
  if (assessments.length === 0) {
    console.log('No assessments available for PDF export testing');
    return;
  }

  const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)];
  const assessmentId = randomAssessment.id;

  console.log(`Testing with assessment: ${assessmentId}`);

  sleep(1);

  // Test 1: Export annotated PDFs
  // This endpoint processes multiple PDFs, applies annotations, and creates a ZIP
  const exportPayload = {
    course_id: courseId,
    assessment_id: assessmentId,
  };

  console.log(`Starting PDF export test...`);
  
  const exportResponse = makeAuthRequest(token, '/export/annotated-pdfs', 'POST', exportPayload);
  
  console.log(`PDF export status: ${exportResponse.status}`);
  console.log(`PDF export duration: ${exportResponse.timings.duration}ms`);
  
  check(exportResponse, {
    'export endpoint responds': (r) => r.status === 200 || r.status === 404,
    'export response time < 30s': (r) => r.timings.duration < 30000,
    'export returns ZIP file': (r) => {
      if (r.status === 200) {
        const contentType = r.headers['Content-Type'] || '';
        return contentType.includes('application/zip') || 
               contentType.includes('application/octet-stream');
      }
      return r.status === 404; // OK if no files exist
    },
    'export has content-disposition': (r) => {
      if (r.status === 200) {
        return r.headers['Content-Disposition'] && 
               r.headers['Content-Disposition'].includes('attachment');
      }
      return r.status === 404;
    },
  });

  sleep(2);

  // Test 2: Download individual question paper (PDF serving)
  const questionPaperResponse = makeAuthRequest(token, `/assessments/${assessmentId}/question-paper`);
  
  console.log(`Question paper status: ${questionPaperResponse.status}`);
  
  check(questionPaperResponse, {
    'question paper request completes': (r) => r.status === 200 || r.status === 404,
    'question paper response time < 5s': (r) => r.timings.duration < 5000,
    'question paper is PDF': (r) => {
      if (r.status === 200) {
        const contentType = r.headers['Content-Type'] || '';
        return contentType.includes('application/pdf');
      }
      return r.status === 404;
    },
  });

  sleep(1);

  // Test 3: Download results CSV (another export operation)
  const csvResponse = makeAuthRequest(token, `/assessments/${assessmentId}/results/download`);
  
  console.log(`CSV download status: ${csvResponse.status}`);
  
  check(csvResponse, {
    'CSV download responds': (r) => r.status === 200 || r.status === 404,
    'CSV response time < 8s': (r) => r.timings.duration < 8000,
    'CSV has correct headers': (r) => {
      if (r.status === 200) {
        return r.headers['Content-Disposition'] && 
               r.headers['Content-Disposition'].includes('attachment');
      }
      return r.status === 404;
    },
  });

  sleep(1);

  // Test 4: Get answer sheets list (to see if files exist before export)
  const answerSheetsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/answer-sheets`);
  
  console.log(`Answer sheets status: ${answerSheetsResponse.status}`);
  
  check(answerSheetsResponse, {
    'answer sheets loads': (r) => r.status === 200 || r.status === 403,
    'answer sheets response time < 2s': (r) => r.timings.duration < 2000,
    'answer sheets returns array': (r) => {
      if (r.status === 200) {
        return Array.isArray(r.json());
      }
      return r.status === 403; // OK if not authorized
    },
  });

  if (answerSheetsResponse.status === 200) {
    const answerSheets = answerSheetsResponse.json();
    console.log(`Found ${answerSheets.length} answer sheets for export testing`);
    
    if (answerSheets.length > 0) {
      const randomSheet = answerSheets[Math.floor(Math.random() * answerSheets.length)];
      const fileId = randomSheet.id;
      
      sleep(1);
      
      // Test 5: Download individual answer sheet PDF
      const answerSheetResponse = makeAuthRequest(token, `/uploaded-files/${fileId}/answer-sheet`);
      
      console.log(`Individual answer sheet status: ${answerSheetResponse.status}`);
      
      check(answerSheetResponse, {
        'individual answer sheet downloads': (r) => r.status === 200 || r.status === 404,
        'individual download response time < 5s': (r) => r.timings.duration < 5000,
        'individual answer sheet is PDF': (r) => {
          if (r.status === 200) {
            const contentType = r.headers['Content-Type'] || '';
            return contentType.includes('application/pdf');
          }
          return r.status === 404;
        },
      });
    }
  }

  sleep(2);
}
