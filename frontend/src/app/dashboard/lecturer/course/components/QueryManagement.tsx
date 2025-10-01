'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

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

interface QueryManagementProps {
    courseId: string;
    assessmentId?: string; // Optional - if provided, filter to specific assessment
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function QueryManagement({ courseId, assessmentId, isMobile = false, isTablet = false }: QueryManagementProps) {
    const [queries, setQueries] = useState<MarkQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuery, setSelectedQuery] = useState<MarkQuery | null>(null);
    const [responseModalOpen, setResponseModalOpen] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [newMarks, setNewMarks] = useState<{[key: string]: string}>({});
    const [responseStatus, setResponseStatus] = useState<'approved' | 'rejected' | 'resolved'>('approved');
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('pending');

    useEffect(() => {
        fetchQueries();
    }, [courseId, assessmentId, filterStatus]);

    const fetchQueries = async () => {
        try {
            setLoading(true);
            let url = `${process.env.NEXT_PUBLIC_API_URL}/mark-queries/course/${courseId}`;
            
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
                setQueries(data);
            } else {
                console.error('Failed to fetch queries');
            }
        } catch (error) {
            console.error('Error fetching queries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRespondToQuery = (query: MarkQuery) => {
        setSelectedQuery(query);
        setResponseText('');
        // Initialize new marks with empty value for the single question
        const initialMarks: {[key: string]: string} = {};
        if (query.question_id) {
            initialMarks[query.question_id] = '';
        }
        setNewMarks(initialMarks);
        setResponseStatus('approved');
        setResponseModalOpen(true);
    };

    const submitResponse = async () => {
        if (!selectedQuery || !responseText.trim()) {
            alert('Please provide a response');
            return;
        }

        setSubmitting(true);
        try {
            const responseData = {
                status: responseStatus,
                reviewer_response: responseText.trim(),
                new_marks: responseStatus === 'approved' ? 
                    Object.fromEntries(
                        Object.entries(newMarks)
                            .filter(([_, value]) => value.trim() !== '')
                            .map(([key, value]) => [key, parseFloat(value)])
                    ) : null
            };

            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/mark-queries/${selectedQuery.id}/respond`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(responseData)
                }
            );

            if (response.ok) {
                alert('Response submitted successfully');
                setResponseModalOpen(false);
                setSelectedQuery(null);
                fetchQueries(); // Refresh the list
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(`Error: ${errorData.detail || 'Failed to submit response'}`);
            }
        } catch (error) {
            console.error('Error submitting response:', error);
            alert('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const updateQueryStatus = async (queryId: string, status: string) => {
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/mark-queries/${queryId}/status`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                }
            );

            if (response.ok) {
                fetchQueries();
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getStatusBadge = (status: MarkQuery['status']) => {
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
            ) : queries.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Queries Found</h3>
                    <p className="text-gray-600">No queries match the current filter.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mark</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {queries.map((query) => (
                                <tr key={query.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {query.student_number || 'Unknown Student'}
                                        </div>
                                    </td>
                                                                        <td className="p-3 whitespace-nowrap">
                                        <div>
                                            <p className="font-medium">{query.assessment_title}</p>
                                            <p className="text-sm text-gray-500">
                                                {query.question_number ? `Question ${query.question_number}` : 'Assessment-wide'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {getStatusBadge(query.status)}
                                    </td>
                                    <td className="p-3 whitespace-nowrap text-sm text-gray-900">
                                        {query.question_id && query.current_mark !== null ? (
                                            <div>
                                                <span className="font-medium">Current: {query.current_mark}</span>
                                                {query.new_mark !== null && (
                                                    <span className="block text-green-600">New: {query.new_mark}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(query.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            {query.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => updateQueryStatus(query.id, 'under_review')}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        Review
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespondToQuery(query)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Respond
                                                    </button>
                                                </>
                                            )}
                                            {query.status === 'under_review' && (
                                                <button
                                                    onClick={() => handleRespondToQuery(query)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Respond
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedQuery(query);
                                                    alert(`Query: ${query.requested_change}`);
                                                }}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Response Modal */}
            {responseModalOpen && selectedQuery && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Respond to Query</h2>
                                <button
                                    onClick={() => setResponseModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-900 mb-2">Student Query:</p>
                                <p className="text-gray-700">{selectedQuery.requested_change}</p>
                                <div className="mt-2 text-sm text-gray-600">
                                    <span>Question: {selectedQuery.question_number ? `Question ${selectedQuery.question_number}` : 'Assessment-wide'}</span>
                                </div>
                                <div className="mt-2 space-y-1">
                                    {selectedQuery.question_id && selectedQuery.current_mark !== null && (
                                        <div className="text-sm text-gray-600">
                                            Current Mark: {selectedQuery.current_mark}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); submitResponse(); }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Response Type</label>
                                    <div className="space-y-2">
                                        {(['approved', 'rejected', 'resolved'] as const).map(status => (
                                            <label key={status} className="flex items-center">
                                                <input
                                                    type="radio"
                                                    value={status}
                                                    checked={responseStatus === status}
                                                    onChange={(e) => setResponseStatus(e.target.value as any)}
                                                    className="mr-2"
                                                />
                                                <span className="capitalize">{status}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {responseStatus === 'approved' && selectedQuery.question_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">New Mark (Optional)</label>
                                        <div className="flex items-center space-x-2">
                                            <label className="text-sm text-gray-600 w-24">Question {selectedQuery.question_number}:</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={newMarks[selectedQuery.question_id] || ''}
                                                onChange={(e) => setNewMarks(prev => ({
                                                    ...prev,
                                                    [selectedQuery.question_id!]: e.target.value
                                                }))}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Enter new mark if changing"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
                                    <textarea
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Explain your decision and any changes made..."
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setResponseModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Response'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}