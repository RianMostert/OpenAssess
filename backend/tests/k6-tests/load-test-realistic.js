import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to simulate multiple concurrent users
    { duration: '2m', target: 20 },   // Maintain load
    { duration: '30s', target: 50 },  // Spike test
    { duration: '30s', target: 20 },  // Back to normal
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // Allow higher response times under load
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

function makeAuthRequest(token, endpoint) {
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
  };
  
  return http.get(`${apiBase}${endpoint}`, params);
}

export default function () {
  // Simulate realistic user distribution
  const userTypes = ['admin', 'staff', 'staff', 'student', 'student', 'student']; // More students
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  const token = login(userType);
  if (!token) {
    console.error(`Failed to login as ${userType}`);
    return;
  }

  // Simulate realistic user behavior patterns
  const scenarios = [
    'dashboard_view',
    'course_browsing', 
    'assessment_review',
    'grade_checking'
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  switch (scenario) {
    case 'dashboard_view':
      simulateDashboardView(token);
      break;
    case 'course_browsing':
      simulateCourseBrowsing(token);
      break;
    case 'assessment_review':
      simulateAssessmentReview(token);
      break;
    case 'grade_checking':
      simulateGradeChecking(token);
      break;
  }
  
  sleep(Math.random() * 3 + 1); // Random think time 1-4 seconds
}

function simulateDashboardView(token) {
  // User logs in and views their dashboard
  
  // 1. Get user info
  const userResponse = makeAuthRequest(token, '/users/me');
  check(userResponse, {
    'user info loads': (r) => r.status === 200,
    'user info response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  sleep(0.5);
  
  // 2. Get courses
  const coursesResponse = makeAuthRequest(token, '/courses/');
  check(coursesResponse, {
    'courses load on dashboard': (r) => r.status === 200,
    'courses response time < 1.5s': (r) => r.timings.duration < 1500,
  });
  
  sleep(0.3);
  
  // 3. Get assessments overview
  const assessmentsResponse = makeAuthRequest(token, '/assessments/');
  check(assessmentsResponse, {
    'assessments load on dashboard': (r) => r.status === 200,
    'assessments response time < 2s': (r) => r.timings.duration < 2000,
  });
}

function simulateCourseBrowsing(token) {
  // User browses through course content
  
  const coursesResponse = makeAuthRequest(token, '/courses/');
  if (coursesResponse.status !== 200) return;
  
  const courses = coursesResponse.json();
  if (courses.length === 0) return;
  
  // Browse 2-3 random courses
  const coursesToBrowse = Math.min(3, courses.length);
  
  for (let i = 0; i < coursesToBrowse; i++) {
    const randomCourse = courses[Math.floor(Math.random() * courses.length)];
    const courseId = randomCourse.id;
    
    sleep(0.3);
    
    // View course details
    const courseResponse = makeAuthRequest(token, `/courses/${courseId}`);
    check(courseResponse, {
      'course details load': (r) => r.status === 200,
      'course response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(0.5);
    
    // View course assessments
    const assessmentsResponse = makeAuthRequest(token, `/courses/${courseId}/assessments`);
    check(assessmentsResponse, {
      'course assessments load': (r) => r.status === 200,
      'assessments response time < 1.5s': (r) => r.timings.duration < 1500,
    });
    
    sleep(0.3);
  }
}

function simulateAssessmentReview(token) {
  // Staff/admin reviewing assessment performance
  
  const assessmentsResponse = makeAuthRequest(token, '/assessments/');
  if (assessmentsResponse.status !== 200) return;
  
  const assessments = assessmentsResponse.json();
  if (assessments.length === 0) return;
  
  const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)];
  const assessmentId = randomAssessment.id;
  
  sleep(0.5);
  
  // View assessment stats (heavy operation)
  const statsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/stats`);
  check(statsResponse, {
    'assessment stats load': (r) => r.status === 200,
    'stats response time < 4s': (r) => r.timings.duration < 4000,
  });
  
  sleep(1);
  
  // View questions
  const questionsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/questions`);
  check(questionsResponse, {
    'assessment questions load': (r) => r.status === 200,
    'questions response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  sleep(0.5);
  
  // View answer sheets
  const answersResponse = makeAuthRequest(token, `/assessments/${assessmentId}/answer-sheets`);
  check(answersResponse, {
    'answer sheets accessible': (r) => r.status === 200 || r.status === 403,
    'answers response time < 2s': (r) => r.timings.duration < 2000,
  });
}

function simulateGradeChecking(token) {
  // Student or staff checking grades/results
  
  const coursesResponse = makeAuthRequest(token, '/courses/');
  if (coursesResponse.status !== 200) return;
  
  const courses = coursesResponse.json();
  if (courses.length === 0) return;
  
  const randomCourse = courses[Math.floor(Math.random() * courses.length)];
  const courseId = randomCourse.id;
  
  sleep(0.5);
  
  // Check course stats/performance
  const statsResponse = makeAuthRequest(token, `/courses/${courseId}/stats`);
  check(statsResponse, {
    'course stats load': (r) => r.status === 200,
    'course stats response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  sleep(0.5);
  
  // Get assessments for this course
  const assessmentsResponse = makeAuthRequest(token, `/courses/${courseId}/assessments`);
  if (assessmentsResponse.status === 200) {
    const assessments = assessmentsResponse.json();
    
    if (assessments.length > 0) {
      const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)];
      const assessmentId = randomAssessment.id;
      
      sleep(0.3);
      
      // Try to download results (if authorized)
      const resultsResponse = makeAuthRequest(token, `/assessments/${assessmentId}/results/download`);
      check(resultsResponse, {
        'results download accessible': (r) => r.status === 200 || r.status === 403 || r.status === 404,
        'results response time < 8s': (r) => r.timings.duration < 8000,
      });
    }
  }
}