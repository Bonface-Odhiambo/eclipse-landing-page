// 1. Imports
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
ResponsiveContainer,} from 'recharts';
import { mockDashboardData } from '../mockdata';
import {
  Home, FileText, Wallet2, User, Settings, 
 MessageCircle, AlertTriangle, Ban, Menu as MenuIcon, 
  Bell, LogOut, ChevronDown, Send, X, 
 CheckCircle, UserPlus, DollarSign,  Edit,
 Users, HelpCircle, ArrowRight, BookOpen, Briefcase,Eye, Activity, BarChart2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import axios from 'axios';

// 2. Types/Interfaces
export interface Question {
  id: string;
  title: string;
  content: string;
  subject: string;
  author: User;
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'inactive';
  createdAt: string;
}

export interface Answer {
  id: string;
  question: Question;
  content: string;
  preview: string;
  author: User;
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'inactive';
  purchaseCount: number;
  rating: number;
  price: number;
  createdAt: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onCollapse: () => void;
  onLogout: () => Promise<void>;  // Add proper type
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeWriters: number;
  completionRate: number;
  averageRating: number;
  disputeRate: number;
  revenueGrowth: number;
  userGrowth: number;
  activeEmployers: number;
  pendingQuestions: number;
  pendingAnswers: number;
  totalQARevenue: number;
  qaGrowth: number;
  questions: Question[];  // Add this
  answers: Answer[];     // Add this
}
export interface Order {
  id: string;
  title: string;
  client: string;
  subject: string;
  amount: number;
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'inactive';
  dueDate: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'writer' | 'editor';
  status: 'active' | 'inactive';
  lastActive: string;
  phone: string;
}

export interface ProfileDropdownProps {
  onLogout: () => Promise<void>;
}
export interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  onLogout: () => Promise<void>;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'user' | 'order' | 'payment' | 'system';
}

export interface SystemSettings {
  emailNotifications: boolean;
  autoAssignOrders: boolean;
  minimumOrderAmount: number;
  platformFee: number;
  maintenanceMode: boolean;
}
export interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
}
export interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  onLogout: () => Promise<void>;
}

// Sidebar Types
export interface SidebarItem {
    title: string;
    icon: React.ReactNode;
    path: string;
    badge?: number;
    subItems?: {
      title: string;
      path: string;
    }[];
  }
  
  // Chat Types
  export interface ChatMessage {
    id: string;
    sender: 'admin' | 'user';
    content: string;
    timestamp: Date;
    read: boolean;
  }

// 3. Utility Functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount);
};

const generateMockData = (days: number) => {
  return Array.from({ length: days }, (_, i) => ({
    date: format(new Date(Date.now() - i * 24 * 60 * 60 * 1000), 'MMM dd'),
    revenue: Math.floor(Math.random() * 50000) + 10000,
    orders: Math.floor(Math.random() * 50) + 10,
    users: Math.floor(Math.random() * 30) + 5
  })).reverse();
};

// 4. Small Components
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, change, icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        <div className="flex items-center space-x-1 mt-2">
          <span className={`text-sm ${
            change >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
          <span className="text-sm text-slate-500">vs last period</span>
        </div>
      </div>
      <div className={`p-3 rounded-full bg-${color}-100`}>
        {icon}
      </div>
    </div>
  </div>
);

const QAStatsCard: React.FC<{ stats: DashboardStats }> = ({ stats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <StatsCard
      title="Q&A Revenue"
      value={formatCurrency(stats.totalQARevenue)}
      change={stats.qaGrowth}
      icon={<BookOpen className="h-6 w-6 text-indigo-600" />}
      color="indigo"
    />
    <StatsCard
      title="Pending Questions"
      value={stats.pendingQuestions}
      change={0}
      icon={<HelpCircle className="h-6 w-6 text-orange-600" />}
      color="orange"
    />
    <StatsCard
      title="Pending Answers"
      value={stats.pendingAnswers}
      change={0}
      icon={<MessageCircle className="h-6 w-6 text-cyan-600" />}
      color="cyan"
    />
  </div>
);

const StatusBadge: React.FC<{
  status: Order['status'] | User['status']
}> = ({ status }) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    disputed: 'bg-red-100 text-red-800',
    inactive: 'bg-slate-100 text-slate-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      colors[status]
    }`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};


const RevenueChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis 
        tickFormatter={(value) => `KES ${(value / 1000)}k`}
      />
      <Tooltip 
        formatter={(value: number) => formatCurrency(value)}
      />
      <Area
        type="monotone"
        dataKey="revenue"
        stroke="#8884d8"
        fillOpacity={1}
        fill="url(#colorRevenue)"
      />
    </AreaChart>
  </ResponsiveContainer>
);

const OrdersChart: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="orders" 
        stroke="#82ca9d" 
        name="Orders"
      />
    </LineChart>
  </ResponsiveContainer>
);


// Sidebar Component
const Sidebar: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
  isCollapsed: boolean;
  onCollapse: () => void;
  onLogout: () => Promise<void>;
}> = ({ 
  isOpen, 
  onClose,
  isCollapsed,
  onCollapse, 
  onLogout
}) => {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  
  
  const sidebarItems: SidebarItem[] = [
    {
      title: 'Q&A Management',
      icon: <BookOpen className="h-5 w-5" />,
      path: '/admin/qa',
      subItems: [
        { title: 'All Questions', path: '/admin/qa/questions' },
        { title: 'All Answers', path: '/admin/qa/answers' },
        { title: 'Pending Review', path: '/admin/qa/pending' },
        { title: 'Reports', path: '/admin/qa/reports' }
      ]
    },
    {
      title: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      path: '/admin/dashboard'
    },
    {
      title: 'Orders',
      icon: <FileText className="h-5 w-5" />,
      path: '/admin/orders',
      badge: 5,
      subItems: [
        { title: 'All Orders', path: '/admin/orders' },
        { title: 'Pending Orders', path: '/admin/orders/pending' },
        { title: 'Active Orders', path: '/admin/orders/active' },
        { title: 'Completed Orders', path: '/admin/orders/completed' },
        { title: 'Disputed Orders', path: '/admin/orders/disputed' }
      ]
    },
    {
      title: 'Writers',
      icon: <Users className="h-5 w-5" />,
      path: '/admin/writers',
      subItems: [
        { title: 'All Writers', path: '/admin/writers' },
        { title: 'Active Writers', path: '/admin/writers/active' },
        { title: 'Pending Approval', path: '/admin/writers/pending' },
        { title: 'Blocked Writers', path: '/admin/writers/blocked' }
      ]
    },
    {
      title: 'Finance',
      icon: <Wallet2 className="h-5 w-5" />,
      path: '/admin/finance',
      subItems: [
        { title: 'Overview', path: '/admin/finance' },
        { title: 'Transactions', path: '/admin/finance/transactions' },
        { title: 'Payouts', path: '/admin/finance/payouts' },
        { title: 'Reports', path: '/admin/finance/reports' }
      ]
    },
    {
      title: 'Analytics',
      icon: <BarChart2 className="h-5 w-5" />,
      path: '/admin/analytics'
    },
    {
      title: 'Messages',
      icon: <MessageCircle className="h-5 w-5" />,
      path: '/admin/messages',
      badge: 3
    },
    {
      title: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      path: '/admin/settings'
    },
    {
      title: 'Employers',
      icon: <Briefcase className="h-5 w-5" />,
      path: '/admin/employers',
      subItems: [
        { title: 'All Employers', path: '/admin/employers' },
        { title: 'Active Employers', path: '/admin/employers/active' },
        { title: 'Pending Approval', path: '/admin/employers/pending' },
        { title: 'Blocked Employers', path: '/admin/employers/blocked' }
      ]
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200 
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo and Collapse Button */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <Link href="/admin/dashboard" className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="Eclipse Writers"
              width={32}
              height={32}
              className="rounded-lg"
            />
            {!isCollapsed && <span className="font-bold text-lg">Admin Panel</span>}
          </Link>
          <div className="flex items-center">
            <button
              onClick={onCollapse}
              className="hidden lg:block p-2 rounded-lg hover:bg-slate-100"
            >
              {isCollapsed ? (
                <ArrowRight className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5 transform -rotate-90" />
              )}
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)] ${
          isCollapsed ? 'px-2' : 'px-4'
        }`}>
          {sidebarItems.map((item) => (
            <div key={item.title}>
              <Link
                href={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-lg
                  ${activeItem === item.path
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                onClick={() => {
                  setActiveItem(item.path);
                  if (item.subItems && !isCollapsed) {
                    setExpandedItem(
                      expandedItem === item.title ? null : item.title
                    );
                  }
                }}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                  <div className={`${isCollapsed ? 'tooltip tooltip-right' : ''}`} 
                       data-tip={isCollapsed ? item.title : ''}>
                    {item.icon}
                  </div>
                  {!isCollapsed && <span>{item.title}</span>}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center space-x-3">
                    {item.badge && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 
                        text-red-600 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.subItems && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200
                          ${expandedItem === item.title ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                )}
              </Link>

              {/* SubItems */}
              {!isCollapsed && item.subItems && expandedItem === item.title && (
                <div className="mt-1 ml-4 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.path}
                      href={subItem.path}
                      className={`block px-3 py-2 rounded-lg text-sm
                        ${activeItem === subItem.path
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      onClick={() => setActiveItem(subItem.path)}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

       {/* Bottom Section - Optional */}
{!isCollapsed && (
  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-slate-200 rounded-full" />
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">Admin User</p>
        <p className="text-xs text-slate-500">admin@example.com</p>
      </div>
      <button 
        className="p-1 hover:bg-slate-100 rounded-lg"
        onClick={async () => {
          try {
            const response = await fetch('/auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'logout' })
            });
          
        
            const data = await response.json();
            
            if (response.ok) {
              window.location.href = data.redirectTo;
            } else {
              console.error('Logout failed:', data.error);
            }
          } catch (error) {
            console.error('Logout error:', error);
          }
        }}
      >
        </button>
        <button 
          className="p-1 hover:bg-slate-100 rounded-lg"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 text-slate-600" />
        </button>
    </div>
  </div>
)}
</aside>
</>
);
};
  
