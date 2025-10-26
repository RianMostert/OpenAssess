import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  stages: config.loadPatterns.moderate,
  thresholds: config.thresholds.heavy, // Heavier thresholds due to complex queries
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

function makeAuthRequest(token, endpoint) {
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
  };
  
  return http.get(`${apiBase}${endpoint}`, params);
}

export default function () {
  // Focus on staff/admin users who would access assessment data
  const userTypes = ['admin', 'staff'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  const token = login(userType);
  if (!token) {
    console.error(`Failed to login as ${userType}`);
    return;
  }

  // Test 1: Get all assessments
  const assessmentsResponse = makeAuthRequest(token, '/assessments/');
  check(assessmentsResponse, {
    'assessments list loads': (r) => r.status === 200,
    'assessments response time < 1.5s': (r) => r.timings.duration < 1500,
    'assessments returns array': (r) => Array.isArray(r.json()),
  });

  if (assessmentsResponse.status === 200) {
    const assessments = assessmentsResponse.json();
    
    if (assessments.length > 0) {
      const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)];
      const assessmentId = randomAssessment.id;
      
      sleep(0.5);
      
      // Test 2: Get assessment details
      const detailsResponse = makeAuthRequest(token, `/assessments/${assessmentId}`);
      check(detailsResponse, {
        'assessment details loads': (r) => r.status === 200,
        'details response time < 1s': (r) => r.timings.duration < 1000,
      });
      
      sleep(0.5);
      
      // Test 3: Get assessment questions
      const questionsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/questions`);
      check(questionsResponse, {
        'assessment questions loads': (r) => r.status === 200,
        'questions response time < 1s': (r) => r.timings.duration < 1000,
        'questions returns array': (r) => Array.isArray(r.json()),
      });
      
      sleep(0.5);
      
      // Test 4: Get assessment stats
      const statsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/stats`);
      check(statsResponse, {
        'assessment stats loads': (r) => r.status === 200,
        'stats response time < 3s': (r) => r.timings.duration < 3000, // Allow more time for complex query
        'stats has grading completion': (r) => {
          if (r.status === 200) {
            const stats = r.json();
            return stats.hasOwnProperty('grading_completion') &&
                   stats.hasOwnProperty('grade_distribution') &&
                   stats.hasOwnProperty('question_performance');
          }
          return false;
        },
      });
      
      sleep(0.5);
      
      // Test 5: Get answer sheets list
      const answersResponse = makeAuthRequest(token, `/assessments/${assessmentId}/answer-sheets`);
      check(answersResponse, {
        'answer sheets loads': (r) => r.status === 200 || r.status === 403,
        'answers response time < 1.5s': (r) => r.timings.duration < 1500,
      });
      
      sleep(0.5);
      
      // Test 6: Download results CSV
      const csvResponse = makeAuthRequest(token, `/assessments/${assessmentId}/results/download`);
      check(csvResponse, {
        'CSV download responds': (r) => r.status === 200 || r.status === 404,
        'CSV response time < 5s': (r) => r.timings.duration < 5000, // Allow more time for CSV generation
        'CSV has correct headers': (r) => {
          if (r.status === 200) {
            return r.headers['Content-Disposition'] && 
                   r.headers['Content-Disposition'].includes('attachment');
          }
          return r.status === 404; // OK if no results yet
        },
      });
    }
  }
  
  sleep(1);
}