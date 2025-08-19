import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  MessageSquare,
  Send,
  FileText,
  Briefcase,
  ListTodo
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';

import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { useCases } from '../hooks/useCases';
import { useContracts } from '../hooks/useContracts';
import apiService from '../services/apiService';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  due_date: string;
  completed_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  assigned_to: string;
  assigned_by: string;
  case_id: string | null;
  contract_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name: string;
  user_email: string;
}

export function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { users } = useUsers();
  const { cases } = useCases();
  const { contracts } = useContracts();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [actualHours, setActualHours] = useState('');

  // Helper functions
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  const getCaseName = (caseId: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    return caseItem ? caseItem.case_name : 'Unknown Case';
  };

  const getContractTitle = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract ? contract.title : 'Unknown Contract';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'case_related': return <FileText className="h-4 w-4" />;
      case 'administrative': return <ListTodo className="h-4 w-4" />;
      case 'client_related': return <User className="h-4 w-4" />;
      case 'court_related': return <AlertCircle className="h-4 w-4" />;
      case 'research': return <FileText className="h-4 w-4" />;
      case 'contract_related': return <Briefcase className="h-4 w-4" />;
      default: return <ListTodo className="h-4 w-4" />;
    }
  };

  // Fetch task and comments
  useEffect(() => {
    const fetchTaskData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [taskResponse, commentsResponse] = await Promise.all([
          apiService.get<Task>(`/tasks/${id}`),
          apiService.get<TaskComment[]>(`/tasks/${id}/comments`)
        ]);
        
        setTask(taskResponse);
        setComments(commentsResponse);
        setActualHours(taskResponse.actual_hours?.toString() || '');
      } catch (error) {
        console.error('Error fetching task data:', error);
        toast({
          title: "Error",
          description: "Failed to load task details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [id, toast]);

  // Handle status updates
  const handleStatusUpdate = async (newStatus: Task['status']) => {
    if (!task) return;

    try {
      setUpdating(true);
      
      const updateData: any = { status: newStatus };
      
      // If completing the task, add completion date and actual hours
      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
        if (actualHours) {
          updateData.actual_hours = parseFloat(actualHours);
        }
      }

      const updatedTask = await apiService.put<Task>(`/tasks/${task.id}`, updateData);
      setTask(updatedTask);

      // Send notification to assigner
      try {
        await apiService.post(`/tasks/${task.id}/notifications`, {
          type: 'status_update',
          status: newStatus,
          updated_by: currentUser?.id || '6863bcc8-6851-44ce-abaf-15f8429e6956'
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      toast({
        title: "Status Updated",
        description: `Task status changed to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  // Handle task acceptance
  const handleAcceptTask = async () => {
    if (!task) return;

    try {
      setUpdating(true);
      
      const updatedTask = await apiService.put<Task>(`/tasks/${task.id}`, {
        status: 'in_progress'
      });
      setTask(updatedTask);

      // Send acceptance notification
      try {
        await apiService.post(`/tasks/${task.id}/notifications`, {
          type: 'task_accepted',
          accepted_by: currentUser?.id || '6863bcc8-6851-44ce-abaf-15f8429e6956'
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      toast({
        title: "Task Accepted",
        description: "You have accepted this task and it's now in progress.",
      });
    } catch (error) {
      console.error('Error accepting task:', error);
      toast({
        title: "Error",
        description: "Failed to accept task.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  // Handle comment submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    try {
      const comment = await apiService.post<TaskComment>(`/tasks/${task.id}/comments`, {
        comment: newComment.trim()
      });
      
      setComments([...comments, comment]);
      setNewComment('');

      // Send comment notification
      try {
        await apiService.post(`/tasks/${task.id}/notifications`, {
          type: 'comment_added',
          comment_id: comment.id,
          commented_by: currentUser?.id || '6863bcc8-6851-44ce-abaf-15f8429e6956'
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Task Not Found</h2>
          <p className="text-gray-600 mt-2">The task you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/tasks')} className="mt-4">
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const isAssignedUser = currentUser?.id === task.assigned_to;
  const isAssigner = currentUser?.id === task.assigned_by;
  const canUpdateStatus = isAssignedUser || isAssigner;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/tasks')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Tasks
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
                <p className="text-gray-600 mt-1">Task ID: {task.id}</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Details</h2>
              
              <div className="space-y-4">
                {/* Description */}
                {task.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{task.description}</p>
                  </div>
                )}

                {/* Task Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    {getTaskTypeIcon(task.task_type)}
                    <div>
                      <p className="text-sm font-medium text-gray-700">Type</p>
                      <p className="text-gray-900">{task.task_type.replace('_', ' ').toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Priority</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Due Date</p>
                      <p className="text-gray-900">
                        {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No due date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Estimated Hours</p>
                      <p className="text-gray-900">{task.estimated_hours || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Related Items */}
                {(task.case_id || task.contract_id) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Related Items</h3>
                    <div className="space-y-2">
                      {task.case_id && (
                        <div className="flex items-center space-x-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Case:</span>
                          <span className="text-blue-600 font-medium">{getCaseName(task.case_id)}</span>
                        </div>
                      )}
                      {task.contract_id && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Contract:</span>
                          <span className="text-blue-600 font-medium">{getContractTitle(task.contract_id)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Comments</h2>
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mb-6">
                <div className="flex space-x-3">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{comment.user_name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Actions</h3>
              
              <div className="space-y-3">
                {/* Accept Task */}
                {isAssignedUser && task.status === 'pending' && (
                  <Button
                    onClick={handleAcceptTask}
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Task
                  </Button>
                )}

                {/* Status Updates */}
                {canUpdateStatus && task.status !== 'completed' && task.status !== 'cancelled' && (
                  <div className="space-y-2">
                    {task.status === 'pending' && (
                      <Button
                        onClick={() => handleStatusUpdate('in_progress')}
                        disabled={updating}
                        variant="outline"
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Task
                      </Button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <Button
                        onClick={() => handleStatusUpdate('completed')}
                        disabled={updating}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}

                {/* Actual Hours Input */}
                {task.status === 'in_progress' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Hours
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={actualHours}
                      onChange={(e) => setActualHours(e.target.value)}
                      placeholder="Enter actual hours"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Task Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Assigned To</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{getUserName(task.assigned_to)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Assigned By</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{getUserName(task.assigned_by)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-gray-900 mt-1">
                    {format(new Date(task.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-gray-900 mt-1">
                    {format(new Date(task.updated_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>

                {task.completed_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Completed</p>
                    <p className="text-gray-900 mt-1">
                      {format(new Date(task.completed_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}

                {task.actual_hours && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Actual Hours</p>
                    <p className="text-gray-900 mt-1">{task.actual_hours}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
