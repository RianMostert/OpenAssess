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

interface QuestionItem {
    questionId: string;
    currentMark?: number;
    requestedChange: string;
    queryType: 'regrade' | 'clarification' | 'technical_issue';
}

interface QuestionFormData {
    requestedChange: string;
    queryType: 'regrade' | 'clarification' | 'technical_issue';
}

export default function QueryModal({ 
    isOpen, 
    onClose, 
    assessmentId, 
    assessmentTitle,
    onQuerySubmitted 
}: QueryModalProps) {
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [questionForms, setQuestionForms] = useState<Record<string, QuestionFormData>>({});
    const [assessmentLevelNote, setAssessmentLevelNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<QuestionOption[]>([]);
    const [questionsLoaded, setQuestionsLoaded] = useState(false);

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

    const handleQuestionToggle = (questionId: string) => {
        setSelectedQuestionIds(prev => {
            const isSelected = prev.includes(questionId);
            if (isSelected) {
                // Remove question and clear its form data
                setQuestionForms(forms => {
                    const newForms = { ...forms };
                    delete newForms[questionId];
                    return newForms;
                });
                return prev.filter(id => id !== questionId);
            } else {
                // Add question and initialize its form data
                setQuestionForms(forms => ({
                    ...forms,
                    [questionId]: {
                        requestedChange: '',
                        queryType: 'regrade'
                    }
                }));
                return [...prev, questionId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedQuestionIds.length === questions.length) {
            setSelectedQuestionIds([]);
            setQuestionForms({});
        } else {
            const allIds = questions.map(q => q.id);
            setSelectedQuestionIds(allIds);
            
            // Initialize form data for all questions
            const newForms: Record<string, QuestionFormData> = {};
            allIds.forEach(id => {
                newForms[id] = {
                    requestedChange: '',
                    queryType: 'regrade'
                };
            });
            setQuestionForms(newForms);
        }
    };

    const updateQuestionForm = (questionId: string, field: keyof QuestionFormData, value: string) => {
        setQuestionForms(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedQuestionIds.length === 0) {
            alert('Please select at least one question to query');
            return;
        }
        
        // Validate that all selected questions have form data
        const hasIncompleteQuestions = selectedQuestionIds.some(id => {
            const form = questionForms[id];
            return !form || !form.requestedChange.trim() || form.requestedChange.length < 10;
        });
        
        if (hasIncompleteQuestions) {
            alert('Please provide a detailed explanation for all selected questions (minimum 10 characters each)');
            return;
        }

        setLoading(true);
        try {
            // Build question items for batch API
            const questionItems = selectedQuestionIds.map(questionId => {
                const question = questions.find(q => q.id === questionId);
                const form = questionForms[questionId];
                
                return {
                    question_id: questionId,
                    current_mark: question?.current_mark || null,
                    requested_change: form.requestedChange.trim(),
                    query_type: form.queryType
                };
            });

            const batchData = {
                assessment_id: assessmentId,
                question_items: questionItems,
                assessment_level_note: assessmentLevelNote.trim() || undefined
            };

            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/student-queries/batch`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batchData),
                }
            );

            if (response.ok) {
                const result = await response.json();
                alert(`Query batch submitted successfully! Created ${result.created_count} queries.`);
                
                // Reset form
                setSelectedQuestionIds([]);
                setQuestionForms({});
                setAssessmentLevelNote('');
                onQuerySubmitted();
                onClose();
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.detail || 'Failed to submit query batch';
                alert(`Error: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error submitting query batch:', error);
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
                        <p className="text-xs text-gray-600 mt-1">
                            Select questions below and provide specific explanations for each one.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Question Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Select Questions to Query <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    {selectedQuestionIds.length === questions.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            
                            {questions.length === 0 ? (
                                <div className="text-sm text-gray-500 p-3 border border-gray-200 rounded-lg">
                                    No questions available for this assessment
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {questions.map(q => (
                                        <div key={q.id} className="border border-gray-300 rounded-lg">
                                            <label className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedQuestionIds.includes(q.id)}
                                                    onChange={() => handleQuestionToggle(q.id)}
                                                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">
                                                        Question {q.question_number}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {q.current_mark !== null ? `${q.current_mark}/${q.max_marks}` : 'Ungraded'} marks
                                                    </div>
                                                </div>
                                            </label>
                                            
                                            {/* Show form for selected questions */}
                                            {selectedQuestionIds.includes(q.id) && (
                                                <div className="px-3 pb-3 border-t border-gray-200 bg-gray-50">
                                                    <div className="mt-3 space-y-3">
                                                        {/* <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Query Type
                                                            </label>
                                                            <select
                                                                value={questionForms[q.id]?.queryType || 'regrade'}
                                                                onChange={(e) => updateQuestionForm(q.id, 'queryType', e.target.value)}
                                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                <option value="regrade">Regrade Request</option>
                                                                <option value="clarification">Clarification</option>
                                                                <option value="technical_issue">Technical Issue</option>
                                                            </select>
                                                        </div> */}
                                                        
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Explanation <span className="text-red-500">*</span>
                                                            </label>
                                                            <textarea
                                                                value={questionForms[q.id]?.requestedChange || ''}
                                                                onChange={(e) => updateQuestionForm(q.id, 'requestedChange', e.target.value)}
                                                                rows={3}
                                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="Explain your query for this specific question..."
                                                                required
                                                                minLength={10}
                                                                maxLength={1000}
                                                            />
                                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                                <span>Minimum 10 characters</span>
                                                                <span>{(questionForms[q.id]?.requestedChange || '').length}/1000</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {selectedQuestionIds.length > 0 && (
                                <div className="mt-2 text-sm text-blue-600">
                                    {selectedQuestionIds.length} question{selectedQuestionIds.length === 1 ? '' : 's'} selected
                                </div>
                            )}
                        </div>

                        {/* Assessment-level note */}
                        {selectedQuestionIds.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assessment-level Note <span className="text-gray-500">(Optional)</span>
                                </label>
                                <textarea
                                    value={assessmentLevelNote}
                                    onChange={(e) => setAssessmentLevelNote(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Any overall context or comments about this assessment..."
                                    maxLength={500}
                                />
                                <div className="flex justify-between text-sm text-gray-500 mt-1">
                                    <span>Optional overall context for your queries</span>
                                    <span>{assessmentLevelNote.length}/500</span>
                                </div>
                            </div>
                        )}

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
                                disabled={loading || selectedQuestionIds.length === 0 || selectedQuestionIds.some(id => {
                                    const form = questionForms[id];
                                    return !form || !form.requestedChange.trim() || form.requestedChange.length < 10;
                                })}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? 'Submitting...' : `Submit ${selectedQuestionIds.length} Quer${selectedQuestionIds.length === 1 ? 'y' : 'ies'}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}