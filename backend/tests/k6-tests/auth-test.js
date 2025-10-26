import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 2 },   // Ramp up to 2 users over 5 seconds
    { duration: '15s', target: 2 },  // Stay at 2 users for 15 seconds
    { duration: '5s', target: 0 },   // Ramp down to 0 users over 5 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be under 2 seconds
    http_req_failed: ['rate<0.1'],     // Error rate should be less than 10%
  },
};

const BASE_URL = 'http://localhost:8000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test credentials from seed data
const testCredentials = {
  admin: { username: 'admin@example.com', password: 'admin123' },
  staff: { username: 'john.smith@example.com', password: 'staff123' },
};

function login(credentials) {
  const loginParams = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const response = http.post(
    `${API_BASE}/auth/login`,
    `username=${credentials.username}&password=${credentials.password}`,
    loginParams
  );

  return {
    success: response.status === 200,
    token: response.status === 200 ? response.json('access_token') : null,
    response: response,
  };
}

function makeAuthenticatedRequest(token, endpoint) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  return http.get(`${API_BASE}${endpoint}`, params);
}

export default function () {
  // Test 1: Login as admin
  const adminLogin = login(testCredentials.admin);
  
  check(adminLogin.response, {
    'admin login successful': (r) => r.status === 200,
    'admin login returns token': (r) => r.status === 200 && r.json('access_token') !== undefined,
    'admin login response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (adminLogin.success) {
    sleep(0.5);

    // Test 2: Access protected endpoint with admin token
    const usersMeResponse = makeAuthenticatedRequest(adminLogin.token, '/users/me');
    
    check(usersMeResponse, {
      'users/me endpoint accessible': (r) => r.status === 200,
      'users/me returns user data': (r) => r.status === 200 && r.json('email') !== undefined,
      'users/me response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    sleep(0.5);

    // Test 3: Access users list endpoint (admin only)
    const usersListResponse = makeAuthenticatedRequest(adminLogin.token, '/users/');
    
    check(usersListResponse, {
      'users list accessible to admin': (r) => r.status === 200,
      'users list returns array': (r) => r.status === 200 && Array.isArray(r.json()),
      'users list response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }

  sleep(1);
}