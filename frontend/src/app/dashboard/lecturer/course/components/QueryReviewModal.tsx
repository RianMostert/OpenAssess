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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-raleway">
            <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b-2 border-brand-accent-400 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-brand-primary-800">
                            Review Query Batch - {batch.student_name}
                        </h2>
                        <p className="text-sm text-brand-primary-600 mt-1 font-medium">
                            {batch.assessment_title} | {batch.question_count} question{batch.question_count > 1 ? 's' : ''} | 
                            Created: {new Date(batch.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-brand-primary-400 hover:text-brand-primary-800 hover:bg-brand-primary-100 rounded-lg p-2 flex-shrink-0 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary-600 mx-auto"></div>
                            <p className="mt-2 text-brand-primary-700 font-medium">Loading query details...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                        {/* PDF Viewer - Left Side */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                            <div className="p-3 border-b-2 border-brand-accent-400 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 flex-shrink-0">
                                <h3 className="font-bold text-brand-primary-800">Student Answer Sheet</h3>
                                {questions.length > 0 && (
                                    <p className="text-sm text-brand-primary-600 mt-1 font-medium">
                                        Questions highlighted: {questions.map(q => `Q${q.question_number}`).join(', ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden" ref={pdfContainerRef}>
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
                        <div className="w-80 flex flex-col border-l-2 border-brand-accent-400 bg-white flex-shrink-0">
                            <div className="p-3 border-b-2 border-brand-accent-400 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 flex-shrink-0">
                                <h3 className="font-bold text-brand-primary-800">Query Responses</h3>
                                <p className="text-sm text-brand-primary-600 mt-1 font-medium">
                                    Respond to each query individually
                                </p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-brand-primary-50 to-white">
                                {queries.map((query, index) => (
                                    <div key={query.id} className="bg-white p-3 rounded-lg border-2 border-brand-accent-400 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-bold text-brand-primary-800 text-sm">
                                                    {query.question_number ? `Question ${query.question_number}` : 'Assessment-wide'}
                                                </h4>
                                                <span className="text-xs text-brand-primary-700 bg-brand-accent-100 px-2 py-1 rounded font-semibold border border-brand-accent-300">
                                                    {query.query_type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-brand-primary-700 bg-brand-primary-50 p-2 rounded-lg text-wrap break-words border border-brand-accent-200">
                                                {query.requested_change}
                                            </p>
                                            {query.current_mark !== undefined && (
                                                <p className="text-xs text-brand-primary-600 mt-2 font-medium">
                                                    Current mark: <span className="font-bold text-brand-primary-800">{query.current_mark}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Response Type */}
                                        <div className="mb-3">
                                            <label className="block text-sm font-bold text-brand-primary-700 mb-2 uppercase tracking-wider text-xs">Response</label>
                                            <div className="space-y-2">
                                                {(['approved', 'rejected', 'resolved'] as const).map(status => (
                                                    <label key={status} className="flex items-center cursor-pointer hover:bg-brand-primary-50 p-2 rounded-lg transition-colors">
                                                        <input
                                                            type="radio"
                                                            value={status}
                                                            checked={responses[query.id]?.status === status}
                                                            onChange={(e) => updateResponse(query.id, 'status', e.target.value)}
                                                            className="mr-3 w-4 h-4 text-brand-primary-600 focus:ring-brand-primary-500"
                                                        />
                                                        <span className="text-sm capitalize font-medium text-brand-primary-700">{status}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* New Mark (if applicable) */}
                                        {responses[query.id]?.status === 'approved' && query.question_id && (
                                            <div className="mb-3">
                                                <label className="block text-sm font-bold text-brand-primary-700 mb-1 uppercase tracking-wider text-xs">
                                                    New Mark (Optional)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={responses[query.id]?.newMark || ''}
                                                    onChange={(e) => updateResponse(query.id, 'newMark', e.target.value)}
                                                    className="w-full px-3 py-2 border-2 border-brand-accent-400 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-600 font-medium text-brand-primary-800"
                                                    placeholder="Enter new mark"
                                                />
                                            </div>
                                        )}

                                        {/* Response Text */}
                                        <div>
                                            <label className="block text-sm font-bold text-brand-primary-700 mb-1 uppercase tracking-wider text-xs">
                                                Your Response (Optional)
                                            </label>
                                            <textarea
                                                value={responses[query.id]?.response || ''}
                                                onChange={(e) => updateResponse(query.id, 'response', e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 border-2 border-brand-accent-400 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-600 resize-none font-medium text-brand-primary-800"
                                                placeholder="Explain your decision..."
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Submit Button */}
                            <div className="p-4 border-t-2 border-brand-accent-400 bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 flex-shrink-0">
                                <div className="flex space-x-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 text-brand-primary-700 bg-white border-2 border-brand-accent-400 rounded-lg hover:bg-brand-primary-50 hover:border-brand-primary-500 text-sm font-semibold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitAllResponses}
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-colors shadow-md"
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