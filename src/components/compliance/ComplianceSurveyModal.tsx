import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, CheckCircle, Clock, FileText, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { ComplianceService } from '../../services/complianceService';
import { format } from 'date-fns';

interface ComplianceSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
}

interface SurveyDetails {
  run: {
    id: string;
    title: string;
    description: string;
    frequency: string;
    startDate: string;
    dueDate: string;
    status: string;
    createdBy: string;
    createdAt: string;
  };
  questions: Array<{
    id: string;
    questionText: string;
    questionType: string;
    isRequired: boolean;
    options?: string[];
    maxScore?: number;
  }>;
  recipients: Array<{
    id: string;
    userId: string;
    departmentId: string;
    emailSent: boolean;
    emailSentAt: string;
    surveyCompleted: boolean;
    surveyCompletedAt: string;
    userName?: string;
    departmentName?: string;
    email?: string;
  }>;
  statistics: {
    totalRecipients: number;
    completedSurveys: number;
    pendingSurveys: number;
    completionRate: number;
  };
}

interface DepartmentResponses {
  departmentId: string;
  departmentName: string;
  recipients: Array<{
    id: string;
    userId: string;
    userName: string;
    email: string;
    surveyCompleted: boolean;
    surveyCompletedAt: string;
  }>;
  completionRate: number;
}

export function ComplianceSurveyModal({ isOpen, onClose, surveyId }: ComplianceSurveyModalProps) {
  const [surveyDetails, setSurveyDetails] = useState<SurveyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'responses'>('overview');
  const [showResponses, setShowResponses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && surveyId) {
      loadSurveyDetails();
    }
  }, [isOpen, surveyId]);

  const loadSurveyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ComplianceService.getComplianceRunDetails(surveyId);
      setSurveyDetails(data);
    } catch (error) {
      console.error('Error loading survey details:', error);
      setError('Failed to load survey details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getDepartmentResponses = (): DepartmentResponses[] => {
    if (!surveyDetails) return [];

    const departmentMap = new Map<string, DepartmentResponses>();

    surveyDetails.recipients.forEach(recipient => {
      const deptId = recipient.departmentId;
      const deptName = recipient.departmentName || 'Unknown Department';

      if (!departmentMap.has(deptId)) {
        departmentMap.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          recipients: [],
          completionRate: 0
        });
      }

      const dept = departmentMap.get(deptId)!;
      dept.recipients.push({
        id: recipient.id,
        userId: recipient.userId,
        userName: recipient.userName || 'Unknown User',
        email: recipient.email || 'No email',
        surveyCompleted: recipient.surveyCompleted,
        surveyCompletedAt: recipient.surveyCompletedAt || ''
      });
    });

    // Calculate completion rates
    departmentMap.forEach(dept => {
      const completed = dept.recipients.filter(r => r.surveyCompleted).length;
      dept.completionRate = dept.recipients.length > 0 ? (completed / dept.recipients.length) * 100 : 0;
    });

    return Array.from(departmentMap.values()).sort((a, b) => b.completionRate - a.completionRate);
  };

  const toggleResponses = (departmentId: string) => {
    setShowResponses(prev => ({
      ...prev,
      [departmentId]: !prev[departmentId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Compliance Survey Details</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading survey details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">{error}</div>
              <Button onClick={loadSurveyDetails}>Retry</Button>
            </div>
          ) : surveyDetails ? (
            <div>
              {/* Survey Overview */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{surveyDetails.run.title}</h3>
                <p className="text-gray-600 mb-4">{surveyDetails.run.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      Due: {formatDate(surveyDetails.run.dueDate)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      Frequency: {surveyDetails.run.frequency}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      {surveyDetails.questions.length} Questions
                    </span>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-500 mr-3" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{surveyDetails.statistics.totalRecipients}</p>
                        <p className="text-sm text-gray-600">Total Recipients</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{surveyDetails.statistics.completedSurveys}</p>
                        <p className="text-sm text-gray-600">Completed</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{surveyDetails.statistics.pendingSurveys}</p>
                        <p className="text-sm text-gray-600">Pending</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-bold text-blue-600">
                          {surveyDetails.statistics.completionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{surveyDetails.statistics.completionRate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Questions Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('responses')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'responses'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Department Responses
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Survey Questions</h4>
                  <div className="space-y-4">
                    {surveyDetails.questions.map((question, index) => (
                      <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3">
                                Q{index + 1}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                question.questionType === 'text' ? 'bg-orange-100 text-orange-800' :
                                question.questionType === 'yesno' ? 'bg-purple-100 text-purple-800' :
                                question.questionType === 'score' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {question.questionType.toUpperCase()}
                              </span>
                              {question.isRequired && (
                                <span className="ml-2 text-red-500 text-xs">*Required</span>
                              )}
                            </div>
                            <p className="text-gray-900 font-medium">{question.questionText}</p>
                            {question.options && question.options.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600 mb-1">Options:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                  {question.options.map((option, optIndex) => (
                                    <li key={optIndex}>{option}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {question.maxScore && (
                              <p className="text-sm text-gray-600 mt-1">
                                Max Score: {question.maxScore}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'responses' && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Department Responses</h4>
                  <div className="space-y-4">
                    {getDepartmentResponses().map((dept) => (
                      <div key={dept.departmentId} className="bg-white border border-gray-200 rounded-lg">
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-lg font-medium text-gray-900">{dept.departmentName}</h5>
                              <p className="text-sm text-gray-600">
                                {dept.recipients.length} recipients • {dept.completionRate.toFixed(1)}% completion rate
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-sm text-gray-600">
                                  {dept.recipients.filter(r => r.surveyCompleted).length} completed
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleResponses(dept.departmentId)}
                              >
                                {showResponses[dept.departmentId] ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-1" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {showResponses[dept.departmentId] && (
                          <div className="p-4">
                            <div className="space-y-3">
                              {dept.recipients.map((recipient) => (
                                <div key={recipient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium text-gray-900">{recipient.userName}</p>
                                    <p className="text-sm text-gray-600">{recipient.email}</p>
                                  </div>
                                  <div className="flex items-center">
                                    {recipient.surveyCompleted ? (
                                      <>
                                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                        <span className="text-sm text-green-600">
                                          Completed {recipient.surveyCompletedAt ? formatDate(recipient.surveyCompletedAt) : ''}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                                        <span className="text-sm text-yellow-600">Pending</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
