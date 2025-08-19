import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, Clock, Play, Eye, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Button } from '../ui/button';
import { ComplianceRunForm } from './ComplianceRunForm';
import { ComplianceSurveyModal } from './ComplianceSurveyModal';
import { ComplianceService } from '../../services/complianceService';
import { departmentService } from '../../services/departmentService';
import { ComplianceRun } from '../../lib/types';
import { useToast } from '../ui/use-toast';

interface Department {
  id: string;
  name: string;
}

interface ComplianceRun {
  id: string;
  title: string;
  description: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'annually';
  startDate: string;
  dueDate: string;
  status: 'draft' | 'active' | 'completed' | 'expired';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  created_by_name?: string;
  total_recipients?: number;
  completed_surveys?: number;
}





export function DepartmentCompliance() {
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [complianceRuns, setComplianceRuns] = useState<ComplianceRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingRun, setActivatingRun] = useState<string | null>(null);
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);

  // Safe date formatting function
  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy');
      }
      return 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  };

  useEffect(() => {
    loadComplianceRuns();
    loadDepartments();
  }, []);

  const loadComplianceRuns = async () => {
    try {
      setLoading(true);
      const runs = await ComplianceService.getComplianceRuns();
      setComplianceRuns(runs);
    } catch (error) {
      console.error('Error loading compliance runs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load compliance runs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const depts = await departmentService.getAllDepartments();
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load departments',
        variant: 'destructive'
      });
    }
  };

  const handleActivateRun = async (runId: string) => {
    try {
      setActivatingRun(runId);
      await ComplianceService.activateComplianceRun(runId);
      toast({
        title: 'Success',
        description: 'Compliance run activated and notifications sent to department heads',
      });
      loadComplianceRuns(); // Refresh the list
    } catch (error) {
      console.error('Error activating compliance run:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate compliance run',
        variant: 'destructive'
      });
    } finally {
      setActivatingRun(null);
    }
  };

  const handleSurveyClick = (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    setShowSurveyModal(true);
  };

  const handleCreateRun = async (data: any) => {
    // Validate form data
    if (!data.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a survey title',
        variant: 'destructive'
      });
      return;
    }

    if (!data.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a survey description',
        variant: 'destructive'
      });
      return;
    }

    if (data.departments.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one department',
        variant: 'destructive'
      });
      return;
    }

    if (!data.startDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a start date',
        variant: 'destructive'
      });
      return;
    }

    if (!data.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a due date',
        variant: 'destructive'
      });
      return;
    }

    if (data.questions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one question',
        variant: 'destructive'
      });
      return;
    }

    // Validate questions
    for (let i = 0; i < data.questions.length; i++) {
      const question = data.questions[i];
      
      if (!question.questionText.trim()) {
        toast({
          title: 'Validation Error',
          description: `Question ${i + 1} is empty. Please enter a question.`,
          variant: 'destructive'
        });
        return;
      }

      if (question.questionType === 'multiple' && (!question.options || question.options.length < 2)) {
        toast({
          title: 'Validation Error',
          description: `Question ${i + 1} (Multiple Choice) needs at least 2 options.`,
          variant: 'destructive'
        });
        return;
      }

      if (question.questionType === 'score' && (!question.maxScore || question.maxScore < 1)) {
        toast({
          title: 'Validation Error',
          description: `Question ${i + 1} (Score) needs a maximum score greater than 0.`,
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      // Transform the data to match the API expectations
      const apiData = {
        ...data,
        departmentIds: data.departments, // Convert departments to departmentIds
        startDate: data.startDate,
        dueDate: data.dueDate
      };
      
      await ComplianceService.createComplianceRun(apiData);
      toast({
        title: 'Success',
        description: 'Compliance survey created successfully',
      });
      setShowNewRunModal(false);
      loadComplianceRuns(); // Refresh the list
    } catch (error) {
      console.error('Error creating compliance run:', error);
      toast({
        title: 'Error',
        description: 'Failed to create compliance survey',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Department Compliance Surveys</h2>
        <Button onClick={() => setShowNewRunModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Compliance Survey
        </Button>
      </div>

      {loading ? (
        <div className="bg-white shadow rounded-md p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ) : complianceRuns.length === 0 ? (
        <div className="bg-white shadow rounded-md p-6 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance surveys yet</h3>
          <p className="text-gray-500 mb-4">Create your first compliance survey to get started.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {complianceRuns.map((run) => (
              <li key={run.id}>
                <div 
                  className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => handleSurveyClick(run.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Calendar className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">{run.title}</p>
                        <p className="text-sm text-gray-500">
                          Due {formatDate(run.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${run.status === 'active' ? 'bg-green-100 text-green-800' : 
                          run.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                          run.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'}`}>
                        {run.status}
                      </span>
                      {run.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateRun(run.id);
                          }}
                          disabled={activatingRun === run.id}
                          className="ml-2"
                        >
                          {activatingRun === run.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {run.total_recipients || 0} Recipients
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {run.frequency}
                      </p>
                      {run.status === 'active' && (
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <CheckCircle className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" />
                          {run.completed_surveys || 0} Completed
                        </p>
                      )}
                    </div>
                    <div className="mt-2 sm:mt-0 flex items-center">
                      <p className="text-sm text-gray-500">
                        Created by {run.created_by_name}
                      </p>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New Run Modal */}
      {showNewRunModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Compliance Run</h3>
                  <div className="mt-4">
                    <ComplianceRunForm
                      departments={departments}
                      onSubmit={handleCreateRun}
                      onCancel={() => setShowNewRunModal(false)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Survey Details Modal */}
      {showSurveyModal && selectedSurveyId && (
        <ComplianceSurveyModal
          isOpen={showSurveyModal}
          onClose={() => {
            setShowSurveyModal(false);
            setSelectedSurveyId(null);
          }}
          surveyId={selectedSurveyId}
        />
      )}
    </div>
  );
} 