const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100"
      >
        <div className="w-8 h-8 bg-slate-200 rounded-full overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm font-medium text-slate-600">A</span>
          </div>
        </div>
        <span className="text-sm font-medium text-slate-700">Admin Name</span>
        <ChevronDown 
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 
            ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-3 border-b border-slate-200">
            <p className="text-sm font-medium text-slate-900">Admin Name</p>
            <p className="text-xs text-slate-500">admin@example.com</p>
          </div>
          
          <Link 
            href="/admin/profile" 
            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 
              transition-colors"
          >
            <User className="h-4 w-4 mr-3 text-slate-500" />
            Profile
          </Link>
          
          <Link 
            href="/admin/settings" 
            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 
              transition-colors"
          >
            <Settings className="h-4 w-4 mr-3 text-slate-500" />
            Settings
          </Link>
          
          <button 
            onClick={async () => {
              try {
                setIsOpen(false);
                await onLogout();
              } catch (error) {
                console.error('Logout failed:', error);
              }
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 
              hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

  // Chat Widget Component
  const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
      {
        id: '1',
        sender: 'user',
        content: 'Hello, I need help with my order',
        timestamp: new Date(),
        read: true
      },
      {
        id: '2',
        sender: 'admin',
        content: 'Hi! I\'d be happy to help. What\'s your order number?',
        timestamp: new Date(),
        read: true
      }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
  
    useEffect(() => {
      if (isOpen) {
        scrollToBottom();
      }
    }, [messages, isOpen]);
  
    const handleSendMessage = () => {
      if (!newMessage.trim()) return;
  
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'admin',
        content: newMessage.trim(),
        timestamp: new Date(),
        read: true
      }]);
  
      setNewMessage('');
    };
  
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center 
            justify-center hover:bg-slate-800 transition-colors shadow-lg"
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </button>
  
        {/* Chat Window */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 w-72 bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4">
              <h3 className="font-semibold">Admin Support</h3>
              <p className="text-sm text-slate-300">Response time: ~5 minutes</p>
            </div>
  
            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'admin' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === 'admin'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {format(message.timestamp, 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
  
            {/* Input */}
            <div className="p-4 border-t border-slate-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg 
                    hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // 6. Section Components
  const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onToggleSidebar, onLogout }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
  
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle Sidebar"
          >
            <MenuIcon className="h-5 w-5 text-slate-600" />
            <ProfileDropdown onLogout={onLogout} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600">Monitor and manage your platform</p>
          </div>
        </div>
  
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              className="p-2 hover:bg-slate-100 rounded-lg"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
            >
              <div className="relative">
                <Bell className="h-5 w-5 text-slate-600" />
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs 
                  rounded-full flex items-center justify-center">
                  3
                </span>
              </div>
            </button>
  
            {/* Notification dropdown - you can implement this later */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg 
                border border-slate-200 z-50">
                {/* Add notification items here */}
              </div>
            )}
          </div>
  
          {/* Settings */}
          <div className="relative">
            <button 
              className="p-2 hover:bg-slate-100 rounded-lg"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-slate-600" />
            </button>
  
            {/* Settings dropdown - you can implement this later */}
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg 
                border border-slate-200 z-50">
                {/* Add settings items here */}
              </div>
            )}
          </div>
  
          {/* Profile Dropdown */}
          <ProfileDropdown onLogout={onLogout} />
        </div>
      </div>
    );
  };
  
  

  const PerformanceMetrics: React.FC<{ stats: DashboardStats }> = ({ stats }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Total Revenue"
        value={formatCurrency(stats.totalRevenue)}
        change={stats.revenueGrowth}
        icon={<DollarSign className="h-6 w-6 text-emerald-600" />}
        color="emerald"
      />
      <StatsCard
        title="Active Employers"
        value={stats.activeEmployers}
        change={3.2}
        icon={<Briefcase className="h-6 w-6 text-purple-600" />}
        color="purple"
        />
      <StatsCard
        title="Active Writers"
        value={stats.activeWriters}
        change={stats.userGrowth}
        icon={<Users className="h-6 w-6 text-blue-600" />}
        color="blue"
      />
      <StatsCard
        title="Completion Rate"
        value={`${stats.completionRate}%`}
        change={2.5}
        icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        color="green"
      />
      <StatsCard
        title="Dispute Rate"
        value={`${stats.disputeRate}%`}
        change={-0.8}
        icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
        color="red"
      />
    </div>
  );
  
  const OrdersTable: React.FC<{ orders: Order[] }> = ({ orders }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
    <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
        <button className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900">
          <span>View All</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="pb-3 text-sm font-medium text-slate-600">Order ID</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Title</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Client</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Amount</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Due Date</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100">
                <td className="py-4 text-sm text-slate-600">{order.id}</td>
                <td className="py-4 text-sm text-slate-900">{order.title}</td>
                <td className="py-4 text-sm text-slate-600">{order.client}</td>
                <td className="py-4 text-sm text-slate-900">
                  {formatCurrency(order.amount)}
                </td>
                <td className="py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-4 text-sm text-slate-600">
                  {format(new Date(order.dueDate), 'MMM dd, yyyy')}
                </td>
                <td className="py-4">
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-slate-100 rounded-lg">
                      <Eye className="h-4 w-4 text-slate-600" />
                    </button>
                    <button className="p-1 hover:bg-slate-100 rounded-lg">
                      <Edit className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  const ActivityLogsSection: React.FC<{ logs: ActivityLog[] }> = ({ logs }) => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Activity Logs</h2>
      <div className="space-y-4">
        {logs.map((log) => (
          <div 
            key={log.id}
            className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg"
          >
            <div className={`p-2 rounded-full ${
              log.type === 'user' ? 'bg-blue-100' :
              log.type === 'order' ? 'bg-green-100' :
              log.type === 'payment' ? 'bg-yellow-100' :
              'bg-slate-100'
            }`}>
              {log.type === 'user' ? <User className="h-5 w-5 text-blue-600" /> :
               log.type === 'order' ? <FileText className="h-5 w-5 text-green-600" /> :
               log.type === 'payment' ? <DollarSign className="h-5 w-5 text-yellow-600" /> :
               <Activity className="h-5 w-5 text-slate-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{log.user}</p>
                <time className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </time>
              </div>
              <p className="text-sm text-slate-600 mt-1">{log.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const SettingsPanel: React.FC<{
    settings: SystemSettings;
    onUpdate: (settings: SystemSettings) => void;
  }> = ({ settings, onUpdate }) => {
    const [tempSettings, setTempSettings] = useState(settings);
    const [isEditing, setIsEditing] = useState(false);
  
    const handleSave = () => {
      onUpdate(tempSettings);
      setIsEditing(false);
    };
  
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">System Settings</h2>
          {isEditing ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Edit Settings
            </button>
          )}
        </div>
  
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Minimum Order Amount (KES)
                </span>
                <input
                  type="number"
                  value={tempSettings.minimumOrderAmount}
                  onChange={(e) => setTempSettings(prev => ({
                    ...prev,
                    minimumOrderAmount: Number(e.target.value)
                  }))}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-lg border-slate-200"
                />
              </label>
  
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Platform Fee (%)
                </span>
                <input
                  type="number"
                  value={tempSettings.platformFee}
                  onChange={(e) => setTempSettings(prev => ({
                    ...prev,
                    platformFee: Number(e.target.value)
                  }))}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-lg border-slate-200"
                />
              </label>
            </div>
  
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={tempSettings.emailNotifications}
                  onChange={(e) => setTempSettings(prev => ({
                    ...prev,
                    emailNotifications: e.target.checked
                  }))}
                  disabled={!isEditing}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">
                  Enable Email Notifications
                </span>
              </label>
  
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={tempSettings.autoAssignOrders}
                  onChange={(e) => setTempSettings(prev => ({
                    ...prev,
                    autoAssignOrders: e.target.checked
                  }))}
                  disabled={!isEditing}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">
                  Auto-assign Orders
                </span>
              </label>
  
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={tempSettings.maintenanceMode}
                  onChange={(e) => setTempSettings(prev => ({
                    ...prev,
                    maintenanceMode: e.target.checked
                  }))}
                  disabled={!isEditing}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">
                  Maintenance Mode
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 8. Analytics Components
  const AnalyticsSection: React.FC<{ data: any }> = ({ data }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trend</h2>
        <div className="h-[300px]">
          <RevenueChart data={data} />
        </div>
      </div>
  
      {/* Orders Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Orders Trend</h2>
        <div className="h-[300px]">
          <OrdersChart data={data} /> {/* Changed from RevenueChart to OrdersChart */}
        </div>
      </div>
    </div>
  );
  //9. User Management Section
const UserManagementSection: React.FC<{ users: User[] }> = ({ users }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
      <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
        <UserPlus className="h-4 w-4" />
        <span>Add User</span>
      </button>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b border-slate-200">
            <th className="pb-3 text-sm font-medium text-slate-600">Name</th>
            <th className="pb-3 text-sm font-medium text-slate-600">Email</th>
            <th className="pb-3 text-sm font-medium text-slate-600">Phone</th>
            <th className="pb-3 text-sm font-medium text-slate-600">Role</th>
            <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
            <th className="pb-3 text-sm font-medium text-slate-600">Last Active</th>
            <th className="pb-3 text-sm font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-slate-100">
              <td className="py-4 text-sm text-slate-900">{user.name}</td>
              <td className="py-4 text-sm text-slate-600">{user.email}</td>
              <td className="py-4 text-sm text-slate-600">{user.phone}</td>
              <td className="py-4 text-sm text-slate-600">
                <span className="px-2 py-1 bg-slate-100 rounded-full">
                  {user.role}
                </span>
              </td>
              <td className="py-4">
                <StatusBadge status={user.status} />
              </td>
              <td className="py-4 text-sm text-slate-600">
                {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
              </td>
              <td className="py-4">
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-slate-100 rounded-lg">
                    <Edit className="h-4 w-4 text-slate-600" />
                  </button>
                  <button className="p-1 hover:bg-slate-100 rounded-lg">
                    <Ban className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Create a Toast component
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info' }> = ({ 
  message, 
  type 
}) => (
  <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    'bg-blue-500'
  } text-white`}>
    {message}
  </div>
);


const QAManagementSection: React.FC<{
  questions: Question[];
  answers: Answer[];
}> = ({ questions, answers }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold text-slate-900">Q&A Management</h2>
      <div className="flex space-x-4">
        <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          Pending Questions ({questions.filter(q => q.status === 'pending').length})
        </button>
        <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          Pending Answers ({answers.filter(a => a.status === 'pending').length})
        </button>
      </div>
    </div>

    <div className="space-y-6">
      {/* Questions Table */}
      <div>
        <h3 className="text-md font-medium mb-4">Recent Questions</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="pb-3 text-sm font-medium text-slate-600">Title</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Subject</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Author</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.slice(0, 5).map((question) => (
              <tr key={question.id} className="border-b border-slate-100">
                <td className="py-4 text-sm text-slate-900">{question.title}</td>
                <td className="py-4 text-sm text-slate-600">{question.subject}</td>
                <td className="py-4 text-sm text-slate-600">{question.author.name}</td>
                <td className="py-4">
                  <StatusBadge status={question.status} />
                </td>
                <td className="py-4">
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-slate-100 rounded-lg">
                      <Eye className="h-4 w-4 text-slate-600" />
                    </button>
                    <button className="p-1 hover:bg-slate-100 rounded-lg">
                      <Edit className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Answers Table */}
      <div>
        <h3 className="text-md font-medium mb-4">Recent Answers</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="pb-3 text-sm font-medium text-slate-600">Question</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Author</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Purchases</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {answers.slice(0, 5).map((answer) => (
              <tr key={answer.id} className="border-b border-slate-100">
                <td className="py-4 text-sm text-slate-900">
                  {answer.question.title}
                </td>
                <td className="py-4 text-sm text-slate-600">
                  {answer.author.name}
                </td>
                <td className="py-4 text-sm text-slate-900">
                  {answer.purchaseCount} (KES {answer.purchaseCount * 100})
                </td>
                <td className="py-4">
                  <StatusBadge status={answer.status} />
                </td>
                <td className="py-4">
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-slate-100 rounded-lg">
                      <Eye className="h-4 w-4 text-slate-600" />
                    </button>
                    <button className="p-1 hover:bg-slate-100 rounded-lg">
                      <Edit className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// 10. Footer Component
const DashboardFooter: React.FC = () => (
  <footer className="mt-8 border-t border-slate-200 py-6">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center space-x-4">
          <Image
            src="/logo.png"
            alt="Eclipse Writers"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-sm text-slate-600">
            © {new Date().getFullYear()} Eclipse Writers. All rights reserved.
          </span>
        </div>
        <div className="flex items-center space-x-6 mt-4 md:mt-0">
          <Link
            href="/admin/help"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Help Center
          </Link>
          <Link
            href="/admin/privacy"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Privacy Policy
          </Link>
          <Link
            href="/admin/terms"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Something went wrong
            </h2>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
// 11. Main AdminDashboard Component
export const AdminDashboard: React.FC = () => {
  // State management
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  } | null>(null);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    activeWriters: 0,
    completionRate: 0,
    averageRating: 0,
    disputeRate: 0,
    revenueGrowth: 0,
    userGrowth: 0,
    activeEmployers: 0,
    pendingQuestions: 0,
    pendingAnswers: 0,
    totalQARevenue: 0,
    qaGrowth: 0,
    questions: [],
    answers: []
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    emailNotifications: true,
    autoAssignOrders: false,
    minimumOrderAmount: 500,
    platformFee: 9,
    maintenanceMode: false
  });
  const [analyticsData, setAnalyticsData] = useState(generateMockData(30));

  // Handlers
  const handleLogout = async () => {
    try {
      setToastMessage('Logging out...');
      setToastType('info');
      setShowToast(true);
  
      const response = await fetch('/api/auth', {  // Note the updated path
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'logout' })
      });
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Logout failed');
      }
  
      // Clear any client-side state
      localStorage.clear();
      sessionStorage.clear();
  
      // Show success message
      setToastMessage('Logged out successfully');
      setToastType('success');
      setShowToast(true);
  
      // Brief delay to show the success message
      setTimeout(() => {
        window.location.href = '/sign-in';
      }, 1000);
  
    } catch (error) {
      console.error('Logout error:', error);
      setToastMessage('Logout failed. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    try {
      await axios.put('/api/admin/settings', newSettings);
      setSettings(newSettings);
      setToast({ message: 'Settings updated successfully', type: 'success', show: true });
    } catch (error) {
      setToast({ message: 'Failed to update settings', type: 'error', show: true });
    }
  };

  // Data fetching
  useEffect(() => {
    let mounted = true;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = mockDashboardData;
        
        if (!mounted) return;

        if (!data) {
          throw new Error('Failed to fetch dashboard data');
        }

        setStats(data.stats);
        setOrders(data.orders);
        setUsers(data.users);
        setLogs(data.logs);
        setSettings(data.settings);
        setAnalyticsData(data.analyticsData);
        setQuestions(data.questions || []);
        setAnswers(data.answers || []);
        
      } catch (error) {
        if (mounted) {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
        />
        
        <div className={`flex-1 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <div className="container mx-auto px-4 py-8">
            <DashboardHeader 
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
              onLogout={handleLogout}
            />
            <div className="space-y-6">
              <PerformanceMetrics stats={stats} />
              <AnalyticsSection data={analyticsData} />
              <OrdersTable orders={orders} />
              <UserManagementSection users={users} />
              <ActivityLogsSection logs={logs} />
              <QAStatsCard stats={stats} />
              <QAManagementSection 
                questions={questions}
                answers={answers}
              />
              <SettingsPanel 
                settings={settings}
                onUpdate={handleUpdateSettings}
              />
            </div>
            <DashboardFooter />
          </div>
        </div>
        {showToast && (
          <Toast 
            message={toastMessage} 
            type={toastType} 
          />
        )}
        
        {toast && <Toast message={toast.message} type={toast.type} />}
        <ChatWidget />
      </div>
    </ErrorBoundary>
  );
};

export default AdminDashboard;