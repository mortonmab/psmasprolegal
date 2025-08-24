import React, { useState, useEffect } from 'react';
import { Users, Plus, FileText, Globe, RefreshCw, Play, Pause } from 'lucide-react';
import { scrapingService, ScrapingSource } from '../services/scrapingService';
import { Toggle } from '../components/ui/toggle';
import { Input } from '../components/ui/input';
import { Users as UsersComponent } from '../components/settings/Users';
import { DepartmentModal } from '../components/DepartmentModal';
import { ContractTypeModal } from '../components/ContractTypeModal';
import { departmentService } from '../services/departmentService';
import { contractTypeService, ContractType } from '../services/contractTypeService';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';
import type { Department } from '../lib/types';


interface SettingsSection {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface SourceFormData {
  id: string;
  name: string;
  url: string;
  type: 'case-law' | 'legislation' | 'regulation' | 'gazette';
  enabled: boolean;
  selectors: {
    title: string;
    content: string;
    date?: string;
    reference?: string;
  };
}

interface ScrapingJob {
  id: string;
  sourceId: string;
  sourceName: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export function Settings() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loadingContractTypes, setLoadingContractTypes] = useState(false);
  const [isContractTypeModalOpen, setIsContractTypeModalOpen] = useState(false);
  const [editingContractType, setEditingContractType] = useState<ContractType | null>(null);

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const data = await departmentService.getAllDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive"
      });
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'departments') {
      fetchDepartments();
    }
  }, [activeSection]);

  // Fetch contract types from API
  const fetchContractTypes = async () => {
    try {
      setLoadingContractTypes(true);
      const data = await contractTypeService.getAllContractTypes();
      setContractTypes(data);
    } catch (error) {
      console.error('Error fetching contract types:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contract types",
        variant: "destructive"
      });
    } finally {
      setLoadingContractTypes(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'contract-types') {
      fetchContractTypes();
    }
  }, [activeSection]);

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    setIsDepartmentModalOpen(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setIsDepartmentModalOpen(true);
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    
    try {
      await departmentService.deleteDepartment(id);
      toast({
        title: "Success",
        description: "Department deleted successfully"
      });
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive"
      });
    }
  };

  const handleDepartmentSuccess = () => {
    fetchDepartments();
  };

  const handleAddContractType = () => {
    setEditingContractType(null);
    setIsContractTypeModalOpen(true);
  };

  const handleEditContractType = (contractType: ContractType) => {
    setEditingContractType(contractType);
    setIsContractTypeModalOpen(true);
  };

  const handleDeleteContractType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract type?')) return;
    
    try {
      await contractTypeService.deleteContractType(id);
      toast({
        title: "Success",
        description: "Contract type deleted successfully"
      });
      fetchContractTypes();
    } catch (error) {
      console.error('Error deleting contract type:', error);
      toast({
        title: "Error",
        description: "Failed to delete contract type",
        variant: "destructive"
      });
    }
  };

  const handleContractTypeSuccess = () => {
    fetchContractTypes();
  };

  const sections: SettingsSection[] = [
    {
      id: 'departments',
      name: 'Department Settings',
      icon: Users,
      description: 'Manage departments and department heads'
    },
    {
      id: 'contract-types',
      name: 'Contract Types',
      icon: FileText,
      description: 'Manage contract types and categories'
    },
    {
      id: 'sources',
      name: 'Sources',
      icon: Globe,
      description: 'Configure web scraping sources and manage data collection'
    },
    {
      id: 'users',
      name: 'Users',
      icon: Users,
      description: 'Manage system users and roles'
    }
  ];

  return (
    <div className="h-full space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

      <div className="bg-white rounded-lg shadow h-[calc(100vh-12rem)]">
        <div className="grid grid-cols-4 h-full">
          {/* Sidebar */}
          <div className="col-span-1 border-r border-gray-200">
            <nav className="sticky top-0 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <section.icon className={`h-5 w-5 mr-3 ${
                    activeSection === section.id ? 'text-blue-700' : 'text-gray-400'
                  }`} />
                  {section.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="col-span-3 p-6 overflow-y-auto">
            {activeSection === 'sources' && (
              <SourcesSettings />
            )}
            {activeSection === 'users' && (
              <UsersComponent />
            )}
            {activeSection === 'contract-types' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Contract Types</h2>
                    <p className="text-sm text-gray-500">Manage contract types and categories used throughout the system</p>
                  </div>
                  <Button onClick={handleAddContractType}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contract Type
                  </Button>
                </div>

                {loadingContractTypes ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading contract types...</div>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {contractTypes.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">No contract types configured</div>
                        <Button onClick={handleAddContractType}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first contract type
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {contractTypes.map((contractType) => (
                              <tr key={contractType.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {contractType.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {contractType.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleEditContractType(contractType)}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteContractType(contractType.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {activeSection === 'departments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Department Settings</h2>
                    <p className="text-sm text-gray-500">Manage departments and department heads</p>
                  </div>
                  <Button onClick={handleAddDepartment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </div>

                {loadingDepartments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading departments...</div>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {departments.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">No departments configured</div>
                        <Button onClick={handleAddDepartment}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first department
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Head
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {departments.map((department) => (
                              <tr key={department.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {department.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {department.head_name || 'Not assigned'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleEditDepartment(department)}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDepartment(department.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Modal */}
      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        department={editingDepartment}
        onSuccess={handleDepartmentSuccess}
      />

      {/* Contract Type Modal */}
      <ContractTypeModal
        isOpen={isContractTypeModalOpen}
        onClose={() => setIsContractTypeModalOpen(false)}
        contractType={editingContractType}
        onSuccess={handleContractTypeSuccess}
      />
    </div>
  );
}

function SourcesSettings() {
  const [sources, setSources] = useState<ScrapingSource[]>([]);
  const [editingSource, setEditingSource] = useState<SourceFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrapingJobs, setScrapingJobs] = useState<ScrapingJob[]>([]);
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const { toast } = useToast();

  // Fetch sources on component mount
  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const sourcesData = await scrapingService.getSources();
      setSources(sourcesData);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast({
        title: "Error",
        description: "Failed to fetch scraping sources",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceToggle = async (sourceId: string, enabled: boolean) => {
    try {
      const updatedSource = await scrapingService.updateSource(sourceId, { enabled });
      if (updatedSource) {
        setSources(prev => prev.map(s => s.id === sourceId ? updatedSource : s));
        toast({
          title: "Success",
          description: `Source ${enabled ? 'enabled' : 'disabled'} successfully`
        });
      }
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: "Error",
        description: "Failed to update source",
        variant: "destructive"
      });
    }
  };

  const handleSourceEdit = async (source: SourceFormData) => {
    try {
      let updatedSource: ScrapingSource | null = null;
      
      if (source.id) {
        // Update existing source
        updatedSource = await scrapingService.updateSource(source.id, source);
      } else {
        // Create new source
        updatedSource = await scrapingService.createSource({
          name: source.name,
          url: source.url,
          type: source.type,
          enabled: source.enabled,
          selectors: source.selectors
        });
      }
      
      if (updatedSource) {
        await fetchSources(); // Refresh the list
        setEditingSource(null);
        toast({
          title: "Success",
          description: `Source ${source.id ? 'updated' : 'created'} successfully`
        });
      }
    } catch (error) {
      console.error('Error saving source:', error);
      toast({
        title: "Error",
        description: "Failed to save source",
        variant: "destructive"
      });
    }
  };

  const handleSourceDelete = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    
    try {
      const success = await scrapingService.deleteSource(sourceId);
      if (success) {
        await fetchSources(); // Refresh the list
        toast({
          title: "Success",
          description: "Source deleted successfully"
        });
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  };

  const handleScrapeSource = async (sourceId: string, sourceName: string) => {
    try {
      const job = await scrapingService.scrapeContent(sourceId);
      
      if (job && job.status === 'queued') {
        const newJob: ScrapingJob = {
          id: job.jobId,
          sourceId,
          sourceName,
          status: 'queued',
          progress: 0,
          startedAt: new Date().toISOString()
        };
        
        setScrapingJobs(prev => [...prev, newJob]);
        
        // Start polling for job status
        pollJobStatus(job.jobId);
        
        toast({
          title: "Success",
          description: `Scraping job started for ${sourceName}`
        });
      }
    } catch (error) {
      console.error('Error starting scraping job:', error);
      toast({
        title: "Error",
        description: "Failed to start scraping job",
        variant: "destructive"
      });
    }
  };

  const handleScrapeAll = async () => {
    setIsScrapingAll(true);
    const enabledSources = sources.filter(s => s.enabled);
    
    try {
      for (const source of enabledSources) {
        await handleScrapeSource(source.id, source.name);
        // Small delay between jobs to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast({
        title: "Success",
        description: `Started scraping for ${enabledSources.length} sources`
      });
    } catch (error) {
      console.error('Error starting bulk scraping:', error);
      toast({
        title: "Error",
        description: "Failed to start bulk scraping",
        variant: "destructive"
      });
    } finally {
      setIsScrapingAll(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await scrapingService.getScrapingStatus(jobId);
        
        setScrapingJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                status: status.status, 
                progress: status.progress || job.progress,
                completedAt: status.status === 'completed' ? new Date().toISOString() : job.completedAt,
                error: status.error
              }
            : job
        ));
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          
          if (status.status === 'completed') {
            toast({
              title: "Success",
              description: "Scraping job completed successfully"
            });
          } else {
            toast({
              title: "Error",
              description: `Scraping job failed: ${status.error || 'Unknown error'}`,
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <Pause className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-medium text-gray-900">Web Scraping Sources</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading sources...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Web Scraping Sources</h2>
          <p className="text-sm text-gray-500">Configure and manage web scraping sources for legal resources</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleScrapeAll}
            disabled={isScrapingAll || sources.filter(s => s.enabled).length === 0}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isScrapingAll ? 'animate-spin' : ''}`} />
            Scrape All Enabled
          </Button>
          <Button
            onClick={() => setEditingSource({
              id: '',
              name: '',
              url: '',
              type: 'case-law',
              enabled: true,
              selectors: { title: '', content: '' }
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Active Scraping Jobs */}
      {scrapingJobs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Active Scraping Jobs</h3>
          <div className="space-y-2">
            {scrapingJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between bg-white rounded p-3">
                <div className="flex items-center space-x-3">
                  {getJobStatusIcon(job.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.sourceName}</p>
                    <p className="text-xs text-gray-500">
                      {job.status === 'queued' && 'Queued for processing'}
                      {job.status === 'in_progress' && `Processing... ${job.progress}%`}
                      {job.status === 'completed' && 'Completed successfully'}
                      {job.status === 'failed' && `Failed: ${job.error}`}
                    </p>
                  </div>
                </div>
                {job.status === 'in_progress' && (
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {sources.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No scraping sources configured</div>
            <Button
              onClick={() => setEditingSource({
                id: '',
                name: '',
                url: '',
                type: 'case-law',
                enabled: true,
                selectors: { title: '', content: '' }
              })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add your first source
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sources.map(source => (
              <li key={source.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {source.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Toggle
                          checked={source.enabled}
                          onCheckedChange={(checked) => handleSourceToggle(source.id, checked)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScrapeSource(source.id, source.name)}
                          disabled={!source.enabled || scrapingJobs.some(j => j.sourceId === source.id && j.status === 'in_progress')}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Scrape
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{source.url}</p>
                    <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {source.type}
                      </span>
                      {source.enabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => setEditingSource(source)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSourceDelete(source.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit/Add Source Modal */}
      {editingSource && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSource.id ? 'Edit Source' : 'Add Source'}
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={editingSource.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                    ...editingSource,
                    name: e.target.value
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">URL</label>
                <Input
                  value={editingSource.url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                    ...editingSource,
                    url: e.target.value
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={editingSource.type}
                  onChange={(e) => setEditingSource({
                    ...editingSource,
                    type: e.target.value as ScrapingSource['type']
                  })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="case-law">Case Law</option>
                  <option value="legislation">Legislation</option>
                  <option value="regulation">Regulation</option>
                  <option value="gazette">Gazette</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">CSS Selectors</label>
                <div className="space-y-2">
                  <Input
                    placeholder="Title Selector (e.g., .title, h1, .judgment-title)"
                    value={editingSource.selectors.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, title: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Content Selector (e.g., .content, .body, .judgment-body)"
                    value={editingSource.selectors.content}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, content: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Date Selector (optional, e.g., .date, .published-date)"
                    value={editingSource.selectors.date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, date: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Reference Selector (optional, e.g., .reference, .citation)"
                    value={editingSource.selectors.reference || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, reference: e.target.value }
                    })}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  CSS selectors help the system extract specific content from the website. 
                  Use browser developer tools to find the correct selectors.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingSource(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSourceEdit(editingSource)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {editingSource.id ? 'Save Changes' : 'Add Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 