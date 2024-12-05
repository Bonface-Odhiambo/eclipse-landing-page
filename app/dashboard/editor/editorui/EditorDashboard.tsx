// app/dashboard/editorcomponents/EditorDashboard.tsx
'use client';

import React, { useState, Fragment, useRef, useEffect } from 'react';
import { Menu, Transition, Tab, Popover, Dialog } from '@headlessui/react';
import Link from 'next/link';
import Image from 'next/image'; 
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,ResponsiveContainer} from 'recharts';
import { Home, FileText, Wallet2, User, Mail, Settings, Star, MessageCircle, AlertTriangle, Ban, Menu as MenuIcon, Bell, LogOut, ChevronDown, Send, X, Clock, CheckCircle, Upload, CreditCard, Lock, DollarSign, Edit, Shield, Search, ArrowRight, PenTool, FileCheck, ThumbsUp, ThumbsDown, Download, Eye, Check, Loader2 } from 'lucide-react';

// Interfaces
interface Paper {
  id: string;
  orderId: string;
  writerId: string;
  title: string;
  subject: string;
  pageCount: number;
  status: 'pending_review' | 'under_review' | 'reviewed' | 'approved' | 'rejected';
  submittedAt: Date;
  deadline: Date;
  file: File | null;
  reviewNotes?: PaperReview;
}

interface PaperReview {
  grammar: boolean;
  noAiUse: boolean;
  noPlagiarism: boolean;
  noAiHumanizers: boolean;
  properReferencing: boolean;
  properFormatting: boolean;
  thesisStatement: boolean;
  topicSentences: boolean;
  concludingSentences: boolean;
  comments: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'editor' | 'support';
  timestamp: Date;
  read?: boolean;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'paper' | 'system' | 'payment';
}
interface SidebarNestedItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  subItems?: Array<{
    label: string;
    icon: React.ReactNode;
    href: string;
  }>;
}

// Global styles
const globalStyles = `
  @keyframes slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  .chat-window {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 2px 4px -2px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(8px);
  }

  .messages-container::-webkit-scrollbar {
    width: 6px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .whatsapp-button:hover .tooltip {
    opacity: 1;
    transform: translateX(0);
  }
  .sidebar-content {
    height: calc(100vh - 64px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
    padding-bottom: 120px;
  }

  .sidebar-content::-webkit-scrollbar {
    width: 6px;
  }

  .sidebar-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar-content::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .main-content {
    min-height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
  }

  .content-wrapper {
    flex: 1;
    padding-bottom: 24px;
  }

  .chat-widget-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }

  .chat-window {
    position: fixed;
    bottom: 90px;
    right: 24px;
    width: 300px;
    max-height: 400px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    overflow: hidden;
    z-index: 998;
  }

  .paper-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    transition: all 0.2s;
    border: 1px solid #E5E7EB;
  }

  .paper-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .review-metric {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    background: #F9FAFB;
  }
`;

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'just now';
};

