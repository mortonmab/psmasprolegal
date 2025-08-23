import React, { useState, useEffect } from 'react';
import { Bell, Lock, User, Mail, Database, Shield, Users, Plus, FileText } from 'lucide-react';
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



export function Settings() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('profile');
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
      id: 'profile',
      name: 'Profile Settings',
      icon: User,
      description: 'Manage your personal information and preferences'
    },
    {
      id: 'security',
      name: 'Security',
      icon: Lock,
      description: 'Password and authentication settings'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: Bell,
      description: 'Configure your notification preferences'
    },
    {
      id: 'email',
      name: 'Email Settings',
      icon: Mail,
      description: 'Manage email notifications and preferences'
    },
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
      id: 'system',
      name: 'System Settings',
      icon: Database,
      description: 'Configure system-wide settings'
    },
    {
      id: 'privacy',
      name: 'Privacy',
      icon: Shield,
      description: 'Manage your privacy settings'
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
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <input
                      type="text"
                      disabled
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              </div>
            )}
            {activeSection === 'system' && (
              <ScrapingSettings />
            )}
            {activeSection === 'users' && (
              <UsersComponent />
            )}
            {activeSection === 'contract-types' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Contract Types</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage contract types and categories</p>
                  </div>
                  <Button onClick={handleAddContractType} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Contract Type
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {loadingContractTypes ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading contract types...</div>
                    </div>
                  ) : contractTypes.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500 mb-4">No contract types found</div>
                      <Button onClick={handleAddContractType} variant="outline">
                        Create your first contract type
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contract Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Color
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {contractTypes.map(contractType => (
                              <tr key={contractType.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{contractType.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900 max-w-xs truncate">
                                    {contractType.description || 'No description'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="w-6 h-6 rounded border"
                                      style={{ backgroundColor: contractType.color }}
                                    />
                                    <span className="text-sm text-gray-900">{contractType.color}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    contractType.is_active 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {contractType.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-32">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button
                                      onClick={() => handleEditContractType(contractType)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteContractType(contractType.id)}
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeSection === 'departments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Department Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Scroll horizontally to view all columns</p>
                  </div>
                  <Button onClick={handleAddDepartment} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Department
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {loadingDepartments ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading departments...</div>
                    </div>
                  ) : departments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500 mb-4">No departments found</div>
                      <Button onClick={handleAddDepartment} variant="outline">
                        Create your first department
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Department Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Department Head
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {departments.map(dept => (
                            <tr key={dept.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {dept.description || 'Not assigned'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{dept.email || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{dept.phone || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  dept.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {dept.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-32">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    onClick={() => handleEditDepartment(dept)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteDepartment(dept.id)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </div>
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

function ScrapingSettings() {
  const [sources, setSources] = useState<ScrapingSource[]>([]);
  const [editingSource, setEditingSource] = useState<SourceFormData | null>(null);
  const [loading, setLoading] = useState(true);
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
        <h2 className="text-lg font-medium text-gray-900">Web Scraping Sources</h2>
        <button
          onClick={() => setEditingSource({
            id: '',
            name: '',
            url: '',
            type: 'case-law',
            enabled: true,
            selectors: { title: '', content: '' }
          })}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Source
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {sources.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No scraping sources configured</div>
            <button
              onClick={() => setEditingSource({
                id: '',
                name: '',
                url: '',
                type: 'case-law',
                enabled: true,
                selectors: { title: '', content: '' }
              })}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add your first source
            </button>
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
                      <Toggle
                        checked={source.enabled}
                        onCheckedChange={(checked) => handleSourceToggle(source.id, checked)}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{source.url}</p>
                    <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {source.type}
                      </span>
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
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
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
                <label className="block text-sm font-medium text-gray-700">Selectors</label>
                <div className="space-y-2">
                  <Input
                    placeholder="Title Selector"
                    value={editingSource.selectors.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, title: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Content Selector"
                    value={editingSource.selectors.content}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, content: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Date Selector (optional)"
                    value={editingSource.selectors.date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, date: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Reference Selector (optional)"
                    value={editingSource.selectors.reference || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingSource({
                      ...editingSource,
                      selectors: { ...editingSource.selectors, reference: e.target.value }
                    })}
                  />
                </div>
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