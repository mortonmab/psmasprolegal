import React, { useState } from 'react';
import { Plus, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

interface ComplianceArea {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  expiryDate: string;
  renewalDate: string;
  status: 'active' | 'expired' | 'pending';
  priority: 'high' | 'medium' | 'low';
}

export function GeneralCompliance() {
  const [complianceAreas, setComplianceAreas] = useState<ComplianceArea[]>([]);
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newArea, setNewArea] = useState<Partial<ComplianceArea>>({
    status: 'active',
    priority: 'medium'
  });

  const handleAddArea = () => {
    if (!newArea.name || !newArea.dueDate) return;

    const area: ComplianceArea = {
      id: `area-${Date.now()}`,
      name: newArea.name,
      description: newArea.description || '',
      dueDate: newArea.dueDate,
      expiryDate: newArea.expiryDate || '',
      renewalDate: newArea.renewalDate || '',
      status: newArea.status as 'active' | 'expired' | 'pending',
      priority: newArea.priority as 'high' | 'medium' | 'low'
    };

    setComplianceAreas([...complianceAreas, area]);
    setIsAddingArea(false);
    setNewArea({ status: 'active', priority: 'medium' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">General Compliance Areas</h2>
        <Dialog open={isAddingArea} onOpenChange={setIsAddingArea}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Compliance Area
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Compliance Area</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={newArea.name || ''}
                  onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  placeholder="Compliance Area Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <Input
                  value={newArea.description || ''}
                  onChange={(e) => setNewArea({ ...newArea, description: e.target.value })}
                  placeholder="Description"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <Input
                    type="date"
                    value={newArea.dueDate || ''}
                    onChange={(e) => setNewArea({ ...newArea, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <Input
                    type="date"
                    value={newArea.expiryDate || ''}
                    onChange={(e) => setNewArea({ ...newArea, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Renewal Date</label>
                  <Input
                    type="date"
                    value={newArea.renewalDate || ''}
                    onChange={(e) => setNewArea({ ...newArea, renewalDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newArea.status}
                    onChange={(e) => setNewArea({ ...newArea, status: e.target.value as ComplianceArea['status'] })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={newArea.priority}
                    onChange={(e) => setNewArea({ ...newArea, priority: e.target.value as ComplianceArea['priority'] })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleAddArea} className="w-full">
                Add Compliance Area
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {complianceAreas.map((area) => (
            <li key={area.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{area.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{area.description}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Due: {new Date(area.dueDate).toLocaleDateString()}</span>
                    </div>
                    {area.expiryDate && (
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Expires: {new Date(area.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${area.priority === 'high' ? 'bg-red-100 text-red-800' : 
                      area.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}
                  `}>
                    {area.priority}
                  </div>
                  <div className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${area.status === 'active' ? 'bg-green-100 text-green-800' : 
                      area.status === 'expired' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}
                  `}>
                    {area.status}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 