// Main Component
export default function EditorDashboard() {
  // Core state management
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [currentPaper, setCurrentPaper] = useState<Paper | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const showToastMessage = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Initialize on client-side
  showToastMessage('Operation completed successfully!', 'success');

  const loadMockData = () => {
    // Mock papers data
    setPapers([
      {
        id: "1",
        orderId: "ORD-001",
        writerId: "WR-101",
        title: "The Impact of Artificial Intelligence on Modern Healthcare",
        subject: "Technology & Healthcare",
        pageCount: 8,
        status: 'pending_review',
        submittedAt: new Date(Date.now() - 3600000), // 1 hour ago
        deadline: new Date(Date.now() + 86400000), // 24 hours from now
        file: null
      },
      {
        id: "2",
        orderId: "ORD-002",
        writerId: "WR-102",
        title: "Sustainable Energy Solutions for Developing Nations",
        subject: "Environmental Science",
        pageCount: 12,
        status: 'under_review',
        submittedAt: new Date(Date.now() - 7200000), // 2 hours ago
        deadline: new Date(Date.now() + 172800000), // 48 hours from now
        file: null
      },
      {
        id: "3",
        orderId: "ORD-003",
        writerId: "WR-103",
        title: "Economic Implications of Global Pandemic Response",
        subject: "Economics",
        pageCount: 10,
        status: 'reviewed',
        submittedAt: new Date(Date.now() - 86400000), // 24 hours ago
        deadline: new Date(Date.now() + 259200000), // 72 hours from now
        file: null,
        reviewNotes: {
          grammar: true,
          noAiUse: true,
          noPlagiarism: true,
          noAiHumanizers: true,
          properReferencing: true,
          properFormatting: true,
          thesisStatement: true,
          topicSentences: true,
          concludingSentences: true,
          comments: "Excellent work, well-structured and thoroughly researched."
        }
      }
    ]);
  
    // Mock notifications
    setNotifications([
      {
        id: 1,
        title: "New Paper Submitted",
        message: "A new paper is waiting for your review",
        timestamp: new Date(),
        read: false,
        type: 'paper'
      },
      {
        id: 2,
        title: "Review Bonus Earned",
        message: "You've earned a bonus for maintaining high quality standards",
        timestamp: new Date(Date.now() - 3600000),
        read: false,
        type: 'payment'
      }
    ]);
  };
  useEffect(() => {
    setIsClient(true);
    // Load mock data
    loadMockData();
  }, []);

  // Part 2/7 - Sidebar and Header Components

// Sidebar Items Configuration
const sidebarItems: SidebarNestedItem[] = [
  { 
    label: "Dashboard", 
    icon: <Home size={20} className="text-slate-100" />, 
    href: "/editor/dashboard" 
  },
  { 
    label: "Paper Queue", 
    icon: <FileText size={20} className="text-slate-100" />, 
    href: "/editor/papers",
    subItems: [
      {
        label: "Pending Review",
        icon: <Clock size={16} className="text-slate-100" />,
        href: "/editor/papers/pending"
      },
      {
        label: "Under Review",
        icon: <Edit size={16} className="text-slate-100" />,
        href: "/editor/papers/reviewing"
      },
      {
        label: "Reviewed Papers",
        icon: <CheckCircle size={16} className="text-slate-100" />,
        href: "/editor/papers/reviewed"
      }
    ]
  },
  { 
    label: "Quality Metrics", 
    icon: <Star size={20} className="text-slate-100" />, 
    href: "/editor/metrics" 
  },
  { 
    label: "Earnings", 
    icon: <Wallet2 size={20} className="text-slate-100" />, 
    href: "/editor/earnings" 
  },
  { 
    label: "Support", 
    icon: <MessageCircle size={20} className="text-slate-100" />, 
    href: "/editor/support" 
  },
  { 
    label: "Settings", 
    icon: <Settings size={20} className="text-slate-100" />, 
    href: "/editor/settings" 
  }
];

// Enhanced Sidebar Component
const Sidebar = () => {
  const renderMenuItem = (item: SidebarNestedItem) => (
    <li key={item.label}>
      <div>
        <button
          onClick={() => {
            if (item.subItems) {
              setExpandedItem(expandedItem === item.label ? null : item.label);
            }
          }}
          className={`
            w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700 transition-colors
            ${!isSidebarOpen && 'justify-center'}
            ${isClient && window.location.pathname === item.href ? 'bg-slate-700' : ''}
          `}
        >
          <div className="relative">
            {item.icon}
            {item.label === 'Paper Queue' && papers.filter(p => p.status === 'pending_review').length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white">
                  {papers.filter(p => p.status === 'pending_review').length}
                </span>
              </span>
            )}
          </div>
          {isSidebarOpen && (
            <>
              <span className="text-sm flex-1">{item.label}</span>
              {item.subItems && (
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${
                    expandedItem === item.label ? 'rotate-180' : ''
                  }`}
                />
              )}
            </>
          )}
        </button>
        
        {item.subItems && expandedItem === item.label && isSidebarOpen && (
          <ul className="ml-4 mt-1 space-y-1">
            {item.subItems.map((subItem) => (
              <li key={subItem.label}>
                <Link
                  href={subItem.href}
                  className="flex items-center space-x-3 px-4 py-2 hover:bg-slate-700 
                    transition-colors rounded-lg text-sm group"
                >
                  <span className="transform transition-transform duration-300 group-hover:scale-110">
                    {subItem.icon}
                  </span>
                  <span className="text-slate-200 group-hover:text-white">{subItem.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );

  return (
    <aside 
      className={`${
        isSidebarOpen ? 'w-64' : 'w-20'
      } bg-slate-800 text-white transition-all duration-300 fixed h-full`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <Image
            src="/logo.png"
            alt="Eclipse Writers"
            width={32}
            height={32}
            className={`${!isSidebarOpen && 'w-8'} transition-all duration-300`}
          />
          <h1 className={`font-bold text-lg transition-opacity duration-300 ${
            !isSidebarOpen ? 'opacity-0 w-0' : 'opacity-100'
          }`}>
            Eclipse Writers
          </h1>
        </div>
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Toggle Sidebar"
        >
          <MenuIcon className="h-6 w-6 transition-transform duration-300 hover:rotate-180" />
        </button>
      </div>

      <div className="sidebar-content">
        <nav className="mt-6">
          <ul className="space-y-1">
            {sidebarItems.map(renderMenuItem)}
          </ul>
        </nav>

        {/* Editor Stats Section */}
        {isSidebarOpen && (
          <div className="mt-8 px-4 py-6 border-t border-slate-700">
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-4">
              Editor Stats
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Papers Reviewed Today</p>
                <p className="text-lg font-semibold">
                  {papers.filter(p => 
                    p.status === 'reviewed' && 
                    new Date(p.submittedAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Approval Rate</p>
                <p className="text-lg font-semibold text-green-400">98%</p>
              </div>
            </div>
          </div>
        )}

        {/* Editor Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">ED</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full 
                border-2 border-slate-900" />
            </div>
            {isSidebarOpen && (
              <div>
                <p className="text-sm font-medium">Editor Name</p>
                <p className="text-xs text-slate-400">Senior Editor</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};



// Modern Header Component
const Header = () => {
  if (!isClient) return null;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <MenuIcon className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search papers, writers, or metrics..."
              className="w-full px-4 py-2 pl-10 bg-slate-50 border border-slate-200 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-all duration-300"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Popover className="relative">
            <Popover.Button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="h-6 w-6 text-slate-600" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg 
                border border-slate-100 z-50">
                {/* Add notifications panel content */}
              </Popover.Panel>
            </Transition>
          </Popover>

          {/* Earnings Quick View */}
          <Menu as="div" className="relative">
  <Menu.Button className="hidden md:flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
    <Wallet2 className="h-5 w-5 text-green-600" />
    <span className="text-sm font-medium text-slate-900">
      KSH {(papers.length * 5).toLocaleString()}
    </span>
    <ChevronDown className="h-4 w-4 text-slate-500" />
  </Menu.Button>

  <Transition
    as={Fragment}
    enter="transition ease-out duration-100"
    enterFrom="transform opacity-0 scale-95"
    enterTo="transform opacity-100 scale-100"
    leave="transition ease-in duration-75"
    leaveFrom="transform opacity-100 scale-100"
    leaveTo="transform opacity-0 scale-95"
  >
    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-slate-100">
      <Menu.Item>
        {({ active }) => (
          <button
            onClick={() => setShowWithdrawModal(true)}
            className={`${
              active ? 'bg-slate-50' : ''
            } w-full px-4 py-2 text-left text-sm flex items-center space-x-2`}
          >
            <CreditCard className="h-4 w-4 text-slate-500" />
            <span>Withdraw Funds</span>
          </button>
        )}
      </Menu.Item>
    </Menu.Items>
  </Transition>
</Menu>

<Menu as="div" className="relative">
  <Menu.Button className="flex items-center space-x-2 hover:bg-slate-50 p-2 
    rounded-lg transition-colors">
    <div className="relative">
      <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
        <span className="text-sm font-medium text-white">ED</span>
      </div>
      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full 
        border-2 border-white" />
    </div>
    <ChevronDown className="h-4 w-4 text-slate-500" />
  </Menu.Button>

  <Transition
    as={Fragment}
    enter="transition ease-out duration-100"
    enterFrom="transform opacity-0 scale-95"
    enterTo="transform opacity-100 scale-100"
    leave="transition ease-in duration-75"
    leaveFrom="transform opacity-100 scale-100"
    leaveTo="transform opacity-0 scale-95"
  >
    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg 
      shadow-lg py-1 z-50 border border-slate-100">
      <Menu.Item>
        {({ active }) => (
          <Link
            href="/editor/profile"
            className={`${
              active ? 'bg-slate-50' : ''
            } w-full px-4 py-2 text-left text-sm flex items-center space-x-2`}
          >
            <User className="h-4 w-4 text-slate-500" />
            <span>Profile</span>
          </Link>
        )}
      </Menu.Item>
      <Menu.Item>
        {({ active }) => (
          <Link
            href="/editor/settings"
            className={`${
              active ? 'bg-slate-50' : ''
            } w-full px-4 py-2 text-left text-sm flex items-center space-x-2`}
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Settings</span>
          </Link>
        )}
      </Menu.Item>
      <div className="border-t border-slate-100 my-1"></div>
      <Menu.Item>
        {({ active }) => (
          <button
            onClick={handleLogout}
            className={`${
              active ? 'bg-slate-50' : ''
            } w-full px-4 py-2 text-left text-sm flex items-center space-x-2 text-red-600`}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        )}
      </Menu.Item>
    </Menu.Items>
  </Transition>
</Menu>
        </div>
      </div>
    </header>
  );
};

const WithdrawModal = () => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.match(/^(07|01)\d{8}$/)) {
      setToastMessage('Please enter a valid phone number');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setToastMessage('Please enter a valid amount');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Your existing backend withdrawal logic would go here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      setShowWithdrawModal(false);
      setToastMessage('Withdrawal request submitted successfully. Check your phone for M-PESA prompt.');
      setToastType('success');
      setShowToast(true);
      
      // Reset form
      setAmount('');
      setPhoneNumber('');
    } catch (error) {
      setToastMessage('Withdrawal request failed. Please try again.');
      setToastType('error');
      setShowToast(true);
    }

    setIsProcessing(false);
  };

  return (
    <Dialog
      open={showWithdrawModal}
      onClose={() => !isProcessing && setShowWithdrawModal(false)}
    >
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
          {/* Background overlay */}
          <Dialog.Panel className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal panel */}
          <Dialog.Panel className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <Dialog.Title className="text-xl font-semibold text-slate-900">
                  Withdraw Funds
                </Dialog.Title>
                <p className="mt-1 text-sm text-slate-500">
                  Withdraw your earnings to M-PESA
                </p>
              </div>
              {!isProcessing && (
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Withdrawal Amount */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Withdrawal Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Available Balance:</span>
                    <span className="font-medium">KSH {(papers.length * 5).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Processing Fee:</span>
                    <span>KSH 0</span>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Amount (KSH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none 
                    focus:ring-2 focus:ring-slate-500"
                  placeholder="Enter amount to withdraw"
                  required
                  min="100"
                  disabled={isProcessing}
                />
                <p className="text-xs text-slate-500">Minimum withdrawal: KSH 100</p>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  M-PESA Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none 
                    focus:ring-2 focus:ring-slate-500"
                  placeholder="e.g., 0712345678"
                  required
                  disabled={isProcessing}
                />
                {phoneNumber && !phoneNumber.match(/^(07|01)\d{8}$/) && (
                  <p className="text-xs text-red-500">
                    Please enter a valid Kenyan phone number
                  </p>
                )}
              </div>

              {/* Information Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Processing Time</p>
                    <ul className="mt-1 text-sm text-blue-700 space-y-1">
                      <li>• Instant transfer to M-PESA</li>
                      <li>• Available 24/7</li>
                      <li>• No processing fees</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing || !amount || !phoneNumber.match(/^(07|01)\d{8}$/)}
                className="w-full p-4 bg-green-600 hover:bg-green-700 text-white 
                  rounded-xl transition-colors flex items-center justify-center space-x-2
                  disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing Withdrawal...</span>
                  </div>
                ) : (
                  <>
                    <Wallet2 className="h-5 w-5" />
                    <span>Withdraw to M-PESA</span>
                  </>
                )}
              </button>

              {/* Footer */}
              <div className="flex items-center justify-center space-x-2">
                <Lock className="h-4 w-4 text-slate-400" />
                <p className="text-xs text-slate-500">
                  Secure withdrawals powered by IntaSend
                </p>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

// Paper Queue Component
const PaperQueue = () => {
  const [filterStatus, setFilterStatus] = useState<Paper['status'] | 'all'>('pending_review');
  const [sortBy, setSortBy] = useState<'deadline' | 'submittedAt'>('deadline');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPapers = papers
  .filter(paper => {
    const matchesStatus = filterStatus === 'all' ? true : paper.status === filterStatus;
      const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.orderId.includes(searchQuery) ||
        paper.writerId.includes(searchQuery);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      return b.submittedAt.getTime() - a.submittedAt.getTime();
    });

  return (
    <div className="space-y-6">
      {/* Queue Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Paper['status'])}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="all">All Papers</option>
              <option value="pending_review">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'deadline' | 'submittedAt')}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="deadline">Sort by Deadline</option>
              <option value="submittedAt">Sort by Submission Date</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, order ID, or writer ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Papers List */}
      <div className="space-y-4">
        {filteredPapers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}

        {filteredPapers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No papers found in this queue</p>
            <p className="text-sm text-slate-500 mt-2">
              {filterStatus === 'pending_review' 
                ? 'Check back later for new submissions' 
                : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

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

// Paper Card Component
const PaperCard = ({ paper }: { paper: Paper }) => {
  const statusConfig = {
    pending_review: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: Clock,
      label: 'Pending Review'
    },
    under_review: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: Edit,
      label: 'Under Review'
    },
    reviewed: {
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      icon: CheckCircle,
      label: 'Reviewed'
    },
    approved: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: ThumbsUp,
      label: 'Approved'
    },
    rejected: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: ThumbsDown,
      label: 'Rejected'
    }
  };

  const config = statusConfig[paper.status];
  const Icon = config.icon;

  const timeUntilDeadline = () => {
    const hours = Math.ceil(
      (paper.deadline.getTime() - Date.now()) / (1000 * 60 * 60)
    );
    return hours;
  };


  const earnings = paper.pageCount * 5; // KSH 5 per page

  return (
    <div className={`paper-card group hover:border-blue-300 transition-all duration-300 
      ${config.borderColor} border-2`}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm 
              ${config.bgColor} ${config.color}`}>
              <Icon className="h-4 w-4" />
              <span>{config.label}</span>
            </span>
            <span className="text-sm text-slate-500">
              Order ID: {paper.orderId}
            </span>
            <span className="text-sm text-slate-500">
              Writer ID: {paper.writerId}
            </span>
          </div>

          <h3 className="text-lg font-medium text-slate-900 group-hover:text-blue-600 
            transition-colors">
            {paper.title}
          </h3>
          
          <div className="flex items-center space-x-4 text-sm">
            <span className="flex items-center space-x-1 text-slate-600">
              <FileText className="h-4 w-4" />
              <span>{paper.pageCount} pages</span>
            </span>
            <span className="flex items-center space-x-1 text-green-600">
              <DollarSign className="h-4 w-4" />
              <span>KSH {earnings}</span>
            </span>
            <span className={`flex items-center space-x-1 ${
              timeUntilDeadline() < 24 ? 'text-red-600' : 'text-slate-600'
            }`}>
              <Clock className="h-4 w-4" />
              <span>{timeUntilDeadline()}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setCurrentPaper(paper);
              setShowReviewForm(true);
            }}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 
              group-hover:scale-110 transform duration-300"
            title="Review Paper"
          >
            <FileCheck className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => {/* Download paper logic */}}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600
              group-hover:scale-110 transform duration-300"
            title="Download Paper"
          >
            <Download className="h-5 w-5" />
          </button>

          <button
            onClick={() => {/* Preview paper logic */}}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600
              group-hover:scale-110 transform duration-300"
            title="Preview Paper"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>
      </div>

      {paper.reviewNotes && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Review Notes</h4>
          <p className="text-sm text-slate-600">{paper.reviewNotes.comments}</p>
        </div>
      )}
    </div>
  );
};

