import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, ChevronLeft, X, Check, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ComplianceService } from '../services/complianceService';
import { SurveyData, SurveyResponse } from '../services/complianceService';
import { Footer } from '../components/Footer';

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'yesno' | 'score' | 'multiple' | 'text';
  required: boolean;
  options?: string[];
  maxScore?: number;
}

interface SurveyResponse {
  questionId: string;
  answer?: string | number | boolean;
  score?: number;
  comment?: string;
}

export function ComplianceSurvey() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [showComment, setShowComment] = useState(false);
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSurveyData();
    }
  }, [token]);

  const loadSurveyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ComplianceService.getComplianceSurvey(token!);
      setSurveyData(data);
    } catch (error) {
      console.error('Error loading survey data:', error);
      setError('Survey not found or has expired. Please contact the legal department.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Survey...</h2>
          <p className="text-gray-600">Please wait while we load your compliance survey.</p>
        </div>
      </div>
    );
  }

  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Survey Not Available</h2>
          <p className="text-gray-600 mb-4">{error || 'This survey is not available.'}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the legal department.
          </p>
        </div>
      </div>
    );
  }

  // Check if questions array exists and has questions
  if (!surveyData.questions || surveyData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Questions Available</h2>
          <p className="text-gray-600 mb-4">This survey has no questions to display.</p>
          <p className="text-sm text-gray-500">
            Please contact the legal department for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Ensure currentQuestionIndex is within bounds
  if (currentQuestionIndex >= surveyData.questions.length) {
    setCurrentQuestionIndex(0);
  }

  const currentQuestion = surveyData.questions[currentQuestionIndex];
  


  const handleAnswer = (answer: string | number | boolean) => {
    const response: SurveyResponse = {
      questionId: currentQuestion.id
    };

    // Store answer in the appropriate field based on question type
    if (currentQuestion.questionType === 'score') {
      response.score = answer as number;
    } else {
      response.answer = answer;
    }

    setResponses(prev => {
      const existing = prev.findIndex(r => r.questionId === currentQuestion.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = response;
        return updated;
      }
      return [...prev, response];
    });

    // Only auto-advance for yes/no questions (and show comment for "No")
    // For other question types, user needs to click continue
    if (currentQuestion.questionType === 'yesno') {
      if (answer === false) {
        setShowComment(true);
      } else {
        moveToNext();
      }
    }
    // For score, text, and multiple choice questions, user needs to click continue button
  };

  const handleComment = (comment: string) => {
    setResponses(prev => {
      const updated = [...prev];
      const current = updated.find(r => r.questionId === currentQuestion.id);
      if (current) {
        current.comment = comment;
      }
      return updated;
    });
  };

  const handleSubmitSurvey = async () => {
    try {
      setSubmitting(true);
      
      // Clean up responses to remove undefined values
      const cleanedResponses = responses.map(response => {
        const cleaned: any = {
          questionId: response.questionId
        };
        
        if (response.answer !== undefined) {
          cleaned.answer = response.answer;
        }
        
        if (response.score !== undefined) {
          cleaned.score = response.score;
        }
        
        if (response.comment !== undefined) {
          cleaned.comment = response.comment;
        }
        
        return cleaned;
      });
      
      await ComplianceService.submitComplianceSurvey(token!, cleanedResponses);
      
      // Show success message and redirect
      setTimeout(() => {
        navigate('/compliance-survey-complete');
      }, 2000);
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const moveToNext = () => {
    if (currentQuestionIndex < surveyData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowComment(false);
    } else {
      // Show summary on the last question
      setShowSummary(true);
    }
  };

  const moveToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowComment(false);
    }
  };

  // Add this function to check if a question has been answered
  const isQuestionAnswered = (questionId: string) => {
    return responses.some(r => r.questionId === questionId);
  };

  // Function to check if all required questions are answered
  const areAllRequiredQuestionsAnswered = () => {
    return surveyData.questions.every(question => {
      if (!question.required) return true;
      const response = responses.find(r => r.questionId === question.id);
      if (!response) return false;
      
      if (question.questionType === 'score') {
        return response.score !== undefined;
      }
      return response.answer !== undefined && response.answer !== '';
    });
  };

  // Function to get formatted answer text for summary
  const getAnswerText = (question: SurveyQuestion, response: SurveyResponse) => {
    if (response.score !== undefined) {
      return `Score: ${response.score}${question.maxScore ? ` / ${question.maxScore}` : ''}`;
    }
    
    if (response.answer !== undefined) {
      if (question.questionType === 'yesno') {
        return response.answer ? 'Yes' : 'No';
      }
      if (question.questionType === 'multiple' && question.options) {
        const optionIndex = parseInt(response.answer as string);
        return question.options[optionIndex] || response.answer;
      }
      return response.answer.toString();
    }
    
    return 'No answer provided';
  };

  // Add this function to get the answer preview
  const getAnswerPreview = (questionId: string) => {
    const response = responses.find(r => r.questionId === questionId);
    if (!response) return 'Not answered';
    
    // Handle different answer types
    if (response.score !== undefined) {
      return `Score: ${response.score}`;
    } else if (typeof response.answer === 'boolean') {
      const baseAnswer = response.answer ? 'Yes' : 'No';
      if (response.answer === false && response.comment) {
        return `${baseAnswer} - ${response.comment.substring(0, 30)}...`;
      }
      return baseAnswer;
    } else if (typeof response.answer === 'number') {
      return `Score: ${response.answer}`;
    } else if (typeof response.answer === 'string') {
      // For text answers, show first 50 characters
      if (response.answer.length > 50) {
        return `${response.answer.substring(0, 50)}...`;
      }
      return response.answer;
    }
    
    return 'Not answered';
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center animate-fade-in">
          <div className="mb-8">
            <img 
              src="/images/logo.png" 
              alt="Company Logo" 
              className="h-32 mx-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {surveyData.run.title}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {surveyData.recipient.department_name}
          </p>
          <div className="bg-white rounded-lg p-8 shadow-lg mb-8">
            <p className="text-gray-600 mb-6">
              {surveyData.run.description}
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 mb-8">
              <div>
                <span className="font-medium">{surveyData.questions.length}</span> questions
              </div>
              <div>
                <span className="font-medium">5-10 minutes</span> to complete
              </div>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              Start Survey
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200">
        <div 
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${((currentQuestionIndex + 1) / surveyData.questions.length) * 100}%` }}
        />
      </div>

      {/* Back button, logo, and question counter */}
      <div className="fixed top-4 left-4 right-4 flex justify-between items-center animate-fade-in">
        <button
          onClick={() => setShowQuestionList(prev => !prev)}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 mr-2" />
          Back to questions
        </button>
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img 
            src="/images/logo.png" 
            alt="Company Logo" 
            className="h-8"
          />
        </div>
        <div className="text-sm text-gray-600">
          {currentQuestionIndex + 1} of {surveyData.questions.length}
          <span className="ml-2 text-xs">
            ({responses.length} answered)
          </span>
        </div>
      </div>

      {/* Question list overlay */}
      {showQuestionList && (
        <div className="fixed inset-0 bg-white z-10 overflow-y-auto animate-fade-in">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <img 
                  src="/images/logo.png" 
                  alt="Company Logo" 
                  className="h-8 mr-4"
                />
                <h2 className="text-xl font-semibold text-gray-900">Your Progress</h2>
              </div>
              <button
                onClick={() => setShowQuestionList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2">
              {surveyData.questions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => {
                    setCurrentQuestionIndex(index);
                    setShowQuestionList(false);
                    setShowComment(false);
                  }}
                  className={`w-full p-4 text-left rounded-lg border ${
                    currentQuestionIndex === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } transition-all duration-200`}
                >
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 mr-3">
                      {index + 1}
                    </span>
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-gray-900">{question.questionText}</p>
                      <p className={`text-sm mt-1 ${
                        isQuestionAnswered(question.id) ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {isQuestionAnswered(question.id) 
                          ? getAnswerPreview(question.id)
                          : 'Not answered yet'}
                      </p>
                      {responses.find(r => r.questionId === question.id)?.comment && (
                        <p className="text-xs text-blue-600 mt-1">
                          💬 Comment added
                        </p>
                      )}
                    </div>
                    {isQuestionAnswered(question.id) && (
                      <Check className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 mt-16">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Question */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 animate-slide-down">
              {currentQuestion.questionText}
            </h2>
            <p className="text-gray-500 animate-slide-up">
              Question {currentQuestionIndex + 1} of {surveyData.questions.length}
            </p>
          </div>

          {/* Answer options */}
          <div className="space-y-4 animate-slide-up">
            {currentQuestion.questionType === 'yesno' && !showComment && (
              <div className="grid grid-cols-2 gap-4">
                {(() => {
                  const currentAnswer = responses.find(r => r.questionId === currentQuestion.id)?.answer;
                  return (
                    <>
                      <button
                        onClick={() => handleAnswer(true)}
                        className={`p-6 text-xl font-medium text-center rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                          currentAnswer === true
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-transparent hover:border-green-500 hover:bg-green-50'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => handleAnswer(false)}
                        className={`p-6 text-xl font-medium text-center rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                          currentAnswer === false
                            ? 'border-red-500 bg-red-50 text-red-900'
                            : 'border-transparent hover:border-red-500 hover:bg-red-50'
                        }`}
                      >
                        No
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {showComment && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-gray-600">Please provide more details about why you selected "No":</p>
                <textarea
                  autoFocus
                  className="w-full p-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  rows={4}
                  placeholder="Please explain why you selected 'No'..."
                  value={responses.find(r => r.questionId === currentQuestion.id)?.comment || ''}
                  onChange={(e) => handleComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      moveToNext();
                    }
                  }}
                />
                <button
                  onClick={moveToNext}
                  disabled={!responses.find(r => r.questionId === currentQuestion.id)?.comment}
                  className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            )}

            {currentQuestion.questionType === 'score' && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  {[...Array(currentQuestion.maxScore || 10)].map((_, i) => {
                    const score = i + 1;
                    const isSelected = responses.find(r => r.questionId === currentQuestion.id)?.score === score;
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(score)}
                        className={`w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500 text-white' 
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>
                <div className="text-center text-sm text-gray-600">
                  <span className="font-medium">1</span> = Poor • <span className="font-medium">{currentQuestion.maxScore || 10}</span> = Excellent
                </div>
                {responses.find(r => r.questionId === currentQuestion.id)?.score !== undefined && (
                  <button
                    onClick={moveToNext}
                    className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105"
                  >
                    Continue
                  </button>
                )}
              </div>
            )}

            {currentQuestion.questionType === 'multiple' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {currentQuestion.options && currentQuestion.options.length > 0 ? (
                    currentQuestion.options.map((option, index) => {
                      const isSelected = responses.find(r => r.questionId === currentQuestion.id)?.answer === option;
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswer(option)}
                          className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 text-blue-900' 
                              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                            {option}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-500 p-4">
                      <p>No options available for this question.</p>
                      <p className="text-xs mt-2">This might be because:</p>
                      <ul className="text-xs mt-1 text-left">
                        <li>• Options were not saved properly</li>
                        <li>• Database field is empty</li>
                        <li>• JSON parsing failed</li>
                      </ul>
                    </div>
                  )}
                </div>
                {responses.find(r => r.questionId === currentQuestion.id)?.answer && (
                  <button
                    onClick={moveToNext}
                    className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105"
                  >
                    Continue
                  </button>
                )}
              </div>
            )}

            {currentQuestion.questionType === 'text' && (
              <div className="space-y-4">
                <textarea
                  autoFocus
                  className="w-full p-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  rows={4}
                  placeholder="Enter your answer..."
                  value={responses.find(r => r.questionId === currentQuestion.id)?.answer as string || ''}
                  onChange={(e) => {
                    const response: SurveyResponse = {
                      questionId: currentQuestion.id,
                      answer: e.target.value
                    };
                    setResponses(prev => {
                      const existing = prev.findIndex(r => r.questionId === currentQuestion.id);
                      if (existing >= 0) {
                        const updated = [...prev];
                        updated[existing] = response;
                        return updated;
                      }
                      return [...prev, response];
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      moveToNext();
                    }
                  }}
                />
                <button
                  onClick={moveToNext}
                  disabled={!responses.find(r => r.questionId === currentQuestion.id)?.answer}
                  className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary View */}
      {showSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Survey Summary</h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className={`border rounded-lg p-4 ${
                  areAllRequiredQuestionsAnswered() 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-2 ${
                    areAllRequiredQuestionsAnswered() ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    {areAllRequiredQuestionsAnswered() ? '✅ Ready to Submit' : '⚠️ Review Required'}
                  </h3>
                  <p className={areAllRequiredQuestionsAnswered() ? 'text-green-700' : 'text-yellow-700'}>
                    {areAllRequiredQuestionsAnswered() 
                      ? 'All required questions have been answered. Please review your responses before submitting.'
                      : 'Some required questions are missing answers. Please complete all required questions before submitting.'
                    }
                  </p>
                </div>

                {surveyData.questions.map((question, index) => {
                  const response = responses.find(r => r.questionId === question.id);
                  return (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full mr-3">
                              Question {index + 1}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              question.questionType === 'text' ? 'bg-orange-100 text-orange-800' :
                              question.questionType === 'yesno' ? 'bg-purple-100 text-purple-800' :
                              question.questionType === 'score' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {question.questionType.toUpperCase()}
                            </span>
                            {question.required && (
                              <span className="ml-2 text-red-500 text-xs font-medium">*Required</span>
                            )}
                          </div>
                          <h4 className="text-lg font-medium text-gray-900">{question.questionText}</h4>
                        </div>
                        <button
                          onClick={() => {
                            setShowSummary(false);
                            setCurrentQuestionIndex(index);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        {response ? (
                          <div className="space-y-2">
                            <p className="font-medium text-gray-900">
                              Answer: {getAnswerText(question, response)}
                            </p>
                            {response.comment && (
                              <div>
                                <p className="text-sm font-medium text-gray-700">Comment:</p>
                                <p className="text-sm text-gray-600 bg-white rounded p-2">{response.comment}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-600 font-medium">No answer provided</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <button
                  onClick={() => setShowSummary(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back to Survey
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSummary(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Continue Editing
                  </button>
                  <button
                    onClick={handleSubmitSurvey}
                    disabled={submitting || !areAllRequiredQuestionsAnswered()}
                    className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                      areAllRequiredQuestionsAnswered() && !submitting
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Submit Survey
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-between bg-white border-t animate-slide-up">
        <button
          onClick={moveToPrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
        >
          <ChevronUp className="h-5 w-5 mr-1" />
          Previous
        </button>
        {currentQuestionIndex === surveyData.questions.length - 1 ? (
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Check className="h-4 w-4 mr-2" />
            Complete
          </button>
        ) : (
          <button
            onClick={moveToNext}
            className="flex items-center text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            Next
            <ChevronDown className="h-5 w-5 ml-1" />
          </button>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
} 