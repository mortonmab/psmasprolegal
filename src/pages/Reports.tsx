import React, { useState } from 'react';
import { BarChart2, Download, Filter, Calendar, RefreshCw } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  type: 'case' | 'financial' | 'activity' | 'performance';
  description: string;
  lastGenerated: string;
  period: string;
}

export function Reports() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const reports: Report[] = [
    {
      id: '1',
      title: 'Case Progress Report',
      type: 'case',
      description: 'Overview of all case statuses and progress',
      lastGenerated: '2024-01-20',
      period: 'Monthly'
    },
    {
      id: '2',
      title: 'Financial Summary',
      type: 'financial',
      description: 'Summary of billing and expenses',
      lastGenerated: '2024-01-19',
      period: 'Weekly'
    },
    {
      id: '3',
      title: 'User Activity Log',
      type: 'activity',
      description: 'Detailed log of user actions and system usage',
      lastGenerated: '2024-01-20',
      period: 'Daily'
    },
    {
      id: '4',
      title: 'Performance Metrics',
      type: 'performance',
      description: 'Key performance indicators and metrics',
      lastGenerated: '2024-01-15',
      period: 'Monthly'
    }
  ];

  const filteredReports = reports.filter(report => 
    selectedType === 'all' || report.type === selectedType
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          <BarChart2 className="h-4 w-4 mr-2" />
          Generate New Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Types</option>
              <option value="case">Case Reports</option>
              <option value="financial">Financial Reports</option>
              <option value="activity">Activity Reports</option>
              <option value="performance">Performance Reports</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{report.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Last generated: {report.lastGenerated}
                </div>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 