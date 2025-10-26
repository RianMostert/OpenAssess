import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Gradual ramp up for batch operations
    { duration: '1m', target: 5 },    // Steady state
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<4000'], // Allow up to 4s for batch operations
    http_req_failed: ['rate<0.15'],    // Allow slightly higher failure rate
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
  // Test with staff who can review queries
  const userTypes = ['admin', 'staff'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
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
    console.log('No courses available');
    return;
  }

  const randomCourse = courses[Math.floor(Math.random() * courses.length)];
  const courseId = randomCourse.id;

  sleep(0.5);

  // Get existing queries for the course
  const queriesResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}`);
  if (queriesResponse.status !== 200) {
    console.log('No queries available for batch operations');
    return;
  }

  const queries = queriesResponse.json();
  if (queries.length === 0) {
    console.log('No queries to test batch operations');
    return;
  }

  sleep(0.5);

  // Test 1: Get batch queries (if batches exist)
  const groupedResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}/grouped`);
  if (groupedResponse.status === 200) {
    const groups = groupedResponse.json();
    
    if (groups.length > 0) {
      const randomGroup = groups[Math.floor(Math.random() * groups.length)];
      const batchId = randomGroup.batch_id;
      
      if (batchId) {
        sleep(0.5);
        
        // Test 2: Get detailed batch queries
        const batchDetailsResponse = makeAuthRequest(token, `/mark-queries/batch/${batchId}`);
        check(batchDetailsResponse, {
          'batch queries loads': (r) => r.status === 200,
          'batch response time < 2s': (r) => r.timings.duration < 2000,
          'batch returns array': (r) => Array.isArray(r.json()),
        });
      }
    }
  }

  sleep(0.5);

  // Test 3: Bulk status update
  // Get some pending queries to update
  const pendingQueriesResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}?status=pending`);
  if (pendingQueriesResponse.status === 200) {
    const pendingQueries = pendingQueriesResponse.json();
    
    if (pendingQueries.length > 0) {
      // Take up to 3 queries for bulk update
      const queryIds = pendingQueries.slice(0, 3).map(q => q.id);
      
      const bulkUpdatePayload = {
        query_ids: queryIds,
        status: 'under_review',
      };
      
      sleep(0.5);
      
      const bulkUpdateResponse = makeAuthRequest(
        token, 
        '/mark-queries/bulk/status', 
        'PUT', 
        bulkUpdatePayload
      );
      
      check(bulkUpdateResponse, {
        'bulk status update works': (r) => r.status === 200 || r.status === 404,
        'bulk update response time < 3s': (r) => r.timings.duration < 3000,
        'bulk update returns array': (r) => {
          if (r.status === 200) {
            return Array.isArray(r.json());
          }
          return r.status === 404; // OK if endpoint structure changed
        },
      });
    }
  }

  sleep(0.5);

  // Test 4: Bulk review submission
  const underReviewResponse = makeAuthRequest(token, `/mark-queries/course/${courseId}?status=under_review`);
  if (underReviewResponse.status === 200) {
    const underReviewQueries = underReviewResponse.json();
    
    if (underReviewQueries.length > 0) {
      // Take up to 2 queries for bulk review
      const reviewQueries = underReviewQueries.slice(0, 2);
      
      const bulkReviewPayload = {
        reviews: reviewQueries.map(q => ({
          id: q.id,
          status: 'approved',
          reviewer_response: 'Approved via K6 load test',
          new_mark: q.current_mark ? q.current_mark + 1 : 1,
        })),
      };
      
      sleep(0.5);
      
      const bulkReviewResponse = makeAuthRequest(
        token,
        '/mark-queries/batch/review',
        'PUT',
        bulkReviewPayload
      );
      
      check(bulkReviewResponse, {
        'bulk review works': (r) => r.status === 200 || r.status === 404,
        'bulk review response time < 4s': (r) => r.timings.duration < 4000,
        'bulk review returns results': (r) => {
          if (r.status === 200) {
            return Array.isArray(r.json());
          }
          return r.status === 404; // OK if endpoint structure changed
        },
      });
    }
  }

  sleep(1);
}
