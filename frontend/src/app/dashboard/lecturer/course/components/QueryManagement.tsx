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
}

export default function QueryManagement({ courseId, assessmentId, isMobile = false, isTablet = false }: QueryManagementProps) {
    const [queryBatches, setQueryBatches] = useState<QueryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<QueryBatch | null>(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('pending');

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
                setQueryBatches(data);
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
            pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
            under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-800' },
            approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
            rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
            resolved: { label: 'Resolved', className: 'bg-gray-100 text-gray-800' }
        };

        const statusConfig = config[status];
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                {statusConfig.label}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Mark Queries</h2>
                        <p className="text-gray-600 text-sm mt-1">
                            {assessmentId 
                                ? 'Student queries and appeals for this assessment' 
                                : 'Student queries and appeals for marks'
                            }
                        </p>
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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

            {loading ? (
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            ) : queryBatches.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Query Batches Found</h3>
                    <p className="text-gray-600">No query batches match the current filter.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {queryBatches.map((batch, index) => (
                                <tr key={batch.batch_id || `individual_${index}`} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {batch.student_number || 'Unknown'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {batch.student_name}
                                        </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        <div>
                                            <p className="font-medium">{batch.assessment_title}</p>
                                        </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        <div>
                                            <p className="font-medium">{batch.question_count} question{batch.question_count > 1 ? 's' : ''}</p>
                                            <p className="text-sm text-gray-500">
                                                {batch.query_types.join(', ')}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {getStatusBadge(batch.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(batch.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleReviewBatch(batch)}
                                            className="text-blue-600 hover:text-blue-900"
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