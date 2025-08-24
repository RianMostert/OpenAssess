'use client';

import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface StudentDashboardProps {
    isMobile?: boolean;
    isTablet?: boolean;
}

interface UserInfo {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    primary_role_id?: number;
}

export default function StudentDashboard({ 
    isMobile = false, 
    isTablet = false 
}: StudentDashboardProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const decoded: UserInfo = jwtDecode(token);
                setUserInfo(decoded);
            } catch (error) {
                console.error('Error decoding token:', error);
            }
        }

        // Fetch student courses
        fetchStudentCourses();
    }, []);

    const fetchStudentCourses = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/student-results/my-courses`);

            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            } else {
                console.error('Failed to fetch courses');
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Student Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Welcome back! Here are your courses and recent assessments.
                    </p>
                </div>

                {/* User Info Card */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Profile Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-gray-600">Role:</span>
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                Student
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600">User ID:</span>
                            <span className="ml-2 font-mono text-sm">{userInfo?.sub}</span>
                        </div>
                    </div>
                </div>

                {/* Courses Section */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        My Courses ({courses.length})
                    </h2>
                    
                    {courses.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Courses Enrolled
                            </h3>
                            <p className="text-gray-600">
                                You are not currently enrolled in any courses. Contact your instructor or administrator.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {courses.map((course: any) => (
                                <div key={course.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <h3 className="font-semibold text-gray-900 mb-2">
                                        {course.title}
                                    </h3>
                                    {course.code && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            Code: {course.code}
                                        </p>
                                    )}
                                    {course.teacher_name && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            Instructor: {course.teacher_name}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                            {course.my_role || 'Student'}
                                        </span>
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                            View Assessments →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Total Courses
                        </h3>
                        <p className="text-3xl font-bold text-blue-600">
                            {courses.length}
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Pending Grades
                        </h3>
                        <p className="text-3xl font-bold text-yellow-600">
                            -
                        </p>
                        <p className="text-sm text-gray-600">Coming soon</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Completed
                        </h3>
                        <p className="text-3xl font-bold text-green-600">
                            -
                        </p>
                        <p className="text-sm text-gray-600">Coming soon</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
