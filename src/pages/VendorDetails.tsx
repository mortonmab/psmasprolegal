import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  Phone,
  MapPin,
  Globe,
  Users,
  Edit2,
  Link as LinkIcon,
  Save,
  X
} from 'lucide-react';

type TabType = 'details' | 'contracts' | 'contacts';

export function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - In a real app, this would come from an API
  const vendorDetails = {
    id: Number(id),
    name: 'XYZ Corporation',
    type: 'Service Provider',
    status: 'active',
    contactPerson: 'John Smith',
    email: 'john@xyz.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Ave, Suite 100, New York, NY 10001',
    website: 'www.xyzcorp.com',
    taxId: '12-3456789',
    registrationDate: '2024-01-15',
    industry: 'Technology',
    description: 'Leading provider of software solutions and IT services.',
    contacts: [
      { id: 1, name: 'John Smith', role: 'Primary Contact', email: 'john@xyz.com', phone: '+1 (555) 123-4567' },
      { id: 2, name: 'Sarah Johnson', role: 'Billing Contact', email: 'sarah@xyz.com', phone: '+1 (555) 123-4568' }
    ],
    contracts: [
      {
        id: 1,
        title: 'Software Development Services',
        type: 'Service Agreement',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        value: '$50,000'
      },
      {
        id: 2,
        title: 'IT Support Agreement',
        type: 'Service Agreement',
        status: 'completed',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        value: '$35,000'
      }
    ]
  };

  const tabs = [
    { id: 'details', name: 'Vendor Details', icon: Building2 },
    { id: 'contracts', name: 'Contracts', icon: FileText },
    { id: 'contacts', name: 'Contacts', icon: Users }
  ];

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-4 flex-1">
                    {isEditing ? (
                      <form className="space-y-4" onSubmit={(e) => {
                        e.preventDefault();
                        setIsEditing(false);
                      }}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Company Name</label>
                            <input
                              type="text"
                              defaultValue={vendorDetails.name}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <input
                              type="text"
                              defaultValue={vendorDetails.type}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                          {/* Add more form fields */}
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Company Name</h3>
                            <p className="mt-1 text-sm text-gray-900">{vendorDetails.name}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Type</h3>
                            <p className="mt-1 text-sm text-gray-900">{vendorDetails.type}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Status</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              vendorDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {vendorDetails.status}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Industry</h3>
                            <p className="mt-1 text-sm text-gray-900">{vendorDetails.industry}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Tax ID</h3>
                            <p className="mt-1 text-sm text-gray-900">{vendorDetails.taxId}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Registration Date</h3>
                            <p className="mt-1 text-sm text-gray-900">{vendorDetails.registrationDate}</p>
                          </div>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h3>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Mail className="h-4 w-4 mr-2" />
                                {vendorDetails.email}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Phone className="h-4 w-4 mr-2" />
                                {vendorDetails.phone}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="h-4 w-4 mr-2" />
                                {vendorDetails.address}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Globe className="h-4 w-4 mr-2" />
                                {vendorDetails.website}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-sm font-medium text-gray-500 mb-3">Description</h3>
                          <p className="text-sm text-gray-900">{vendorDetails.description}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'contracts':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Contracts</h3>
                <button className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                  New Contract
                </button>
              </div>
              <div className="mt-2 flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Contract</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Duration</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {vendorDetails.contracts.map((contract) => (
                          <tr 
                            key={contract.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/contracts/${contract.id}`)}
                          >
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-blue-600">
                              {contract.title}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {contract.type}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {contract.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {contract.startDate} - {contract.endDate}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                              {contract.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Contact Persons</h3>
                <button className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                  Add Contact
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {vendorDetails.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
                  >
                    <div className="flex-shrink-0">
                      <span className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="focus:outline-none">
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.role}</p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                        <p className="text-sm text-gray-500">{contact.phone}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <button
            onClick={() => navigate('/vendors')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Vendors
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{vendorDetails.name}</h1>
              <p className="mt-2 text-sm text-gray-700">
                Vendor ID: {vendorDetails.id}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={classNames(
                  tab.id === activeTab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm'
                )}
              >
                <Icon className={classNames(
                  tab.id === activeTab ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                  '-ml-0.5 mr-2 h-5 w-5'
                )} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
} 