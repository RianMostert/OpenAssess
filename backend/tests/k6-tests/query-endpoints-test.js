import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  stages: config.loadPatterns.moderate,
  thresholds: config.thresholds.moderate,
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
  // Test student queries and mark queries endpoints
  const userTypes = ['admin', 'staff'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  const token = login(userType);
  if (!token) {
    console.error(`Failed to login as ${userType}`);
    return;
  }

  // Get courses to use for testing
  const coursesResponse = makeAuthRequest(token, '/courses/');
  if (coursesResponse.status !== 200) {
    console.log('Failed to get courses');
    return;
  }

  const courses = coursesResponse.json();
  if (courses.length === 0) {
    console.log('No courses available');
    return;
  }

  const courseId = courses[0].id;

  sleep(0.5);

  // Test 1: Student queries endpoints (my queries as current user)
  const studentQueriesResponse = makeAuthRequest(token, '/student-queries/my-queries');
  check(studentQueriesResponse, {
    'student queries loads': (r) => r.status === 200,
    'student queries response time < 1s': (r) => r.timings.duration < 1000,
    'student queries returns array': (r) => Array.isArray(r.json()),
  });

  sleep(0.5);

  // Test 2: Mark queries endpoints (course queries for lecturers)
  const markQueriesResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}`);
  check(markQueriesResponse, {
    'mark queries loads': (r) => r.status === 200,
    'mark queries response time < 1s': (r) => r.timings.duration < 1000,
    'mark queries returns array': (r) => Array.isArray(r.json()),
  });

  sleep(0.5);

  // Test 3: Get assessments for export testing
  const assessmentsResponse = makeAuthRequest(token, `/courses/${courseId}/assessments`);
  if (assessmentsResponse.status === 200) {
    const assessments = assessmentsResponse.json();
    
    if (assessments.length > 0) {
      const assessmentId = assessments[0].id;
      
      sleep(0.5);
      
      // Test 4: Export functionality (PDF export)
      const exportPayload = {
        course_id: courseId,
        assessment_id: assessmentId,
      };
      
      const exportResponse = makeAuthRequest(token, '/export/annotated-pdfs', 'POST', exportPayload);
      check(exportResponse, {
        'export endpoint accessible': (r) => r.status === 200 || r.status === 404,
        'export response time < 8s': (r) => r.timings.duration < 8000,
      });
      
      sleep(0.5);
      
      // Test 5: Student results endpoints (my results for assessment)
      const studentResultsResponse = makeAuthRequest(token, `/student-results/assessments/${assessmentId}/my-results`);
      check(studentResultsResponse, {
        'student results loads': (r) => r.status === 200 || r.status === 403,
        'student results response time < 1.5s': (r) => r.timings.duration < 1500,
      });
    }
  }

  sleep(1);
}