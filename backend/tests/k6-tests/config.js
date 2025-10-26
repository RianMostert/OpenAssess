// K6 Test Configuration
export const config = {
  // Base URLs
  baseUrl: 'http://localhost:8000',
  apiBase: 'http://localhost:8000/api/v1',
  
  // Test credentials (from seed_db.py)
  credentials: {
    admin: {
      username: 'admin@example.com',
      password: 'admin123'
    },
    staff: {
      username: 'john.smith@example.com', 
      password: 'staff123'
    },
    student: {
      username: 'alice.brown@example.com',
      password: 'student123'
    }
  },
  
  // Common test thresholds
  thresholds: {
    light: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.05']
    },
    moderate: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.1']
    },
    heavy: {
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.15']
    }
  },
  
  // Load patterns
  loadPatterns: {
    smoke: [
      { duration: '1m', target: 1 }
    ],
    light: [
      { duration: '10s', target: 5 },
      { duration: '30s', target: 5 },
      { duration: '10s', target: 0 }
    ],
    moderate: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '30s', target: 0 }
    ],
    heavy: [
      { duration: '1m', target: 50 },
      { duration: '3m', target: 50 },
      { duration: '1m', target: 0 }
    ]
  }
};