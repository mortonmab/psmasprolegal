import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, ChevronDown, Clock, ArrowRight, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ComplianceRunForm } from '../components/compliance/ComplianceRunForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { DepartmentCompliance } from '../components/compliance/DepartmentCompliance';
import { GeneralCompliance } from '../components/compliance/GeneralCompliance';
import { departmentService } from '../services/departmentService';
import { useToast } from '../components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface Department {
  id: string;
  name: string;
}

interface ComplianceRun {
  id: string;
  title: string;
  description: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'annually';
  departments: Department[];
  questions: ComplianceQuestion[];
  startDate: Date;
  dueDate: Date;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
}

interface ComplianceQuestion {
  id: string;
  question: string;
  type: 'text' | 'yesno' | 'multiple' | 'file';
  required: boolean;
  options?: string[];
}

interface ComplianceFilters {
  search: string;
  department: string | 'all';
  status: string;
}

export function Compliance() {
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [activeTab, setActiveTab] = useState('department');
  const [filters, setFilters] = useState<ComplianceFilters>({
    search: '',
    department: 'all',
    status: ''
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const depts = await departmentService.getAllDepartments();
      setDepartments(depts);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load departments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    // ... existing submission logic
    
    // Generate unique survey URL
    const surveyUrl = `${window.location.origin}/compliance-survey/${surveyId}`;
    
    // Send email to department heads
    const emailContent = `
      Please complete the compliance survey: ${surveyUrl}
      
      This survey is due by: ${dueDate}
    `;
    
    // ... send email logic
  };

  return (
    <div className="h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Compliance Management</h1>
      </div>

      {/* Search and Filters - Moved to top */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search compliance runs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters({ ...filters, search: '' })}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Department Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Department:</span>
            <Select value={filters.department} onValueChange={(value) => setFilters({ ...filters, department: value })}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={loading ? "Loading..." : "All Departments"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filters.search || filters.department !== 'all') && (
              <button
                onClick={() => setFilters({ search: '', department: 'all', status: '' })}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="department" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="department">Department Compliance</TabsTrigger>
          <TabsTrigger value="general">General Compliance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="department" className="mt-6">
          <DepartmentCompliance 
            searchQuery={filters.search}
            selectedDepartment={filters.department}
          />
        </TabsContent>
        
        <TabsContent value="general" className="mt-6">
          <GeneralCompliance />
        </TabsContent>
      </Tabs>



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
                      onSubmit={(data) => {
                        console.log('Form submitted:', data);
                        setShowNewRunModal(false);
                        // Handle form submission
                      }}
                      onCancel={() => setShowNewRunModal(false)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 