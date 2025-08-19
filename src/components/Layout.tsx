

import React, { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { Footer } from './Footer';
import { 
  Briefcase, 
  FileText, 
  Calendar as CalendarIcon, 
  File, 
  LayoutDashboard,
  LogOut,
  Scale,
  Search,
  Settings,
  User,
  ChevronDown,
  Home,
  DollarSign,
  ListTodo,
  BookOpen,
  BarChart2,
  Brain,
  ClipboardCheck,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import { Breadcrumbs } from './Breadcrumbs';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Define interfaces for navigation items
interface NavigationChild {
  name: string;
  href: string;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavigationChild[];
  current?: boolean;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);



  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Cases', href: '/cases', icon: Briefcase },
    { name: 'AI Assistant', href: '/ai-assistant', icon: Brain },
    { 
      name: 'Contracts', 
      icon: FileText,
      children: [
        { name: 'Contracts', href: '/contracts' },
        { name: 'Vendors', href: '/vendors' }
      ]
    },
    { name: 'Documents', href: '/documents', icon: File },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Budget', href: '/budget', icon: DollarSign },
    { name: 'Tasks', href: '/tasks', icon: ListTodo },
    {
      name: 'Compliance',
      href: '/compliance',
      icon: Shield,
      current: location.pathname === '/compliance'
    },
    { name: 'Legal Resources', href: '/resources', icon: BookOpen },
    { name: 'Reports', href: '/reports', icon: BarChart2 },
    { name: 'Settings', href: '/settings', icon: Settings }
  ];

  const userNavigation = [
    { name: 'My Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (item: NavigationItem) => 
    item.children?.some((child: NavigationChild) => location.pathname === child.href);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Search */}
            <div className="flex-1 flex items-center justify-center px-2">
              <div className="max-w-lg w-full">
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="search"
                    name="search"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search"
                    type="search"
                  />
                </div>
              </div>
            </div>

            {/* Profile dropdown */}
            <div className="flex items-center">
              <Menu as="div" className="ml-3 relative">
                <div>
                  <Menu.Button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <span className="sr-only">Open user menu</span>
                    <img
                      className="h-8 w-8 rounded-full"
                      src={`https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=random`}
                      alt=""
                    />
                    <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                  </Menu.Button>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {userNavigation.map((item) => (
                      <Menu.Item key={item.name}>
                        {({ active }) => (
                          <Link
                            to={item.href}
                            className={classNames(
                              active ? 'bg-gray-100' : '',
                              'px-4 py-2 text-sm text-gray-700 flex items-center'
                            )}
                          >
                            <item.icon className="mr-3 h-4 w-4 text-gray-400" />
                            {item.name}
                          </Link>
                        )}
                      </Menu.Item>
                    ))}
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={signOut}
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            'w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center'
                          )}
                        >
                          <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow pt-2 overflow-y-auto bg-white border-r">
              <div className="flex-grow flex flex-col">
                <div className="flex flex-col flex-grow border-r border-gray-200 bg-white pt-2 pb-4 overflow-y-auto">
                  <div className="flex flex-col items-center flex-shrink-0 px-4 pb-2">
                    <img 
                      src="/images/logo.png" 
                      alt="Prolegal" 
                      className="h-32 w-auto"
                    />
                  </div>
                  <nav className="mt-2 flex-1 px-2 space-y-0.5">
                    {navigation.map((item) => 
                      !item.children ? (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={classNames(
                            isActive(item.href)
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                          )}
                        >
                          <item.icon
                            className={classNames(
                              isActive(item.href) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                              'mr-3 h-6 w-6'
                            )}
                          />
                          {item.name}
                        </Link>
                      ) : (
                        <div key={item.name}>
                          <button
                            onClick={() => setOpenDropdown(openDropdown === item.name ? null : item.name)}
                            className={classNames(
                              isParentActive(item)
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                              'group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full justify-between'
                            )}
                          >
                            <div className="flex items-center">
                              <item.icon
                                className={classNames(
                                  isParentActive(item) ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                                  'mr-3 h-6 w-6'
                                )}
                              />
                              {item.name}
                            </div>
                            <ChevronDown
                              className={classNames(
                                'h-5 w-5 transform transition-transform duration-200',
                                openDropdown === item.name ? 'rotate-180' : ''
                              )}
                            />
                          </button>
                          {openDropdown === item.name && (
                            <div className="ml-8 mt-1 space-y-1">
                              {item.children.map((child: any) => (
                                <Link
                                  key={child.name}
                                  to={child.href}
                                  className={classNames(
                                    isActive(child.href)
                                      ? 'bg-gray-100 text-gray-900'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                                  )}
                                >
                                  {child.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Breadcrumbs />
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}