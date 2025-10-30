'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface QueryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    assessmentId: string;
    assessmentTitle: string;
    onCreateNewQuery: () => void;
}

interface QueryDetail {
    id: string;
    assessment_id: string;
    question_id?: string;
    batch_id?: string;
    requested_change: string;
    query_type: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
    reviewer_response?: string;
    new_mark?: number;
    current_mark?: number;
    created_at: string;
    updated_at?: string;
    question_number?: string;
}

interface QueryBatch {
    batch_id: string;
    queries: QueryDetail[];
    created_at: string;
    status: string;
}

export default function QueryHistoryModal({
    isOpen,
    onClose,
    assessmentId,
    assessmentTitle,
    onCreateNewQuery
}: QueryHistoryModalProps) {
    const [loading, setLoading] = useState(false);
    const [batches, setBatches] = useState<QueryBatch[]>([]);
    const [individualQueries, setIndividualQueries] = useState<QueryDetail[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchQueryHistory();
        }
    }, [isOpen, assessmentId]);

    const fetchQueryHistory = async () => {
        setLoading(true);
        try {
            // Get all queries for the student
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/student-queries/my-queries`);
            if (response.ok) {
                const allQueries: QueryDetail[] = await response.json();
                
                // Filter queries for this assessment
                const assessmentQueries = allQueries.filter(q => q.assessment_id === assessmentId);
                
                // Group by batch_id
                const batchMap = new Map<string, QueryDetail[]>();
                const individual: QueryDetail[] = [];
                
                assessmentQueries.forEach(query => {
                    if (query.batch_id) {
                        if (!batchMap.has(query.batch_id)) {
                            batchMap.set(query.batch_id, []);
                        }
                        batchMap.get(query.batch_id)!.push(query);
                    } else {
                        individual.push(query);
                    }
                });
                
                // Convert batches to array and sort by creation date
                const batchArray: QueryBatch[] = Array.from(batchMap.entries()).map(([batchId, queries]) => {
                    const sortedQueries = queries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    const primaryStatus = getPrimaryStatus(queries.map(q => q.status));
                    
                    return {
                        batch_id: batchId,
                        queries: sortedQueries,
                        created_at: sortedQueries[0].created_at,
                        status: primaryStatus
                    };
                }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                setBatches(batchArray);
                setIndividualQueries(individual.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            }
        } catch (error) {
            console.error('Error fetching query history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPrimaryStatus = (statuses: string[]): string => {
        const priority = { 'pending': 1, 'under_review': 2, 'approved': 3, 'rejected': 4, 'resolved': 5 };
        return statuses.reduce((prev, curr) => 
            (priority[prev as keyof typeof priority] || 6) < (priority[curr as keyof typeof priority] || 6) ? prev : curr
        );
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
            under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-800' },
            approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
            rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
            resolved: { label: 'Resolved', className: 'bg-gray-100 text-gray-800' }
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config?.className || 'bg-gray-100 text-gray-800'}`}>
                {config?.label || status}
            </span>
        );
    };

    const getQueryTypeLabel = (type: string) => {
        const typeMap = {
            'remark': 'Remark Request',
            'clarification': 'Clarification',
            'technical_issue': 'Technical Issue'
        };
        return typeMap[type as keyof typeof typeMap] || type;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Query History</h2>
                            <p className="text-gray-600 text-sm mt-1">{assessmentTitle}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Loading query history...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Query Batches */}
                            {batches.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Query Batches</h3>
                                    <div className="space-y-4">
                                        {batches.map((batch, batchIndex) => (
                                            <div key={batch.batch_id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <h4 className="font-medium text-gray-900">
                                                            Batch {batchIndex + 1} ({batch.queries.length} questions)
                                                        </h4>
                                                        {getStatusBadge(batch.status)}
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(batch.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {batch.queries.map((query, queryIndex) => (
                                                        <div key={query.id} className="bg-gray-50 rounded-lg p-3">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="font-medium text-sm text-gray-700">
                                                                        {query.question_id ? 
                                                                            `Question ${query.question_number || queryIndex + 1}` : 
                                                                            'Assessment-wide Query'
                                                                        }
                                                                    </span>
                                                                    {getStatusBadge(query.status)}
                                                                </div>
                                                                <span className="text-xs text-gray-500">
                                                                    {getQueryTypeLabel(query.query_type)}
                                                                </span>
                                                            </div>
                                                            
                                                            {query.current_mark !== null && (
                                                                <div className="text-xs text-gray-600 mb-2">
                                                                    Current Mark: {query.current_mark}
                                                                    {query.new_mark !== null && (
                                                                        <span className="ml-2 text-green-600">
                                                                            → New Mark: {query.new_mark}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            <div className="text-sm text-gray-700 mb-2">
                                                                <span className="font-medium">Query:</span> {query.requested_change}
                                                            </div>
                                                            
                                                            {query.reviewer_response && (
                                                                <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded border-l-4 border-blue-200">
                                                                    <span className="font-medium">Reviewer Response:</span> {query.reviewer_response}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Individual Queries */}
                            {individualQueries.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Individual Queries</h3>
                                    <div className="space-y-3">
                                        {individualQueries.map((query) => (
                                            <div key={query.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <h4 className="font-medium text-gray-900">
                                                            {query.question_id ? 
                                                                `Question ${query.question_number || 'N/A'}` : 
                                                                'Assessment-wide Query'
                                                            }
                                                        </h4>
                                                        {getStatusBadge(query.status)}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500">
                                                            {getQueryTypeLabel(query.query_type)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(query.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {query.current_mark !== null && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        Current Mark: {query.current_mark}
                                                        {query.new_mark !== null && (
                                                            <span className="ml-2 text-green-600">
                                                                → New Mark: {query.new_mark}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <div className="text-sm text-gray-700 mb-2">
                                                    <span className="font-medium">Query:</span> {query.requested_change}
                                                </div>
                                                
                                                {query.reviewer_response && (
                                                    <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                                                        <span className="font-medium">Reviewer Response:</span> {query.reviewer_response}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No queries found */}
                            {batches.length === 0 && individualQueries.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="text-gray-400 mb-4">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Queries Found</h3>
                                    <p className="text-gray-600">You haven't submitted any queries for this assessment yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between mt-6">
                        <button
                            onClick={() => {
                                onCreateNewQuery();
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Create New Query
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}