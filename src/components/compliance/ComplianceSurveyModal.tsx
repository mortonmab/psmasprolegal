import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, CheckCircle, Clock, FileText, Eye, EyeOff, Download, Share2, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { ComplianceService } from '../../services/complianceService';
import { format } from 'date-fns';
import { useToast } from '../ui/use-toast';

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
  const [surveyResponses, setSurveyResponses] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'department'>('overview');
  const [showResponses, setShowResponses] = useState<Record<string, boolean>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

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

      // Normalize snake_case from API to camelCase used in UI
      const normalizedRun = data?.run
        ? {
            ...data.run,
            startDate: data.run.startDate ?? data.run.start_date ?? '',
            dueDate: data.run.dueDate ?? data.run.due_date ?? '',
            createdAt: data.run.createdAt ?? data.run.created_at ?? '',
            createdBy: data.run.createdBy ?? data.run.created_by ?? data.run.createdBy,
          }
        : data?.run;

      const normalizedRecipients = Array.isArray(data?.recipients)
        ? data.recipients.map((r: any) => ({
            ...r,
            userId: r.userId ?? r.user_id ?? r.userId,
            departmentId: r.departmentId ?? r.department_id ?? r.departmentId,
            departmentName: r.departmentName ?? r.department_name ?? r.departmentName,
            emailSentAt: r.emailSentAt ?? r.email_sent_at ?? r.emailSentAt,
            surveyCompletedAt: r.surveyCompletedAt ?? r.survey_completed_at ?? r.surveyCompletedAt,
            email: r.email,
            userName: r.userName ?? r.user_name ?? r.userName,
          }))
        : data?.recipients;

      setSurveyDetails({
        ...data,
        run: normalizedRun,
        recipients: normalizedRecipients,
      });
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

  const loadSurveyResponses = async () => {
    try {
      setLoadingResponses(true);
      setError(null);
      const data = await ComplianceService.getSurveyResponses(surveyId);
      // Normalize snake_case keys from API to camelCase expected by UI
      if (data && Array.isArray(data.responses)) {
        const normalized = data.responses.map((r: any) => ({
          ...r,
          departmentName: r.departmentName ?? r.department_name ?? 'Unknown Department',
          userName: r.userName ?? r.user_name ?? '',
          userEmail: r.userEmail ?? r.user_email ?? '',
          questionText: r.questionText ?? r.question_text ?? '',
          questionType: r.questionType ?? r.question_type ?? '',
          submittedAt: r.submittedAt ?? r.submitted_at ?? r.created_at ?? ''
        }));
        setSurveyResponses({ ...data, responses: normalized });
      } else {
        setSurveyResponses(data);
      }
    } catch (error) {
      console.error('Error loading survey responses:', error);
      setError('Failed to load survey responses');
    } finally {
      setLoadingResponses(false);
    }
  };

  // Export helpers for per-department responses (CSV/PDF)
  const exportDepartmentToCSV = (departmentName: string) => {
    try {
      if (!surveyResponses?.responses || !Array.isArray(surveyResponses.responses)) return;

      const filtered = surveyResponses.responses.filter((r: any) => (r.departmentName || 'Unknown Department') === departmentName);
      const headers = [
        'Department',
        'User Name',
        'User Email',
        'Question',
        'Answer',
        'Score',
        'Comment',
        'Submitted At'
      ];

      const csvRows = filtered.map((r: any) => [
        departmentName,
        r.userName || '',
        r.userEmail || '',
        r.questionText || '',
        (r.answer ?? '').toString(),
        r.score ?? '',
        r.comment ?? '',
        r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map((row: any[]) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-${departmentName.replace(/\s+/g, '_').toLowerCase()}-responses.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      toast({ title: 'Error', description: 'Failed to export CSV', variant: 'destructive' });
    }
  };

  const exportDepartmentToPDF = (departmentName: string) => {
    try {
      if (!surveyResponses?.responses || !Array.isArray(surveyResponses.responses)) return;

      const filtered = surveyResponses.responses.filter((r: any) => (r.departmentName || 'Unknown Department') === departmentName);

      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: 'Popup blocked', description: 'Allow popups to export PDF', variant: 'destructive' });
        return;
      }

      const tableRows = filtered.map((r: any) => `
        <tr>
          <td>${departmentName}</td>
          <td>${r.userName || ''}</td>
          <td>${r.userEmail || ''}</td>
          <td>${r.questionText || ''}</td>
          <td>${r.answer ?? ''}</td>
          <td>${r.score ?? ''}</td>
          <td>${r.comment ?? ''}</td>
          <td>${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ''}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Department Responses - ${departmentName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #111827; font-size: 18px; margin-bottom: 8px; }
              .meta { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
              th { background: #f9fafb; }
              tr:nth-child(even) { background: #fafafa; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h1>Department Responses - ${departmentName}</h1>
            <div class="meta">
              Exported: ${new Date().toLocaleString()} • Total responses: ${filtered.length}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>User Name</th>
                  <th>User Email</th>
                  <th>Question</th>
                  <th>Answer</th>
                  <th>Score</th>
                  <th>Comment</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <script>
              window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };
            </script>
          </body>
        </html>
      `;

      win.document.write(html);
      win.document.close();
    } catch (err) {
      console.error('Failed to export PDF:', err);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);

      // Fetch latest responses to include in the PDF
      const data = await ComplianceService.getSurveyResponses(surveyId);
      const normalizedResponses = Array.isArray(data?.responses)
        ? data.responses.map((r: any) => ({
            ...r,
            departmentName: r.departmentName ?? r.department_name ?? 'Unknown Department',
            userName: r.userName ?? r.user_name ?? '',
            userEmail: r.userEmail ?? r.user_email ?? '',
            questionText: r.questionText ?? r.question_text ?? '',
            questionType: r.questionType ?? r.question_type ?? '',
            submittedAt: r.submittedAt ?? r.submitted_at ?? r.created_at ?? ''
          }))
        : [];

      // Group responses by department
      const departmentGroups = new Map<string, any[]>();
      normalizedResponses.forEach((r: any) => {
        const key = r.departmentName || 'Unknown Department';
        if (!departmentGroups.has(key)) departmentGroups.set(key, []);
        departmentGroups.get(key)!.push(r);
      });

      const deptSections = Array.from(departmentGroups.entries())
        .map(([dept, rows]) => {
          // Group by user (prefer userId/email if available)
          const userGroups = new Map<string, { userName: string; userEmail: string; items: any[] }>();
          rows.forEach((r: any) => {
            const key = (r.userEmail || r.userName || 'Unknown User') as string;
            if (!userGroups.has(key)) {
              userGroups.set(key, { userName: r.userName || 'Unknown User', userEmail: r.userEmail || '', items: [] });
            }
            userGroups.get(key)!.items.push(r);
          });

          const userBlocks = Array.from(userGroups.values())
            .map(({ userName, userEmail, items }) => {
              const qRows = items
                .map(
                  (r: any) => `
              <tr>
                <td>${r.questionText || ''}</td>
                <td>${r.answer ?? ''}</td>
                <td>${r.score ?? ''}</td>
                <td>${r.comment ?? ''}</td>
                <td>${r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ''}</td>
              </tr>`
                )
                .join('');

              return `
            <div class="meta"><strong>User:</strong> ${userName}${userEmail ? ` • <strong>Email:</strong> ${userEmail}` : ''}</div>
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Answer</th>
                  <th>Score</th>
                  <th>Comment</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                ${qRows || '<tr><td colspan="5" style="text-align:center;color:#6b7280">No answers</td></tr>'}
              </tbody>
            </table>`;
            })
            .join('<br />');

          return `
        <h2>${dept}</h2>
        <div class="meta">Responses: ${rows.length}</div>
        ${userBlocks || '<div class="meta">No responses</div>'}`;
        })
        .join('<hr />');

      const title = surveyDetails?.run.title || 'Compliance Survey';
      const meta = `Due: ${surveyDetails?.run?.dueDate ? formatDate(surveyDetails.run.dueDate) : 'N/A'} • Questions: ${
        surveyDetails?.questions?.length ?? 0
      } • Recipients: ${surveyDetails?.statistics?.totalRecipients ?? 0}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title} - Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
              h1 { font-size: 20px; margin: 0 0 6px 0; }
              h2 { font-size: 16px; margin: 24px 0 8px 0; }
              .meta { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
              .stats { display: flex; gap: 12px; margin: 12px 0 18px 0; color: #374151; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
              th { background: #f9fafb; }
              tr:nth-child(even) { background: #fafafa; }
              hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h1>${title} — PDF Report</h1>
            <div class="meta">${meta}</div>
            <div class="stats">
              <div><strong>Completed:</strong> ${surveyDetails?.statistics?.completedSurveys ?? 0}</div>
              <div><strong>Pending:</strong> ${surveyDetails?.statistics?.pendingSurveys ?? 0}</div>
              <div><strong>Completion Rate:</strong> ${(surveyDetails?.statistics?.completionRate ?? 0).toFixed(1)}%</div>
              <div><strong>Exported:</strong> ${new Date().toLocaleString()}</div>
            </div>
            ${deptSections || '<div class="meta">No responses available</div>'}
            <script>
              window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };
            </script>
          </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: 'Popup blocked', description: 'Allow popups to download the PDF', variant: 'destructive' });
      } else {
        win.document.write(html);
        win.document.close();
      }

    } catch (error) {
      console.error('Error generating PDF report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive'
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleShareReport = async () => {
    if (!shareEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSharing(true);
      await ComplianceService.shareSurveyReport(surveyId, shareEmail, shareMessage);
      toast({
        title: 'Success',
        description: 'Report sent successfully',
      });
      setShowShareModal(false);
      setShareEmail('');
      setShareMessage('');
    } catch (error) {
      console.error('Error sharing report:', error);
      toast({
        title: 'Error',
        description: 'Failed to share report',
        variant: 'destructive'
      });
    } finally {
      setSharing(false);
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
                  {surveyDetails.run.is_recurring && (
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="flex items-center">
                        <Clock className="h-8 w-8 text-purple-500 mr-3" />
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{surveyDetails.run.frequency}</p>
                          <p className="text-sm text-gray-600">Recurring</p>
                          {surveyDetails.run.recurring_day && (
                            <p className="text-xs text-gray-500">Day {surveyDetails.run.recurring_day}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mb-6">
                <Button
                  onClick={handleDownloadReport}
                  disabled={downloading}
                  variant="outline"
                  className="flex items-center"
                >
                  {downloading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download Report
                </Button>
                <Button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Report
                </Button>
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
                    Responses by Department
                  </button>
                  <button
                    onClick={() => setActiveTab('department')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'department'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Department Overview
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
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Responses by Department</h4>
                    <Button
                      onClick={loadSurveyResponses}
                      disabled={loadingResponses}
                      variant="outline"
                      size="sm"
                    >
                      {loadingResponses ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Load Responses
                    </Button>
                  </div>

                  {loadingResponses ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading responses...</span>
                    </div>
                  ) : surveyResponses ? (
                    <div className="space-y-6">
                      {surveyResponses.responses && surveyResponses.responses.length > 0 ? (
                        (() => {
                          // Group responses by department
                          const departmentGroups = new Map();
                          surveyResponses.responses.forEach((response: any) => {
                            const deptName = response.departmentName || 'Unknown Department';
                            if (!departmentGroups.has(deptName)) {
                              departmentGroups.set(deptName, []);
                            }
                            departmentGroups.get(deptName).push(response);
                          });

                          return Array.from(departmentGroups.entries()).map(([deptName, responses]: [string, any[]]) => (
                            <div key={deptName} className="bg-white border border-gray-200 rounded-lg">
                              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900">{deptName}</h4>
                                    <p className="text-sm text-gray-600">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => exportDepartmentToCSV(deptName)}
                                    >
                                      <Download className="h-4 w-4 mr-2" /> CSV
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => exportDepartmentToPDF(deptName)}
                                    >
                                      <FileText className="h-4 w-4 mr-2" /> PDF
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 space-y-4">
                                {responses.map((response: any) => (
                                  <div key={response.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                                    <div className="mb-3">
                                      <h5 className="font-medium text-gray-900">{response.userName}</h5>
                                      <p className="text-sm text-gray-600">{response.userEmail}</p>
                                    </div>
                                    <div className="border-t pt-3">
                                      <p className="font-medium text-gray-900 mb-2">{response.questionText}</p>
                                      <div className="space-y-2">
                                        <p className="text-sm text-gray-700">
                                          <span className="font-medium">Answer:</span> {response.answer || 'No answer provided'}
                                        </p>
                                        {response.score !== null && (
                                          <p className="text-sm text-gray-700">
                                            <span className="font-medium">Score:</span> {response.score}
                                          </p>
                                        )}
                                        {response.comment && (
                                          <p className="text-sm text-gray-700">
                                            <span className="font-medium">Comment:</span> {response.comment}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
                          <p className="text-gray-500">Survey responses will appear here once participants complete the survey.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">View Survey Responses</h3>
                      <p className="text-gray-500 mb-4">Click "Load Responses" to view individual survey responses.</p>
                      <Button onClick={loadSurveyResponses} variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        Load Responses
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'department' && (
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

      {/* Share Report Modal */}
      {showShareModal && (
        <div className="fixed z-60 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowShareModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Share Survey Report</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowShareModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleShareReport}
                    disabled={sharing || !shareEmail.trim()}
                    className="flex items-center"
                  >
                    {sharing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
