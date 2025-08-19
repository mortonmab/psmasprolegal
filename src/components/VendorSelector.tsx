import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { NewVendorModal } from './NewVendorModal';

interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

interface VendorSelectorProps {
  value: string;
  onChange: (vendorId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VendorSelector({ value, onChange, placeholder = "Search vendors...", disabled = false }: VendorSelectorProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load vendors
  const loadVendors = async (search?: string) => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/vendors${params}`);
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length > 0) {
      await loadVendors(term);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  // Handle vendor selection
  const handleVendorSelect = (vendor: Vendor) => {
    onChange(vendor.id);
    setSearchTerm(vendor.name);
    setShowDropdown(false);
  };

  // Handle new vendor creation
  const handleVendorCreated = (vendor: Vendor) => {
    setVendors(prev => [vendor, ...prev]);
    handleVendorSelect(vendor);
  };

  // Get selected vendor name
  const selectedVendor = vendors.find(v => v.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm || selectedVendor?.name || ''}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (searchTerm.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setShowDropdown(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : vendors.length > 0 ? (
            <>
              {vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                  onClick={() => handleVendorSelect(vendor)}
                >
                  <div className="font-medium">{vendor.name}</div>
                  {(vendor.contact_person || vendor.email) && (
                    <div className="text-xs text-gray-500">
                      {vendor.contact_person && `${vendor.contact_person}`}
                      {vendor.contact_person && vendor.email && ' • '}
                      {vendor.email && vendor.email}
                    </div>
                  )}
                </button>
              ))}
              <div className="border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(true)}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-green-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add new vendor
                </button>
              </div>
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No vendors found. 
              <button
                type="button"
                onClick={() => setShowVendorModal(true)}
                className="ml-1 text-blue-600 hover:text-blue-800 underline"
              >
                Add new vendor
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Vendor Modal */}
      <NewVendorModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        onVendorCreated={handleVendorCreated}
      />
    </div>
  );
}
