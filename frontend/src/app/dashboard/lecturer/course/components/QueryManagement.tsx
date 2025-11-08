'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import QueryReviewModal from './QueryReviewModal';

interface MarkQuery {
    id: string;
    student_id: string;
    assessment_id: string;
    question_id?: string;
    batch_id?: string;
    current_mark?: number;
    requested_change: string;
    query_type: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
    reviewer_id?: string;
    reviewer_response?: string;
    new_mark?: number;
    created_at: string;
    updated_at?: string;
    student_name?: string;
    student_number?: string;
    assessment_title?: string;
    question_number?: string;
}

interface QueryBatch {
    batch_id?: string;
    student_id: string;
    student_name: string;
    student_number?: string;
    assessment_id: string;
    assessment_title: string;
    question_count: number;
    query_types: string[];
    preview_text: string;
    created_at: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
}

interface QueryManagementProps {
    courseId: string;
    assessmentId?: string; 
    isMobile?: boolean;
    isTablet?: boolean;
    hideHeader?: boolean;
    filterStatus?: string;
    onFilterChange?: (status: string) => void;
    onCountChange?: (count: number) => void;
}

export default function QueryManagement({ 
    courseId, 
    assessmentId, 
    isMobile = false, 
    isTablet = false,
    hideHeader = false,
    filterStatus: externalFilterStatus,
    onFilterChange,
    onCountChange
}: QueryManagementProps) {
    const [queryBatches, setQueryBatches] = useState<QueryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<QueryBatch | null>(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [internalFilterStatus, setInternalFilterStatus] = useState<string>('pending');
    
    // Use external filter if provided, otherwise use internal
    const filterStatus = externalFilterStatus !== undefined ? externalFilterStatus : internalFilterStatus;
    
    const handleFilterChange = (status: string) => {
        if (onFilterChange) {
            onFilterChange(status);
        } else {
            setInternalFilterStatus(status);
        }
    };

    useEffect(() => {
        fetchQueries();
    }, [courseId, assessmentId, filterStatus]);

    const fetchQueries = async () => {
        try {
            setLoading(true);
            let url = `${process.env.NEXT_PUBLIC_API_URL}/mark-queries/course/${courseId}/grouped`;
            
            // Build query parameters
            const params = new URLSearchParams();
            if (filterStatus !== 'all') {
                params.append('status', filterStatus);
            }
            if (assessmentId) {
                params.append('assessment_id', assessmentId);
            }
            
            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
            
            const response = await fetchWithAuth(url);
            
            if (response.ok) {
                const data = await response.json();
                
                // Add dummy query data
                const dummyQueries: QueryBatch[] = [
                    { batch_id: 'batch-1', student_id: 's1', student_name: 'Alice Johnson', student_number: '24567890', assessment_id: 'a1', assessment_title: 'Midterm Exam', question_count: 3, query_types: ['clarification', 'remark_request'], preview_text: 'Questions about Q2, Q5, Q7 marking', created_at: '2024-10-28T10:30:00Z', status: 'pending' },
                    { batch_id: 'batch-2', student_id: 's2', student_name: 'Bob Smith', student_number: '24567891', assessment_id: 'a1', assessment_title: 'Midterm Exam', question_count: 1, query_types: ['remark_request'], preview_text: 'Appeal for Q3 mark reconsideration', created_at: '2024-10-27T14:20:00Z', status: 'under_review' },
                    { batch_id: 'batch-3', student_id: 's3', student_name: 'Carol White', student_number: '24567892', assessment_id: 'a2', assessment_title: 'Assignment 1', question_count: 2, query_types: ['clarification'], preview_text: 'Need explanation for Q1 and Q4 deductions', created_at: '2024-10-26T09:15:00Z', status: 'pending' },
                    { batch_id: 'batch-4', student_id: 's4', student_name: 'David Brown', student_number: '24567893', assessment_id: 'a1', assessment_title: 'Midterm Exam', question_count: 4, query_types: ['remark_request', 'clarification'], preview_text: 'Multiple questions about grading criteria', created_at: '2024-10-25T16:45:00Z', status: 'approved' },
                    { batch_id: 'batch-5', student_id: 's5', student_name: 'Emma Davis', student_number: '24567894', assessment_id: 'a3', assessment_title: 'Quiz 2', question_count: 1, query_types: ['other'], preview_text: 'Missing marks for bonus question', created_at: '2024-10-24T11:00:00Z', status: 'pending' },
                    { batch_id: 'batch-6', student_id: 's6', student_name: 'Frank Wilson', student_number: '24567895', assessment_id: 'a2', assessment_title: 'Assignment 1', question_count: 2, query_types: ['remark_request'], preview_text: 'Request remark on Q2 and Q5', created_at: '2024-10-23T13:30:00Z', status: 'rejected' },
                    { batch_id: 'batch-7', student_id: 's7', student_name: 'Grace Lee', student_number: '24567896', assessment_id: 'a1', assessment_title: 'Midterm Exam', question_count: 1, query_types: ['clarification'], preview_text: 'Unclear about Q8 feedback', created_at: '2024-10-22T10:00:00Z', status: 'resolved' },
                    { batch_id: 'batch-8', student_id: 's8', student_name: 'Henry Taylor', student_number: '24567897', assessment_id: 'a4', assessment_title: 'Lab Report 1', question_count: 3, query_types: ['clarification', 'other'], preview_text: 'Questions about methodology scoring', created_at: '2024-10-21T15:20:00Z', status: 'pending' },
                    { batch_id: 'batch-9', student_id: 's9', student_name: 'Ivy Martinez', student_number: '24567898', assessment_id: 'a3', assessment_title: 'Quiz 2', question_count: 2, query_types: ['remark_request'], preview_text: 'Appeal Q1 and Q6 marks', created_at: '2024-10-20T12:45:00Z', status: 'under_review' },
                    { batch_id: 'batch-10', student_id: 's10', student_name: 'Jack Anderson', student_number: '24567899', assessment_id: 'a2', assessment_title: 'Assignment 1', question_count: 1, query_types: ['clarification'], preview_text: 'Need clarification on Q3 rubric', created_at: '2024-10-19T09:30:00Z', status: 'pending' },
                ];
                
                const allQueries = [...data, ...dummyQueries];
                setQueryBatches(allQueries);
                
                // Notify parent of count change
                if (onCountChange) {
                    onCountChange(allQueries.length);
                }
            } else {
                console.error('Failed to fetch queries');
            }
        } catch (error) {
            console.error('Error fetching queries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReviewBatch = (batch: QueryBatch) => {
        setSelectedBatch(batch);
        setReviewModalOpen(true);
    };

    const getStatusBadge = (status: QueryBatch['status']) => {
        const config = {
            pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
            under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
            approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border border-green-200' },
            rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border border-red-200' },
            resolved: { label: 'Resolved', className: 'bg-gray-100 text-gray-800 border border-gray-200' }
        };

        const statusConfig = config[status];
        return (
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.className}`}>
                {statusConfig.label}
            </span>
        );
    };

    return (
        <div className={`${hideHeader ? '' : 'bg-white rounded-xl shadow-md overflow-hidden'} font-raleway flex flex-col h-full`}>
            {!hideHeader && (
                <div className="px-6 py-5 bg-gradient-to-r from-brand-primary to-brand-primary-700 border-b border-brand-primary-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Mark Queries</h2>
                            <p className="text-brand-primary-100 text-sm mt-1">
                                {assessmentId 
                                    ? 'Student queries and appeals for this assessment' 
                                    : 'Student queries and appeals for marks'
                                }
                            </p>
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="px-3 py-2 border-2 border-brand-accent-400 rounded-lg text-sm bg-white text-brand-primary-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent-500"
                        >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="resolved">Resolved</option>
                            <option value="all">All</option>
                        </select>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-gradient-to-r from-brand-primary-100 to-brand-accent-100 rounded"></div>
                        ))}
                    </div>
                </div>
            ) : queryBatches.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-brand-primary-300 mb-4">
                        <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Query Batches Found</h3>
                    <p className="text-gray-600">No query batches match the current filter.</p>
                </div>
            ) : (
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Assessment</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Questions</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Created</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-brand-primary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {queryBatches.map((batch, index) => (
                                <tr key={batch.batch_id || `individual_${index}`} className="hover:bg-brand-primary-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {batch.student_number || 'Unknown'}
                                            </div>
                                            <div className="text-sm text-brand-accent-700 font-medium">
                                                {batch.student_name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {batch.assessment_title}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <p className="text-sm font-semibold text-brand-primary-800">{batch.question_count} question{batch.question_count > 1 ? 's' : ''}</p>
                                            <p className="text-xs text-brand-primary-600">
                                                {batch.query_types.join(', ')}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(batch.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {new Date(batch.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleReviewBatch(batch)}
                                            className="text-brand-primary hover:text-brand-primary-700 font-semibold transition-colors duration-150"
                                        >
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Review Modal */}
            <QueryReviewModal
                batch={selectedBatch!}
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onRefresh={fetchQueries}
            />
        </div>
    );
}