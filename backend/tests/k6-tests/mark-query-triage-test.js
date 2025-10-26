import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  stages: config.loadPatterns.moderate,
  thresholds: {
    http_req_duration: ['p(95)<3000'], // Allow more time for complex queries
    http_req_failed: ['rate<0.1'],
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
  } else if (method === 'PUT' && payload) {
    params.headers['Content-Type'] = 'application/json';
    return http.put(`${apiBase}${endpoint}`, JSON.stringify(payload), params);
  }
}

export default function () {
  // Only staff/admin can access mark query triage
  const userTypes = ['admin', 'staff'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  const token = login(userType);
  if (!token) {
    console.error(`Failed to login as ${userType}`);
    return;
  }

  // Get user's courses first
  const coursesResponse = makeAuthRequest(token, '/courses/');
  if (coursesResponse.status !== 200) {
    console.error('Failed to get courses');
    return;
  }

  const courses = coursesResponse.json();
  if (courses.length === 0) {
    console.log('No courses available for query testing');
    return;
  }

  const randomCourse = courses[Math.floor(Math.random() * courses.length)];
  const courseId = randomCourse.id;

  sleep(0.5);

  // Test 1: Get triage view
  const triageResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}/triage`);
  check(triageResponse, {
    'triage view loads': (r) => r.status === 200,
    'triage response time < 3s': (r) => r.timings.duration < 3000,
    'triage has groups': (r) => {
      if (r.status === 200) {
        const data = r.json();
        return data.hasOwnProperty('groups') && data.hasOwnProperty('stats');
      }
      return false;
    },
  });

  sleep(0.5);

  // Test 2: Get grouped queries
  const groupedResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}/grouped`);
  check(groupedResponse, {
    'grouped queries loads': (r) => r.status === 200,
    'grouped response time < 2.5s': (r) => r.timings.duration < 2500,
    'grouped returns array': (r) => Array.isArray(r.json()),
  });

  sleep(0.5);

  // Test 3: Get all course queries
  const queriesResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}`);
  check(queriesResponse, {
    'course queries loads': (r) => r.status === 200,
    'queries response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(0.5);

  // Test 4: Get query stats (aggregated statistics)
  const statsResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}/stats`);
  check(statsResponse, {
    'query stats loads': (r) => r.status === 200,
    'stats response time < 1.5s': (r) => r.timings.duration < 1500,
    'stats has counts': (r) => {
      if (r.status === 200) {
        const stats = r.json();
        return stats.hasOwnProperty('total_queries') || 
               stats.hasOwnProperty('pending') ||
               stats.hasOwnProperty('approved');
      }
      return false;
    },
  });

  sleep(0.5);

  // Test 5: Get queries by status (filtered query)
  const pendingResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}?status=pending`);
  check(pendingResponse, {
    'pending queries loads': (r) => r.status === 200,
    'pending response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(0.5);

  // Test 6: Get course assessments to test assessment-specific queries
  const assessmentsResponse = makeAuthRequest(token, `/courses/${courseId}/assessments`);
  if (assessmentsResponse.status === 200) {
    const assessments = assessmentsResponse.json();
    
    if (assessments.length > 0) {
      const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)];
      const assessmentId = randomAssessment.id;
      
      sleep(0.5);
      
      // Test 7: Get assessment-specific queries
      const assessmentQueriesResponse = makeAuthRequest(token, `/mark-queries/assessment/${assessmentId}`);
      check(assessmentQueriesResponse, {
        'assessment queries loads': (r) => r.status === 200,
        'assessment queries response time < 2s': (r) => r.timings.duration < 2000,
      });
    }
  }

  sleep(1);
}