// Performance Metrics Component
const PerformanceMetrics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');

  const metrics = {
    reviews: {
      total: 156,
      average: 12,
      trend: '+15%'
    },
    quality: {
      score: 98,
      trend: '+2%',
      breakdown: {
        grammar: 99,
        aiDetection: 100,
        plagiarism: 100,
        formatting: 96,
        citations: 97
      }
    },
    speed: {
      average: '2.5h',
      trend: '-30min',
      distribution: {
        under2h: 45,
        under4h: 35,
        under6h: 15,
        over6h: 5
      }
    },
    satisfaction: {
      rate: 98,
      trend: '+3%',
      feedback: {
        positive: 145,
        neutral: 8,
        negative: 3
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Performance Overview</h2>
          <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  selectedPeriod === period 
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Score Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Quality Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Score */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-blue-900">Overall Quality Score</span>
              <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {metrics.quality.trend}
              </span>
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {metrics.quality.score}%
            </div>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${metrics.quality.score}%` }}
              />
            </div>
          </div>

          {/* Metric Breakdown */}
          <div className="space-y-4">
            {Object.entries(metrics.quality.breakdown).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <span className="text-sm text-slate-900">{value}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review Speed Analysis */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Review Speed</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Time */}
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-green-900">Average Review Time</span>
              <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {metrics.speed.trend}
              </span>
            </div>
            <div className="text-3xl font-bold text-green-900">
              {metrics.speed.average}
            </div>
          </div>

          {/* Time Distribution */}
          <div className="space-y-4">
            {Object.entries(metrics.speed.distribution).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {key.replace('under', '< ').replace('over', '> ')}
                  </span>
                  <span className="text-sm text-slate-900">{value}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 transition-all duration-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Satisfaction Rate */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Satisfaction Rate</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Rate */}
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-purple-900">Overall Satisfaction</span>
              <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {metrics.satisfaction.trend}
              </span>
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {metrics.satisfaction.rate}%
            </div>
          </div>

          {/* Feedback Breakdown */}
          <div className="space-y-4">
            {Object.entries(metrics.satisfaction.feedback).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <span className="text-sm text-slate-900">{value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      key === 'positive' ? 'bg-green-600' :
                      key === 'neutral' ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${(value / metrics.reviews.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// Review Form Component
const PaperReviewForm = ({ paper }: { paper: Paper }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reviewedFile, setReviewedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [review, setReview] = useState<PaperReview>({
    grammar: false,
    noAiUse: false,
    noPlagiarism: false,
    noAiHumanizers: false,
    properReferencing: false,
    properFormatting: false,
    thesisStatement: false,
    topicSentences: false,
    concludingSentences: false,
    comments: ''
  });

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (30MB limit)
      if (file.size > 31457280) {
        setToastMessage('File size exceeds 30MB limit');
        setToastType('error');
        setShowToast(true);
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        setToastMessage('Invalid file type. Please upload PDF or Word documents only');
        setToastType('error');
        setShowToast(true);
        return;
      }

      setReviewedFile(file);
    }
  };

  // Handle submission to employer
  const handleSubmitToEmployer = async () => {
    if (!reviewedFile) {
      setToastMessage('Please upload the reviewed paper first');
      setToastType('error');
      setShowToast(true);
      return;
    }
    const allMetricsMet = Object.entries(review)
    .filter(([key]) => key !== 'comments')
    .every(([, value]) => value);

  if (!allMetricsMet) {
    setToastMessage('All quality metrics must be met to submit to employer');
    setToastType('error');
    setShowToast(true);
    return;
  }
    setIsSubmitting(true);
    try {
      // Add your submission logic here
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setToastMessage('Paper successfully submitted to employer');
      setToastType('success');
      setShowToast(true);
      setShowReviewForm(false);
    } catch (error) {
      setToastMessage('Failed to submit paper to employer');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle return for revision
  const handleReturnForRevision = async () => {
    if (!reviewedFile) {
      setToastMessage('Please upload the reviewed paper first');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (!review.comments.trim()) {
      setToastMessage('Please add revision comments for the writer');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Add your revision logic here
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setToastMessage('Paper returned to writer for revision');
      setToastType('success');
      setShowToast(true);
      setShowReviewForm(false);
    } catch (error) {
      setToastMessage('Failed to return paper for revision');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
      <div className="min-h-screen px-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Review Paper</h2>
              <p className="mt-1 text-sm text-slate-500">
                Order ID: {paper.orderId} | Writer ID: {paper.writerId}
              </p>
            </div>
            <button
              onClick={() => setShowReviewForm(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Review Checklist */}
            <div className="grid grid-cols-2 gap-4">
              {/* Your existing checklist items */}
            </div>
            {/* Review Metrics Checklist */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Basic Requirements */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900 mb-4">Basic Requirements</h3>
        
        {[
          { key: 'grammar', label: 'Proper Grammar', icon: <Edit className="h-4 w-4" /> },
          { key: 'noAiUse', label: 'No AI Content', icon: <Shield className="h-4 w-4" /> },
          { key: 'noPlagiarism', label: 'No Plagiarism', icon: <Ban className="h-4 w-4" /> },
          { key: 'noAiHumanizers', label: 'No AI Humanizers', icon: <AlertTriangle className="h-4 w-4" /> }
        ].map((item) => (
          <label key={item.key} className="flex items-center space-x-3 p-3 bg-slate-50 
            rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group">
            <input
              type="checkbox"
              checked={review[item.key as keyof PaperReview] as boolean}
              onChange={(e) => setReview(prev => ({
                ...prev,
                [item.key]: e.target.checked
              }))}
              className="rounded border-slate-300 text-blue-600 
                focus:ring-blue-500 transition-colors"
            />
            <div className="flex items-center space-x-2 flex-1">
              <span className={`${
                review[item.key as keyof PaperReview]
                  ? 'text-blue-600'
                  : 'text-slate-600'
              } transition-colors group-hover:scale-110 duration-300`}>
                {item.icon}
              </span>
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
            </div>
          </label>
        ))}
      </div>

    {/* Academic Requirements */}
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-900 mb-4">Academic Standards</h3>
    
    {[
      { key: 'properReferencing', label: 'Proper Referencing', icon: <FileText className="h-4 w-4" /> },
      { key: 'properFormatting', label: 'Proper Formatting', icon: <PenTool className="h-4 w-4" /> },
      { key: 'thesisStatement', label: 'Clear Thesis Statement', icon: <Star className="h-4 w-4" /> },
      { key: 'topicSentences', label: 'Strong Topic Sentences', icon: <Check className="h-4 w-4" /> },
      { key: 'concludingSentences', label: 'Effective Conclusions', icon: <CheckCircle className="h-4 w-4" /> }
    ].map((item) => (
      <label key={item.key} className="flex items-center space-x-3 p-3 bg-slate-50 
        rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group">
        <input
          type="checkbox"
          checked={review[item.key as keyof PaperReview] as boolean}
          onChange={(e) => setReview(prev => ({
            ...prev,
            [item.key]: e.target.checked
          }))}
          className="rounded border-slate-300 text-blue-600 
            focus:ring-blue-500 transition-colors"
        />
        <div className="flex items-center space-x-2 flex-1">
          <span className={`${
            review[item.key as keyof PaperReview]
              ? 'text-blue-600'
              : 'text-slate-600'
          } transition-colors group-hover:scale-110 duration-300`}>
            {item.icon}
          </span>
          <span className="text-sm font-medium text-slate-700">{item.label}</span>
        </div>
      </label>
    ))}
  </div>
</div>

{/* Review Summary */}
<div className="bg-slate-50 p-4 rounded-lg">
  <h3 className="text-sm font-medium text-slate-900 mb-3">Review Summary</h3>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
      <p className="text-xs text-slate-500">Basic Requirements</p>
      <p className="text-lg font-semibold text-slate-900">
        {Object.entries(review)
          .filter(([key]) => ['grammar', 'noAiUse', 'noPlagiarism', 'noAiHumanizers']
          .includes(key))
          .filter(([, value]) => value)
          .length
        }/4
      </p>
    </div>
    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
      <p className="text-xs text-slate-500">Academic Standards</p>
      <p className="text-lg font-semibold text-slate-900">
        {Object.entries(review)
          .filter(([key]) => ['properReferencing', 'properFormatting', 'thesisStatement', 
            'topicSentences', 'concludingSentences'].includes(key))
          .filter(([, value]) => value)
          .length
        }/5
      </p>
    </div>
    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
      <p className="text-xs text-slate-500">Overall Score</p>
      <p className="text-lg font-semibold text-slate-900">
        {Math.round(
          (Object.values(review)
            .filter(value => typeof value === 'boolean')
            .filter(Boolean).length / 9) * 100
        )}%
      </p>
    </div>
    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
      <p className="text-xs text-slate-500">Status</p>
      <p className={`text-lg font-semibold ${
        Object.values(review).filter(value => typeof value === 'boolean').every(Boolean)
          ? 'text-green-600'
          : 'text-yellow-600'
      }`}>
        {Object.values(review).filter(value => typeof value === 'boolean').every(Boolean)
          ? 'Pass'
          : 'Needs Revision'
        }
      </p>
    </div>
  </div>
</div>

            {/* Comments */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Review Comments
              </label>
              <textarea
                value={review.comments}
                onChange={(e) => setReview(prev => ({
                  ...prev,
                  comments: e.target.value
                }))}
                rows={4}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 
                  focus:ring-blue-500 focus:border-transparent"
                placeholder="Add your review comments..."
              />
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 
                hover:border-slate-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                />
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-700">
                    {reviewedFile ? reviewedFile.name : 'Upload Reviewed Paper'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    PDF or Word documents up to 30MB
                  </span>
                </div>
              </div>

              {reviewedFile && (
                <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{reviewedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(reviewedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewedFile(null)}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg 
                  transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleReturnForRevision}
                disabled={isSubmitting || !reviewedFile}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 
                  transition-colors flex items-center space-x-2 disabled:bg-yellow-300"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
                <span>Return for Revision</span>
              </button>

              <button
                onClick={handleSubmitToEmployer}
                disabled={isSubmitting || !reviewedFile}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                  transition-colors flex items-center space-x-2 disabled:bg-green-300"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                <span>Submit to Employer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Grid Component
const StatsOverview = () => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'papers' | 'earnings' | 'responseTime'>('papers');

  const mockData = [
    { date: 'Mon', papers: 12, earnings: 6000, responseTime: 2.1 },
    { date: 'Tue', papers: 15, earnings: 7500, responseTime: 1.8 },
    { date: 'Wed', papers: 18, earnings: 9000, responseTime: 2.2 },
    { date: 'Thu', papers: 14, earnings: 7000, responseTime: 2.5 },
    { date: 'Fri', papers: 21, earnings: 10500, responseTime: 1.9 },
    { date: 'Sat', papers: 13, earnings: 6500, responseTime: 2.3 },
    { date: 'Sun', papers: 16, earnings: 8000, responseTime: 2.0 },
  ];

  const chartConfig = {
    papers: {
      name: 'Papers Reviewed',
      stroke: '#3B82F6',
      fill: '#93C5FD',
      gradient: ['#3B82F6', '#60A5FA', '#93C5FD'],
    },
    earnings: {
      name: 'Earnings (KSH)',
      stroke: '#10B981',
      fill: '#6EE7B7',
      gradient: ['#059669', '#10B981', '#6EE7B7'],
    },
    responseTime: {
      name: 'Response Time (hrs)',
      stroke: '#F59E0B',
      fill: '#FCD34D',
      gradient: ['#D97706', '#F59E0B', '#FCD34D'],
    },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.stroke }}
              />
              <p className="text-slate-600">
                <span className="font-medium">{entry.name}:</span>{' '}
                {entry.dataKey === 'earnings' 
                  ? `KSH ${entry.value.toLocaleString()}`
                  : entry.value}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomizedAxisTick = ({ x, y, payload }: any) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#64748b"
          className="text-xs"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const stats = {
    papers_reviewed: {
      count: 24,
      trend: +15,
      icon: <FileCheck className="h-6 w-6 text-blue-600" />
    },
    earnings: {
      amount: 12500,
      trend: +8,
      icon: <DollarSign className="h-6 w-6 text-green-600" />
    },
    approval_rate: {
      percentage: 98,
      trend: +2,
      icon: <ThumbsUp className="h-6 w-6 text-purple-600" />
    },
    avg_response_time: {
      hours: 2.5,
      trend: -0.5,
      icon: <Clock className="h-6 w-6 text-orange-600" />
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Performance Overview</h2>
        <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setIsLoading(true);
                setTimeframe(t);
                setTimeout(() => setIsLoading(false), 500);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                timeframe === t 
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Papers Reviewed */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              {stats.papers_reviewed.icon}
            </div>
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
              stats.papers_reviewed.trend > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {stats.papers_reviewed.trend > 0 ? '+' : ''}
              {stats.papers_reviewed.trend}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <div className="h-8 bg-slate-200 rounded animate-pulse" />
            ) : (
              stats.papers_reviewed.count
            )}
          </h3>
          <p className="text-sm text-slate-500 mt-1">Papers Reviewed</p>
          <div className="mt-4 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: '85%' }}
            />
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              {stats.earnings.icon}
            </div>
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
              stats.earnings.trend > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {stats.earnings.trend > 0 ? '+' : ''}
              {stats.earnings.trend}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <div className="h-8 bg-slate-200 rounded animate-pulse" />
            ) : (
              `KSH ${stats.earnings.amount.toLocaleString()}`
            )}
          </h3>
          <p className="text-sm text-slate-500 mt-1">Total Earnings</p>
          <div className="mt-4 h-2 bg-green-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-600 transition-all duration-500"
              style={{ width: '92%' }}
            />
          </div>
        </div>

        {/* Approval Rate */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              {stats.approval_rate.icon}
            </div>
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
              stats.approval_rate.trend > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {stats.approval_rate.trend > 0 ? '+' : ''}
              {stats.approval_rate.trend}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <div className="h-8 bg-slate-200 rounded animate-pulse" />
            ) : (
              `${stats.approval_rate.percentage}%`
            )}
          </h3>
          <p className="text-sm text-slate-500 mt-1">Approval Rate</p>
          <div className="mt-4 h-2 bg-purple-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-600 transition-all duration-500"
              style={{ width: `${stats.approval_rate.percentage}%` }}
            />
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              {stats.avg_response_time.icon}
            </div>
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
              stats.avg_response_time.trend < 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {stats.avg_response_time.trend > 0 ? '+' : ''}
              {stats.avg_response_time.trend}h
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {isLoading ? (
              <div className="h-8 bg-slate-200 rounded animate-pulse" />
            ) : (
              `${stats.avg_response_time.hours}h`
            )}
          </h3>
          <p className="text-sm text-slate-500 mt-1">Avg. Response Time</p>
          <div className="mt-4 h-2 bg-orange-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-600 transition-all duration-500"
              style={{ width: '75%' }}
            />
          </div>
        </div>
      </div>




{/* Performance Chart */}
<div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Performance Trends</h3>
            <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
              {Object.entries(chartConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key as typeof activeMetric)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeMetric === key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={mockData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  {Object.entries(chartConfig).map(([key, config]) => (
                    <linearGradient
                      key={key}
                      id={`gradient-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={config.gradient[0]}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={config.gradient[2]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>

                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#E2E8F0" 
                  vertical={false} 
                />
                <XAxis 
                  dataKey="date" 
                  tick={<CustomizedAxisTick />}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />

                {Object.entries(chartConfig).map(([key, config]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={config.name}
                    stroke={config.stroke}
                    fill={`url(#gradient-${key})`}
                    strokeWidth={activeMetric === key ? 3 : 2}
                    fillOpacity={activeMetric === key ? 0.4 : 0.1}
                    dot={activeMetric === key}
                    activeDot={{
                      r: 8,
                      strokeWidth: 2,
                      stroke: '#fff',
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center space-x-6 pt-4">
            {Object.entries(chartConfig).map(([key, config]) => (
              <div 
                key={key}
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => setActiveMetric(key as typeof activeMetric)}
              >
                <div 
                  className={`w-3 h-3 rounded-full transition-transform duration-300 ${
                    activeMetric === key ? 'scale-150' : ''
                  }`}
                  style={{ backgroundColor: config.stroke }}
                />
                <span className={`text-sm ${
                  activeMetric === key 
                    ? 'text-slate-900 font-medium' 
                    : 'text-slate-600'
                }`}>
                  {config.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
};

// Recent Activity Component
const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: 'review_completed',
      paper: 'Research Paper on AI Ethics',
      timestamp: new Date(),
      status: 'approved'
    },
    {
      id: 2,
      type: 'payment_received',
      amount: 1500,
      timestamp: new Date(Date.now() - 3600000)
    },
    // Add more activities...
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
      
      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4">
            <div className={`p-2 rounded-lg ${
              activity.type === 'review_completed' 
                ? 'bg-blue-50' 
                : 'bg-green-50'
            }`}>
              {activity.type === 'review_completed' ? (
                <FileCheck className="h-5 w-5 text-blue-600" />
              ) : (
                <DollarSign className="h-5 w-5 text-green-600" />
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-sm text-slate-900">
                {activity.type === 'review_completed' ? (
                  <>Reviewed <span className="font-medium">{activity.paper}</span></>
                ) : (
                  <>Received payment of <span className="font-medium">
                    KSH {activity.amount}
                  </span></>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



// Chat Widget Component
const ChatWidget = () => {
  const [minimized, setMinimized] = useState(true);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "👋 Welcome to Eclipse Writers! How can we assist you today?",
      sender: 'support',
      timestamp: new Date(),
      read: false
    }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages(prev => [...prev, {
      id: prev.length + 1,
      text: message,
      sender: 'editor',
      timestamp: new Date()
    }]);
    setMessage('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "Support team will get back to you shortly. Average response time: 5 minutes",
        sender: 'support',
        timestamp: new Date(),
        read: false
      }]);
    }, 2000);
  };

  return (
    <>
      {/* Chat Toggle Button - Reduced size */}
      <button
        onClick={() => setMinimized(!minimized)}
        className="group relative p-3 bg-gradient-to-r from-blue-600 to-blue-700 
          text-white rounded-full shadow-lg hover:shadow-xl hover:from-blue-700 
          hover:to-blue-800 transition-all duration-300 flex items-center 
          justify-center w-12 h-12 hover:scale-110 transform"
        aria-label="Toggle Chat"
      >
        {minimized ? (
          <MessageCircle className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
        ) : (
          <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
        )}
        
        {minimized && messages.some(m => !m.read && m.sender === 'support') && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 
            rounded-full flex items-center justify-center text-xs font-bold
            animate-bounce">
            {messages.filter(m => !m.read && m.sender === 'support').length}
          </span>
        )}
      </button>
      

      {!minimized && (
        <div className="fixed bottom-20 right-6 w-80 bg-white rounded-xl 
          shadow-2xl overflow-hidden z-50 animate-slide-up border border-slate-200">
          {/* Chat Header - Now with close button */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-white/10 rounded-full">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Eclipse Support</h3>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <p className="text-xs text-blue-100">Online • 5 min response</p>
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setMinimized(true)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors 
                  duration-200 group"
                aria-label="Close chat"
              >
                <X className="h-4 w-4 text-white opacity-75 group-hover:opacity-100 
                  group-hover:rotate-90 transition-all duration-200" />
              </button>
            </div>
          </div>

          {/* Messages - Reduced height */}
          <div className="h-72 overflow-y-auto p-3 bg-gradient-to-b from-slate-50 to-white
            messages-container space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === 'editor' ? 'justify-end' : 'justify-start'
                } items-end space-x-2`}
              >
                {msg.sender === 'support' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center 
                    justify-center text-white text-xs flex-shrink-0">
                    ES
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-xl p-3 ${
                    msg.sender === 'editor'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-900 rounded-bl-none'
                  } shadow-sm`}
                >
                  <p className="text-xs whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[10px] mt-1.5 ${
                    msg.sender === 'editor' ? 'text-blue-100' : 'text-slate-500'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center 
                  justify-center text-white text-xs">
                  ES
                </div>
                <div className="bg-slate-100 rounded-full px-3 py-1.5">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" 
                      style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" 
                      style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" 
                      style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input - Reduced padding */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }} 
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-1.5 bg-slate-100 border border-transparent
                  rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent transition-all duration-300
                  placeholder-slate-400 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  hover:shadow-lg active:scale-95 transform"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Powered by Eclipse Writers Support
            </p>
          </div>
        </div>
      )}
    </>
  );
};

// WhatsApp Integration Component
const WhatsAppButton = () => {
  return (
    <Link
      href="https://wa.me/254716212152"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center"
    >
      {/* Hover Message */}
      <div className="absolute right-full mr-4 px-4 py-2 bg-white rounded-lg shadow-lg 
        transition-opacity duration-300 opacity-0 group-hover:opacity-100 pointer-events-none">
        <p className="text-sm font-medium text-green-600 whitespace-nowrap">
          Chat with Eclipse Support
        </p>
        <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 
          border-l-8 border-y-8 border-r-0 border-transparent border-l-white" />
      </div>

      {/* WhatsApp Button */}
      <div className="w-12 h-12 bg-[#25D366] rounded-full shadow-lg 
        hover:bg-[#22C55E] transition-all duration-300 flex items-center justify-center
        hover:scale-110 transform group">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 448 512"
          className="w-6 h-6 fill-white transition-transform duration-300 
            group-hover:scale-110"
        >
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
        </svg>
      </div>
    </Link>
  );
};

// Floating Support Components Container
const FloatingSupport = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
      <ChatWidget />
      <WhatsAppButton />
    </div>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.png"
                alt="Eclipse Writers"
                width={32}
                height={32}
              />
              <span className="text-lg font-bold text-slate-900">
                Eclipse Writers
              </span>
            </Link>
            <p className="text-sm text-slate-600">
              Eclipse Writers is a platform tailored to resolve quality issues that occur more oftenly between writers and employers. 
              This tool helps writers escape the challenges of distrust with some employers and promotes genuine employers alongside offering great full-time support to all users.
            </p>
          </div>

          {/* Quick Links & Legal */}
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="mailto:eclipsewriters@gmail.com" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors 
                      flex items-center space-x-2 group"
                  >
                    <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Email: seclipsewriters@gmail.com</span>
                  </a>
                </li>
                <li>
                  <Link 
                    href="/help" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors 
                      flex items-center space-x-2 group"
                  >
                    <AlertTriangle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Help Center: Chat Us</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/contact" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors 
                      flex items-center space-x-2 group"
                  >
                    <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Contact Us: 0716212152</span>
                    <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Contact Us: 0719496667</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                USE CASES
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/privacy-policy" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors 
                      flex items-center space-x-2 group"
                  >
                    <Lock className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/terms" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors 
                      flex items-center space-x-2 group"
                  >
                    <FileText className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Terms of Service</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} Eclipse Writers. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center space-x-6">
              {/* Twitter */}
              <a 
                href="https://twitter.com/eclipsewriters" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-500 transition-colors group"
              >
                <span className="sr-only">Twitter</span>
                <svg 
                  className="h-6 w-6 group-hover:scale-110 transition-transform" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a 
                href="https://wa.me/254716212152" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-500 transition-colors group"
              >
                <span className="sr-only">WhatsApp</span>
                <svg 
                  className="h-6 w-6 group-hover:scale-110 transition-transform" 
                  fill="currentColor" 
                  viewBox="0 0 448 512"
                >
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Update the main EditorDashboard component
  return (
  <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-orange-500 
  to-orange-600 text-white shadow-md">
  </div>
      {/* Mobile Sidebar Overlay */}
      {isClient && (
        <div
          className={`
            fixed inset-0 bg-slate-900/60 z-50 md:hidden backdrop-blur-sm
            ${isSidebarOpen ? 'block' : 'hidden'}
          `}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-64 bg-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed h-full">
        <div className="h-full bg-slate-800">
          <Sidebar />
        </div>
      </div>
      {showWithdrawModal && <WithdrawModal />}
      {/* Add global styles */}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <Header />

        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Tab.Group>
              <Tab.List className="flex space-x-1 rounded-xl bg-white p-1 shadow-sm mb-6">
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-slate-700
                    ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none
                    ${selected 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'hover:bg-slate-100/[0.12]'
                    }`
                  }
                >
                  Dashboard
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-slate-700
                    ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none
                    ${selected 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'hover:bg-slate-100/[0.12]'
                    }`
                  }
                >
                  Paper Queue
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-slate-700
                    ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none
                    ${selected 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'hover:bg-slate-100/[0.12]'
                    }`
                  }
                >
                  Performance
                </Tab>
              </Tab.List>

              <Tab.Panels>
                <Tab.Panel>
                  <StatsOverview />
                </Tab.Panel>
                
                <Tab.Panel>
                  <PaperQueue />
                </Tab.Panel>
                
                <Tab.Panel>
                  <PerformanceMetrics />
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </main>

        <Footer />
      </div>

      {/* Chat and Support */}
      <FloatingSupport />

      {/* Modals */}
      {showReviewForm && currentPaper && (
        <PaperReviewForm paper={currentPaper} />
      )}

      {/* Toast Notifications */}
      {showToast && (
        <div className="fixed bottom-24 right-24 z-[1000] animate-slide-up">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
            toastType === 'success' ? 'bg-green-500' :
            toastType === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          } text-white`}>
            {toastType === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : toastType === 'error' ? (
              <X className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            <p className="text-sm font-medium">{toastMessage}</p>
            <button 
              onClick={() => setShowToast(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add global styles */}
      <style jsx global>
        {`
          ${globalStyles}
        `}
      </style>
    </div>
  );
}

