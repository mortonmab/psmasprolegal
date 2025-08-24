import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Download, 
  Filter, 
  Calendar, 
  RefreshCw, 
  FileText, 
  FileSpreadsheet,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { reportsService } from '../services/reportsService';

interface ReportData {
  id: string;
  title: string;
  type: 'case' | 'financial' | 'activity' | 'performance' | 'compliance';
  description: string;
  data: any[];
  columns: string[];
  lastGenerated: string;
  period: string;
  filters: ReportFilter[];
}

interface ReportFilter {
  id: string;
  name: string;
  type: 'select' | 'date' | 'text' | 'number';
  options?: string[];
  value: any;
}

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'case' | 'financial' | 'activity' | 'performance' | 'compliance';
  icon: React.ComponentType<{ className?: string }>;
  defaultFilters: ReportFilter[];
}

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [showDataPreview, setShowDataPreview] = useState(false);
  const { toast } = useToast();

  // Available report configurations
  const reportConfigs: ReportConfig[] = [
    {
      id: 'case-summary',
      name: 'Case Summary Report',
      description: 'Overview of all cases with status, progress, and key metrics',
      type: 'case',
      icon: FileText,
      defaultFilters: [
        { id: 'status', name: 'Status', type: 'select', options: ['All', 'Active', 'Closed', 'Pending'], value: 'All' },
        { id: 'department', name: 'Department', type: 'select', options: ['All', 'Litigation', 'Corporate', 'Family'], value: 'All' },
        { id: 'assigned_to', name: 'Assigned To', type: 'select', options: ['All', 'John Doe', 'Jane Smith'], value: 'All' }
      ]
    },
    {
      id: 'contracts-summary',
      name: 'Contracts Summary Report',
      description: 'Comprehensive overview of all contracts with vendor details and financial information',
      type: 'contracts',
      icon: FileText,
      defaultFilters: [
        { id: 'status', name: 'Status', type: 'select', options: ['All', 'Active', 'Expired', 'Draft', 'Terminated'], value: 'All' },
        { id: 'type', name: 'Contract Type', type: 'select', options: ['All', 'Service', 'Goods', 'Consulting', 'Employment', 'Lease'], value: 'All' },
        { id: 'vendor', name: 'Vendor', type: 'select', options: ['All'], value: 'All' }
      ]
    },
    {
      id: 'financial-summary',
      name: 'Financial Summary Report',
      description: 'Comprehensive financial overview including billing, expenses, and revenue',
      type: 'financial',
      icon: DollarSign,
      defaultFilters: [
        { id: 'period', name: 'Period', type: 'select', options: ['This Month', 'Last Month', 'This Quarter', 'This Year'], value: 'This Month' },
        { id: 'type', name: 'Type', type: 'select', options: ['All', 'Income', 'Expenses', 'Profit'], value: 'All' }
      ]
    },
    {
      id: 'user-activity',
      name: 'User Activity Report',
      description: 'Detailed log of user actions, system usage, and productivity metrics',
      type: 'activity',
      icon: Users,
      defaultFilters: [
        { id: 'user', name: 'User', type: 'select', options: ['All', 'John Doe', 'Jane Smith'], value: 'All' },
        { id: 'action', name: 'Action', type: 'select', options: ['All', 'Login', 'Case Update', 'Document Upload'], value: 'All' }
      ]
    },
    {
      id: 'performance-metrics',
      name: 'Performance Metrics Report',
      description: 'Key performance indicators, productivity metrics, and efficiency analysis',
      type: 'performance',
      icon: TrendingUp,
      defaultFilters: [
        { id: 'metric', name: 'Metric', type: 'select', options: ['All', 'Cases Closed', 'Revenue', 'Client Satisfaction'], value: 'All' },
        { id: 'timeframe', name: 'Timeframe', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Quarterly'], value: 'Monthly' }
      ]
    },
    {
      id: 'compliance-report',
      name: 'Compliance Report',
      description: 'Compliance status, deadlines, and regulatory requirements tracking',
      type: 'compliance',
      icon: CheckCircle,
      defaultFilters: [
        { id: 'status', name: 'Status', type: 'select', options: ['All', 'Compliant', 'Non-Compliant', 'Pending'], value: 'All' },
        { id: 'category', name: 'Category', type: 'select', options: ['All', 'Legal', 'Financial', 'Operational'], value: 'All' }
      ]
    }
  ];

  // Fetch real data from database
  const fetchReportData = async (reportId: string, filters: Record<string, any>) => {
    try {
      let result;
      const filterParams = {
        ...filters,
        date_from: dateRange.from,
        date_to: dateRange.to,
        page: 1,
        limit: 50
      };

      switch (reportId) {
        case 'case-summary':
          result = await reportsService.getCaseSummaryReport(filterParams);
          break;
        case 'contracts-summary':
          result = await reportsService.getContractsReport(filterParams);
          break;
        case 'financial-summary':
          result = await reportsService.getFinancialSummaryReport(filterParams);
          break;
        case 'user-activity':
          result = await reportsService.getUserActivityReport(filterParams);
          break;
        case 'performance-metrics':
          result = await reportsService.getPerformanceMetricsReport(filterParams);
          break;
        case 'compliance-report':
          result = await reportsService.getComplianceReport(filterParams);
          break;
        default:
          return [];
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive"
      });
      return [];
    }
  };

  const handleReportSelect = async (reportId: string) => {
    setSelectedReport(reportId);
    setLoading(true);
    
    try {
      const data = await fetchReportData(reportId, filters);
      setReportData(data);
    } catch (error) {
      console.error('Error selecting report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterId: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast({
        title: "Error",
        description: "Please select a report type first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const data = await fetchReportData(selectedReport, filters);
      setReportData(data);
      toast({
        title: "Success",
        description: "Report generated successfully"
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!selectedReport || reportData.length === 0) {
      toast({
        title: "Error",
        description: "No data to export. Please generate a report first.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const filterParams = {
        ...filters,
        date_from: dateRange.from,
        date_to: dateRange.to
      };

      const blob = await reportsService.exportReport(selectedReport, format, filterParams);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport.replace('-', '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Report exported as ${format.toUpperCase()} successfully`
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: `Failed to export report as ${format.toUpperCase()}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  const getReportIcon = (type: string) => {
    const config = reportConfigs.find(c => c.id === type);
    return config ? config.icon : FileText;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'compliant':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'closed':
        return 'text-gray-600 bg-gray-100';
      case 'non-compliant':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Generate and export comprehensive reports</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowDataPreview(!showDataPreview)}
            variant="outline"
            disabled={reportData.length === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showDataPreview ? 'Hide' : 'Show'} Data
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedReport || loading}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select Report Type</h2>
            <div className="space-y-3">
              {reportConfigs.map((config) => {
                const Icon = config.icon;
                return (
                  <button
                    key={config.id}
                    onClick={() => handleReportSelect(config.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedReport === config.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">{config.name}</h3>
                        <p className="text-sm text-gray-500">{config.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters and Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          {selectedReport && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Filters</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>

              {showFilters && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <div className="flex space-x-2">
                        <Input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                          className="flex-1"
                        />
                        <span className="flex items-center text-gray-500">to</span>
                        <Input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic filters based on selected report */}
                  {selectedReport && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reportConfigs
                        .find(config => config.id === selectedReport)
                        ?.defaultFilters.map(filter => (
                          <div key={filter.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {filter.name}
                            </label>
                            {filter.type === 'select' ? (
                              <select
                                value={filters[filter.id] || filter.value}
                                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {filter.options?.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={filter.type}
                                value={filters[filter.id] || ''}
                                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                                placeholder={`Enter ${filter.name.toLowerCase()}`}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {selectedReport && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      {reportConfigs.find(config => config.id === selectedReport)?.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {reportData.length} records found
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleExport('csv')}
                      variant="outline"
                      size="sm"
                      disabled={reportData.length === 0 || loading}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => handleExport('pdf')}
                      variant="outline"
                      size="sm"
                      disabled={reportData.length === 0 || loading}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-500">Generating report...</p>
                </div>
              ) : reportData.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
                  <p className="text-gray-500">Generate a report to see data</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {showDataPreview ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(reportData[0]).map(header => (
                            <th
                              key={header}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.entries(row).map(([key, value]) => (
                              <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {key === 'status' ? (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value as string)}`}>
                                    {value as string}
                                  </span>
                                ) : (
                                  value as string
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                                     ) : (
                     <div className="p-6">
                       <div className="space-y-3">
                         {reportData.slice(0, 10).map((row, index) => (
                           <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                               {Object.entries(row).slice(0, 6).map(([key, value]) => (
                                 <div key={key} className="flex flex-col">
                                   <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                     {key.replace(/_/g, ' ')}
                                   </span>
                                   <span className="text-sm text-gray-900">
                                     {key === 'status' ? (
                                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value as string)}`}>
                                         {value as string}
                                       </span>
                                     ) : (
                                       value as string
                                     )}
                                   </span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         ))}
                       </div>
                       {reportData.length > 10 && (
                         <div className="mt-4 text-center">
                           <p className="text-sm text-gray-500">
                             Showing 10 of {reportData.length} records. 
                             <button
                               onClick={() => setShowDataPreview(true)}
                               className="text-blue-600 hover:text-blue-800 ml-1"
                             >
                               View all data
                             </button>
                           </p>
                         </div>
                       )}
                     </div>
                   )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 