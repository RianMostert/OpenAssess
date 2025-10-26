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
  // Test different user types accessing courses
  const userTypes = ['admin', 'staff', 'student'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  const token = login(userType);
  if (!token) {
    console.error(`Failed to login as ${userType}`);
    return;
  }

  // Test 1: Get courses list
  const coursesResponse = makeAuthRequest(token, '/courses/');
  check(coursesResponse, {
    'courses list loads': (r) => r.status === 200,
    'courses response time < 1s': (r) => r.timings.duration < 1000,
    'courses returns array': (r) => Array.isArray(r.json()),
  });

  if (coursesResponse.status === 200) {
    const courses = coursesResponse.json();
    
    if (courses.length > 0) {
      const randomCourse = courses[Math.floor(Math.random() * courses.length)];
      const courseId = randomCourse.id;
      
      sleep(0.3);
      
      // Test 2: Get specific course details
      const courseDetailsResponse = makeAuthRequest(token, `/courses/${courseId}`);
      check(courseDetailsResponse, {
        'course details loads': (r) => r.status === 200,
        'course details response time < 1s': (r) => r.timings.duration < 1000,
      });
      
      sleep(0.3);
      
      // Test 3: Get course assessments
      const assessmentsResponse = makeAuthRequest(token, `/courses/${courseId}/assessments`);
      check(assessmentsResponse, {
        'course assessments loads': (r) => r.status === 200,
        'assessments response time < 1s': (r) => r.timings.duration < 1000,
      });
      
      sleep(0.3);
      
      // Test 4: Get course stats
      const statsResponse = makeAuthRequest(token, `/courses/${courseId}/stats`);
      check(statsResponse, {
        'course stats loads': (r) => r.status === 200,
        'stats response time < 2s': (r) => r.timings.duration < 2000,
        'stats has required fields': (r) => {
          if (r.status === 200) {
            const stats = r.json();
            return stats.hasOwnProperty('totalStudents') && 
                   stats.hasOwnProperty('averagePerformance') &&
                   stats.hasOwnProperty('assessments');
          }
          return false;
        },
      });
      
      // Test 5: Get course users (if authorized)
      if (userType === 'admin' || userType === 'staff') {
        sleep(0.3);
        const usersResponse = makeAuthRequest(token, `/courses/${courseId}/users`);
        check(usersResponse, {
          'course users loads': (r) => r.status === 200 || r.status === 403,
          'users response time < 1s': (r) => r.timings.duration < 1000,
        });
      }
    }
  }
  
  sleep(1);
}