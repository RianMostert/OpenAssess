'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import QueryReviewPdfViewer from './QueryReviewPdfViewer';

interface QueryBatch {
    batch_id?: string;
    student_id: string;
    student_name: string;
    student_number?: string;
    assessment_id: string;
    assessment_title: string;
    question_count: number;
    query_types: string[];
    created_at: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resolved';
}

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
    reviewer_response?: string;
    new_mark?: number;
    created_at: string;
    question_number?: string;
}

interface Assessment {
    id: string;
    title: string;
}

interface Question {
    id: string;
    question_number: number;
    page_number: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface QueryReviewModalProps {
    batch: QueryBatch;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function QueryReviewModal({
    batch,
    isOpen,
    onClose,
    onRefresh
}: QueryReviewModalProps) {
    const [queries, setQueries] = useState<MarkQuery[]>([]);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [responses, setResponses] = useState<{[queryId: string]: {
        status: 'approved' | 'rejected' | 'resolved';
        response: string;
        newMark?: string;
    }}>({});
    const [submitting, setSubmitting] = useState(false);

    const pdfContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && batch) {
            fetchBatchData();
        }
    }, [isOpen, batch]);

    const fetchBatchData = async () => {
        try {
            setLoading(true);
            
            // First fetch assessment details to get course_id
            const assessmentRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${batch.assessment_id}`);
            const assessmentData = await assessmentRes.json();
            setAssessment(assessmentData);
            
            // Fetch queries in the batch
            let queriesUrl: string;
            if (batch.batch_id) {
                queriesUrl = `${process.env.NEXT_PUBLIC_API_URL}/mark-queries/batch/${batch.batch_id}`;
            } else {
                // For individual queries, we need to use the course endpoint with proper course_id
                queriesUrl = `${process.env.NEXT_PUBLIC_API_URL}/mark-queries/course/${assessmentData.course_id}?assessment_id=${batch.assessment_id}&status=${batch.status}`;
            }

            const queriesRes = await fetchWithAuth(queriesUrl);
            if (!queriesRes.ok) {
                throw new Error(`Failed to fetch queries: ${queriesRes.status} ${queriesRes.statusText}`);
            }
            const queriesData = await queriesRes.json();
            console.log('Fetched queries data:', queriesData);
            setQueries(queriesData);

            // Initialize responses state
            const initialResponses: typeof responses = {};
            queriesData.forEach((query: MarkQuery) => {
                initialResponses[query.id] = {
                    status: 'approved',
                    response: '',
                    newMark: query.current_mark?.toString() || ''
                };
            });
            setResponses(initialResponses);

            // Fetch questions for highlighting (only for queries that have question_id)
            const questionIds = queriesData.filter((q: MarkQuery) => q.question_id).map((q: MarkQuery) => q.question_id);
            if (questionIds.length > 0) {
                const questionsRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${batch.assessment_id}/questions`);
                const allQuestions = await questionsRes.json();
                const relevantQuestions = allQuestions.filter((q: Question) => questionIds.includes(q.id));
                setQuestions(relevantQuestions);
            } else {
                setQuestions([]);
            }

        } catch (error) {
            console.error('Error fetching batch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateResponse = (queryId: string, field: keyof typeof responses[string], value: any) => {
        setResponses(prev => ({
            ...prev,
            [queryId]: {
                ...prev[queryId],
                [field]: value
            }
        }));
    };

    const submitAllResponses = async () => {
        setSubmitting(true);
        try {
            const promises = queries.map(async (query) => {
                const response = responses[query.id];

                const responseData = {
                    status: response.status,
                    reviewer_response: response.response.trim() || null,
                    new_marks: response.status === 'approved' && query.question_id && response.newMark ? 
                        { [query.question_id]: parseFloat(response.newMark) } : null
                };

                return fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/mark-queries/${query.id}/respond`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(responseData)
                    }
                );
            });

            const results = await Promise.all(promises);
            
            // Check if all responses were successful
            const failedCount = results.filter(res => !res.ok).length;
            
            if (failedCount === 0) {
                alert('All responses submitted successfully');
                onRefresh();
                onClose();
            } else {
                alert(`${failedCount} responses failed. Please try again.`);
            }

        } catch (error) {
            console.error('Error submitting responses:', error);
            alert(error instanceof Error ? error.message : 'Failed to submit responses');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Review Query Batch - {batch.student_name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {batch.assessment_title} | {batch.question_count} question{batch.question_count > 1 ? 's' : ''} | 
                            Created: {new Date(batch.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Loading query details...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                        {/* PDF Viewer - Left Side */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                            <div className="p-3 border-b bg-gray-50 flex-shrink-0">
                                <h3 className="font-medium text-gray-900">Student Answer Sheet</h3>
                                {questions.length > 0 && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        Questions highlighted: {questions.map(q => `Q${q.question_number}`).join(', ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                {assessment && (
                                    <QueryReviewPdfViewer
                                        assessment={assessment}
                                        studentId={batch.student_id}
                                        pageContainerRef={pdfContainerRef}
                                        questionsToHighlight={questions}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Response Form - Right Side */}
                        <div className="w-80 flex flex-col border-l bg-gray-50 flex-shrink-0">
                            <div className="p-3 border-b bg-white flex-shrink-0">
                                <h3 className="font-medium text-gray-900">Query Responses</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Respond to each query individually
                                </p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {queries.map((query, index) => (
                                    <div key={query.id} className="bg-white p-3 rounded-lg border shadow-sm">
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-gray-900 text-sm">
                                                    {query.question_number ? `Question ${query.question_number}` : 'Assessment-wide'}
                                                </h4>
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {query.query_type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded text-wrap break-words">
                                                {query.requested_change}
                                            </p>
                                            {query.current_mark !== undefined && (
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Current mark: {query.current_mark}
                                                </p>
                                            )}
                                        </div>

                                        {/* Response Type */}
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Response</label>
                                            <div className="space-y-1">
                                                {(['approved', 'rejected', 'resolved'] as const).map(status => (
                                                    <label key={status} className="flex items-center">
                                                        <input
                                                            type="radio"
                                                            value={status}
                                                            checked={responses[query.id]?.status === status}
                                                            onChange={(e) => updateResponse(query.id, 'status', e.target.value)}
                                                            className="mr-2"
                                                        />
                                                        <span className="text-sm capitalize">{status}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* New Mark (if applicable) */}
                                        {responses[query.id]?.status === 'approved' && query.question_id && (
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    New Mark (Optional)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={responses[query.id]?.newMark || ''}
                                                    onChange={(e) => updateResponse(query.id, 'newMark', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter new mark"
                                                />
                                            </div>
                                        )}

                                        {/* Response Text */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Your Response (Optional)
                                            </label>
                                            <textarea
                                                value={responses[query.id]?.response || ''}
                                                onChange={(e) => updateResponse(query.id, 'response', e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                                                placeholder="Explain your decision..."
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Submit Button */}
                            <div className="p-4 border-t bg-white flex-shrink-0">
                                <div className="flex space-x-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitAllResponses}
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit All'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}