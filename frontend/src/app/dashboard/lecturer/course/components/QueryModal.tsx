'use client';

import React, { useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface QueryModalProps {
    isOpen: boolean;
    onClose: () => void;
    assessmentId: string;
    assessmentTitle: string;
    onQuerySubmitted: () => void;
}

interface QuestionOption {
    id: string;
    question_number: string;
    max_marks: number;
    current_mark?: number;
}

export default function QueryModal({ 
    isOpen, 
    onClose, 
    assessmentId, 
    assessmentTitle,
    onQuerySubmitted 
}: QueryModalProps) {
    const [queryType, setQueryType] = useState<'regrade' | 'clarification' | 'technical_issue'>('regrade');
    const [questionId, setQuestionId] = useState<string>(''); // Empty string means full assessment
    const [requestedChange, setRequestedChange] = useState('');
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<QuestionOption[]>([]);
    const [questionsLoaded, setQuestionsLoaded] = useState(false);

    const queryTypes = [
        { value: 'regrade', label: 'Regrade Request', description: 'Request a review of your marks' },
        { value: 'clarification', label: 'Clarification', description: 'Ask for clarification about marking' },
        { value: 'technical_issue', label: 'Technical Issue', description: 'Report a technical problem' }
    ] as const;

    React.useEffect(() => {
        if (isOpen && !questionsLoaded) {
            loadQuestions();
        }
    }, [isOpen, questionsLoaded]);

    const loadQuestions = async () => {
        try {
            // Get assessment results to show current marks per question
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/student-results/assessments/${assessmentId}/my-results`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.questions) {
                    setQuestions(data.questions.map((q: any) => ({
                        id: q.question_id,
                        question_number: q.question_number,
                        max_marks: q.max_marks,
                        current_mark: q.mark
                    })));
                }
            }
            setQuestionsLoaded(true);
        } catch (error) {
            console.error('Failed to load questions:', error);
            setQuestionsLoaded(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestedChange.trim() || requestedChange.length < 10) {
            alert('Please provide a detailed explanation (minimum 10 characters)');
            return;
        }

        setLoading(true);
        try {
            const queryData = {
                assessment_id: assessmentId,
                question_id: questionId || null,
                requested_change: requestedChange.trim(),
                query_type: queryType
            };

            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/student-queries/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(queryData),
                }
            );

            if (response.ok) {
                alert('Query submitted successfully!');
                setRequestedChange('');
                setQuestionId('');
                setQueryType('regrade');
                onQuerySubmitted();
                onClose();
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.detail || 'Failed to submit query';
                alert(`Error: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error submitting query:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Submit Mark Query
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Assessment:</p>
                        <p className="text-gray-900">{assessmentTitle}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Query Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Query Type
                            </label>
                            <div className="space-y-2">
                                {queryTypes.map(type => (
                                    <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="queryType"
                                            value={type.value}
                                            checked={queryType === type.value}
                                            onChange={(e) => setQueryType(e.target.value as any)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">{type.label}</div>
                                            <div className="text-sm text-gray-500">{type.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Question Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Question (Optional)
                            </label>
                            <select
                                value={questionId}
                                onChange={(e) => setQuestionId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Full Assessment Query</option>
                                {questions.map(q => (
                                    <option key={q.id} value={q.id}>
                                        Question {q.question_number} - {q.current_mark !== null ? `${q.current_mark}/${q.max_marks}` : 'Ungraded'}
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                                Leave blank to query the entire assessment, or select a specific question.
                            </p>
                        </div>

                        {/* Requested Change */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Explanation <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={requestedChange}
                                onChange={(e) => setRequestedChange(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Please explain your query in detail. For regrade requests, specify which parts you believe were incorrectly marked and why. For clarifications, ask your specific questions about the marking."
                                required
                                minLength={10}
                                maxLength={1000}
                            />
                            <div className="flex justify-between text-sm text-gray-500 mt-1">
                                <span>Minimum 10 characters required</span>
                                <span>{requestedChange.length}/1000</span>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !requestedChange.trim() || requestedChange.length < 10}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? 'Submitting...' : 'Submit Query'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}