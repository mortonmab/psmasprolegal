import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Question {
  id: string;
  questionText: string;
  questionType: 'yesno' | 'score' | 'multiple' | 'text';
  isRequired: boolean;
  options?: string[];
  maxScore?: number;
}

interface ComplianceRunFormProps {
  departments: Department[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function ComplianceRunForm({ departments, onSubmit, onCancel }: ComplianceRunFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'once',
    startDate: '',
    dueDate: '',
    departments: [] as string[],
    questions: [] as Question[]
  });

  const frequencies = [
    { value: 'once', label: 'Once Off' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'bimonthly', label: 'Bi-Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
  ];

  const questionTypes = [
    { value: 'yesno', label: 'Yes/No' },
    { value: 'score', label: 'Score' },
    { value: 'multiple', label: 'Multiple Choice' },
    { value: 'text', label: 'Text Input' }
  ];

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q${formData.questions.length + 1}`,
      questionText: '',
      questionType: 'text',
      isRequired: true,
      options: []
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...formData.questions];
    const question = updatedQuestions[questionIndex];
    if (!question.options) question.options = [];
    question.options.push('');
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...formData.questions];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options[optionIndex] = value;
      setFormData({ ...formData, questions: updatedQuestions });
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...formData.questions];
    const question = updatedQuestions[questionIndex];
    if (question.options) {
      question.options = question.options.filter((_, i) => i !== optionIndex);
      setFormData({ ...formData, questions: updatedQuestions });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Create New Compliance Survey</h3>
        <p className="text-sm text-blue-700">
          This form will create a compliance survey that will be sent to department heads. 
          They will receive an email with a link to complete the survey.
        </p>
      </div>

      {/* Basic Information Section */}
      <div className="space-y-6">
        <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Basic Information</h4>
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Survey Title *
          </label>
          <input
            type="text"
            id="title"
            placeholder="e.g., Q1 2024 Data Protection Compliance Review"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Choose a clear, descriptive title that department heads will recognize
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Survey Description *
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Explain the purpose of this compliance survey and what information you're seeking..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Provide context about why this survey is needed and what you hope to achieve
          </p>
        </div>

        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
            Survey Frequency *
          </label>
          <select
            id="frequency"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            required
          >
            <option value="">Select frequency...</option>
            {frequencies.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            How often should this compliance check be repeated? Choose "Once Off" for one-time surveys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              When should this compliance survey begin?
            </p>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              id="dueDate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              When should department heads complete the survey by?
            </p>
          </div>
        </div>
      </div>

      {/* Target Departments Section */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Target Departments</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Departments to Survey *
          </label>
          {departments.length === 0 ? (
            <div className="mt-1 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">No Departments Available</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Departments need to be created and have heads assigned before you can create compliance surveys.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-1 space-y-2">
              {departments.map((dept) => (
                <label key={dept.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.departments.includes(dept.id)}
                    onChange={(e) => {
                      const updatedDepts = e.target.checked
                        ? [...formData.departments, dept.id]
                        : formData.departments.filter(id => id !== dept.id);
                      setFormData({ ...formData, departments: updatedDepts });
                    }}
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">{dept.name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            <strong>Note:</strong> Only department heads will receive the compliance survey email. 
            Make sure all selected departments have heads assigned.
          </p>
        </div>
      </div>

      {/* Survey Questions Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Survey Questions</h4>
            <p className="text-sm text-gray-600 mt-1">
              Add questions that department heads need to answer. You can mix different question types.
            </p>
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </button>
        </div>

        {formData.questions.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No questions yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first survey question.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Question
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.questions.map((question, questionIndex) => (
              <div key={question.id} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-grow mr-4">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mr-3">
                        {questionIndex + 1}
                      </span>
                      <label className="text-sm font-medium text-gray-700">Question {questionIndex + 1}</label>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter your question here..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={question.questionText}
                      onChange={(e) => updateQuestion(questionIndex, { questionText: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(questionIndex)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Remove question"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                    <select
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={question.questionType}
                      onChange={(e) => updateQuestion(questionIndex, { questionType: e.target.value as Question['questionType'] })}
                    >
                      {questionTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={question.isRequired}
                        onChange={(e) => updateQuestion(questionIndex, { isRequired: e.target.checked })}
                      />
                      <span className="ml-2 text-sm text-gray-700">Required question</span>
                    </label>
                  </div>
                </div>

                {/* Question-specific options */}
                {question.questionType === 'multiple' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center mb-3">
                      <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <label className="text-sm font-medium text-blue-900">Multiple Choice Options</label>
                    </div>
                    <div className="space-y-2">
                      {question.options?.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <input
                            type="text"
                            placeholder={`Enter option ${optionIndex + 1}...`}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={option}
                            onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(questionIndex, optionIndex)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Remove option"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(questionIndex)}
                        className="mt-3 inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-blue-600">
                      Add at least 2 options for multiple choice questions
                    </p>
                  </div>
                )}

                {question.questionType === 'score' && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center mb-3">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <label className="text-sm font-medium text-green-900">Scoring Configuration</label>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">Maximum Score</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="10"
                          className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          value={question.maxScore || ''}
                          onChange={(e) => updateQuestion(questionIndex, { maxScore: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="text-sm text-green-600">
                        <p>Department heads will rate from 1 to {question.maxScore || '?'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {question.questionType === 'yesno' && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-purple-900">Yes/No Question</span>
                    </div>
                    <p className="mt-1 text-xs text-purple-600">
                      Department heads will answer with Yes or No
                    </p>
                  </div>
                )}

                {question.questionType === 'text' && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="text-sm font-medium text-orange-900">Text Response</span>
                    </div>
                    <p className="mt-1 text-xs text-orange-600">
                      Department heads will provide a written response
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <p>* Required fields</p>
          <p className="mt-1">
            {formData.questions.length} question{formData.questions.length !== 1 ? 's' : ''} • 
            {formData.departments.length} department{formData.departments.length !== 1 ? 's' : ''} selected
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(formData)}
            disabled={!formData.title || !formData.description || !formData.startDate || !formData.dueDate || formData.departments.length === 0 || formData.questions.length === 0}
            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Compliance Survey
          </button>
        </div>
      </div>
    </div>
  );
} 