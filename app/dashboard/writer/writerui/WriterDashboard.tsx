// app/dashboard/writer/WriterDashboard.tsx
'use client';

import React, { useState, Fragment, useRef, useEffect } from 'react';
import { Menu, Transition, Tab,} from '@headlessui/react';
import Link from 'next/link';
import Image from 'next/image';

import { 
  Home, FileText, Wallet2, User, Mail, Settings, 
  Star, MessageCircle, AlertTriangle, Ban, Menu as MenuIcon, CreditCard,
  LogOut, ChevronDown, Send, X, Search, Lock, Bell,
  Clock, CheckCircle, Upload, DollarSign
} from 'lucide-react';

// Global styles
const globalStyles = `
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
`;

// Interfaces
interface QAStats {
  totalAnswers: number;
  publishedAnswers: number;
  pendingAnswers: number;
  totalEarnings: number;
  averageRating: number;
}
interface QAAnswer {
  id: string;
  question: string;
  subject: string;
  preview: string;
  fullAnswer: string;
  price: number;
  rating: number;
  purchaseCount: number;
  author: string;
  createdAt: Date;
  tags: string[];
}


interface Message {
  id: number;
  text: string;
  sender: 'support' | 'user' | 'editor';  // Fixed sender types
  timestamp: Date;
  read?: boolean;
}

interface Order {
  id: number;
  title: string;
  deadline: string;
  budget: number;
  pages?: number;
  subject?: string;
  status: 'available' | 'in_progress' | 'completed' | 'disputed' | 'canceled' | 'approved';
  progress?: number;
  description?: string;
  employerId: string;
  employerName: string;
  employerAvatar?: string;
}

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface SidebarNestedItem extends SidebarItem {
  subItems?: SidebarItem[];
}


interface Notification {
  id: number;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}


export default function WriterDashboard() {
  
  // State management
const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(true);
const [isClient, setIsClient] = useState(false);
const [showToast, setShowToast] = useState(false);
const [toastMessage, setToastMessage] = useState('');
const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
const [isSidebarOpen, setSidebarOpen] = useState(true);
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [selectedAnswer, setSelectedAnswer] = useState<QAAnswer | null>(null);
const [walletBalance] = useState(10);
const [message, setMessage] = useState('');
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [sampleFile, setSampleFile] = useState<File | null>(null);
const [showDepositModal, setShowDepositModal] = useState(false);
const [showWithdrawModal, setShowWithdrawModal] = useState(false);
const [expandedItem, setExpandedItem] = useState<string | null>(null);
const subscriptionFee = 560;
const [depositPurpose, setDepositPurpose] = useState<'deposit' | 'subscription' | null>(null);


// Notifications State
const [notifications] = useState<Notification[]>([
  {
    id: 1,
    title: 'New Order Available',
    message: 'A new order matching your expertise is available. Check it out now!',
    timestamp: new Date(),
    read: false
  },
  {
    id: 2,
    title: 'Payment Received',
    message: 'Payment for order #123 has been processed and added to your wallet.',
    timestamp: new Date(),
    read: false
  }
]);

// Messages Ref
const messagesEndRef = useRef<null | HTMLDivElement>(null);

// Initial Messages
const [messages, setMessages] = useState<Message[]>([
  {
    id: 1,
    text: "👋 Welcome to Eclipse Writers! How can we assist you today?",
    sender: 'support',
    timestamp: new Date(),
    read: false
  }
]);

// Add a useEffect to automatically hide the alert after 30 seconds
useEffect(() => {
  const timer = setTimeout(() => {
    setShowSubscriptionAlert(false);
  }, 30000);

  return () => clearTimeout(timer);
}, []);

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Message handler
  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      text: message,
      sender: 'user',
      timestamp: new Date()
    }]);
    setMessage('');

    // Simulate typing indicator
    setMessages(prev => [...prev, {
      id: prev.length + 2,
      text: "Eclipse Support is typing...",
      sender: 'support',
      timestamp: new Date(),
      read: false
    }]);

    // Simulate response
    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.text !== "Eclipse Support is typing...");
        return [...filtered, {
          id: prev.length + 1,
          text: "Thank you for your message. Our support team will assist you shortly. Average response time: 5 minutes.",
          sender: 'support',
          timestamp: new Date(),
          read: false
        }];
      });
    }, 2000);
  };


const Toast = ({ message, type, onClose }: { 
    message: string; 
    type: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
  }) => {
    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500'
    }[type];
  
    const icon = {
      success: <CheckCircle className="h-5 w-5" />,
      error: <X className="h-5 w-5" />,
      info: <Bell className="h-5 w-5" />,
      warning: <AlertTriangle className="h-5 w-5" />
    }[type];
  
    return (
      <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg text-white flex items-center 
        space-x-3 shadow-lg ${bgColor} animate-slide-left`}>
        {icon}
        <span>{message}</span>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };


// Sidebar Items Configuration
const sidebarItems: SidebarNestedItem[] = [
  {
    label: "Q&A",
    icon: <MessageCircle size={20} className="text-slate-100" />,
    href: "/writer/qa",
    subItems: [
      {
        label: "Browse Questions",
        icon: <Search size={16} className="text-slate-100" />,
        href: "/writer/qa/browse"
      },
      {
        label: "My Answers",
        icon: <FileText size={16} className="text-slate-100" />,
        href: "/writer/qa/answers"
      },
      {
        label: "Earnings",
        icon: <DollarSign size={16} className="text-slate-100" />,
        href: "/writer/qa/earnings"
      }
    ]
  },
    { 
      label: "Dashboard", 
      icon: <Home size={20} className="text-slate-100" />, 
      href: "/dashboard" 
    },
    { 
      label: "Available Orders", 
      icon: <FileText size={20} className="text-slate-100" />, 
      href: "/orders/available", 
      subItems: [
        {
          label: "Private Available",
          icon: <Lock size={16} className="text-slate-100" />,
          href: "/orders/available/private",
        },
        {
          label: "Public Available",
          icon: <FileText size={16} className="text-slate-100" />,  // Replacing "Unlock" with "FileText"
          href: "/orders/available/public",
        },
        {
          label: "My Bids",
          icon: <FileText size={16} className="text-slate-100" />,  // Replacing "Unlock" with "FileText"
          href: "/orders/My Bids/",
        },
      ],
    },
    { 
      label: "My Orders", 
      icon: <FileText size={20} className="text-slate-100" />, 
      href: "/orders/my-orders",
      subItems: [
        {
          label: "Newly Posted Orders",
          icon: <FileText size={16} className="text-slate-100" />,
          href: "/orders/new"
        },
        {
          label: "Disputed Orders",
          icon: <AlertTriangle size={16} className="text-slate-100" />,
          href: "/orders/disputed"
        },
        {
          label: "Canceled Orders",
          icon: <Ban size={16} className="text-slate-100" />,
          href: "/orders/canceled"
        },
        {
          label: "Completed Orders",
          icon: <CheckCircle size={16} className="text-slate-100" />,
          href: "/orders/completed"
        },
        {
          label: "Approved Orders",
          icon: <Star size={16} className="text-slate-100" />,
          href: "/orders/approved"
        }
      ]
    },
    { 
      label: "Wallet", 
      icon: <Wallet2 size={20} className="text-slate-100" />, 
      href: "/wallet" 
    },
    { 
      label: "Profile", 
      icon: <User size={20} className="text-slate-100" />, 
      href: "/profile" 
    },
    { 
      label: "Messages", 
      icon: <Mail size={20} className="text-slate-100" />, 
      href: "/messages" 
    },
    { 
      label: "Settings", 
      icon: <Settings size={20} className="text-slate-100" />, 
      href: "/settings" 
    },
    { 
      label: "Rating", 
      icon: <Star size={20} className="text-slate-100" />, 
      href: "/rating" 
    },
    { 
      label: "General Chat", 
      icon: <MessageCircle size={20} className="text-slate-100" />, 
      href: "/chat" 
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
              {item.label === 'Messages' && notifications?.some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
            {isSidebarOpen && (
              <>
                <span className="text-sm flex-1">{item.label}</span>
                {item.subItems && (
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
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
                      transition-colors rounded-lg text-sm"
                  >
                    {subItem.icon}
                    <span>{subItem.label}</span>
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
              alt="Eclipse Writers Logo"
              width={32}
              height={32}
              className={`${!isSidebarOpen && 'w-8'}`}
            />
            <h1 className={`font-bold text-lg ${!isSidebarOpen && 'hidden'}`}>
              Eclipse Writers
            </h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="hover:bg-slate-700 p-2 rounded-lg transition-colors"
            aria-label="Toggle Sidebar"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="sidebar-content">
          <nav className="mt-6">
            <ul className="space-y-1">
              {sidebarItems.map(renderMenuItem)}
            </ul>
          </nav>
  
          {/* Quick Stats Section */}
          {isSidebarOpen && (
            <div className="mt-8 px-4 py-6 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-4">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Success Rate</p>
                  <p className="text-lg font-semibold">98%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Response Rate</p>
                  <p className="text-lg font-semibold">100%</p>
                </div>
              </div>
            </div>
          )}
  
          {/* User Status */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700
            ${!isSidebarOpen ? 'justify-center' : ''}`}>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">WR</span>
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-slate-900" />
              </div>
              {isSidebarOpen && (
                <div>
                  <p className="text-sm font-medium">Writer Name</p>
                  <p className="text-xs text-slate-400">Online</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  };


// Enhanced Header Component
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
            aria-label="Toggle Menu"
          >
            <MenuIcon className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search orders, messages, or help..."
              className="w-full px-4 py-2 pl-10 bg-slate-50 border border-slate-200 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Wallet Menu - Simplified without logout */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-2 bg-slate-50 px-4 py-2 
              rounded-lg hover:bg-slate-100 transition-colors">
              <Wallet2 className="text-slate-600" />
              <span className="text-slate-700 font-medium">
                KSH {walletBalance.toLocaleString()}
              </span>
              <ChevronDown size={16} className="text-slate-500" />
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
              <Menu.Items className="absolute right-0 mt-2 w-64 bg-white rounded-lg 
                shadow-xl py-1 z-50 border border-slate-100">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm text-slate-500">Available Balance</p>
                  <p className="text-lg font-semibold text-slate-900">
                    KSH {walletBalance.toLocaleString()}
                  </p>
                </div>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowDepositModal(true)}
                      className={`${
                        active ? 'bg-slate-50' : ''
                      } w-full px-4 py-3 text-left text-sm flex items-center space-x-3`}
                    >
                      <CreditCard className="h-5 w-5 text-slate-500" />
                      <span>Deposit Funds</span>
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      className={`${
                        active ? 'bg-slate-50' : ''
                      } w-full px-4 py-3 text-left text-sm flex items-center space-x-3`}
                    >
                      <Upload className="h-5 w-5 text-slate-500" />
                      <span>Withdraw to M-PESA</span>
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* User Profile Dropdown - With logout */}
          <Menu as="div" className="relative ml-4">
            <Menu.Button className="flex items-center space-x-2 hover:bg-slate-50 p-2 rounded-lg transition-colors">
              <div className="relative">
                <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <User size={20} className="text-slate-600" />
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <ChevronDown size={16} className="text-slate-500" />
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
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-50 border border-slate-100">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/profile"
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
                      href="/settings"
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


// Stats State
const stats = {
    walletBalance: 10,
    completedOrders: 45,
    activeOrders: 3,
    rating: 4.8,
    totalEarnings: 15000,
    successRate: 98,
    responseRate: 100,
    totalAnswers: 24,
    earnings: 12000,
    trend: +15
  };
  

  const [availableOrders] = useState<Order[]>([
    {
      id: 1,
      title: "Research Paper on Climate Change",
      deadline: "24 hours",
      budget: 2000,
      pages: 5,
      subject: "Environmental Science",
      status: "available",
      description: "Comprehensive research paper analyzing climate change impacts...",
      employerId: "EMP123",
      employerName: "John Doe",
      employerAvatar: "/avatars/employer1.jpg"
    },
    {
      id: 2,
      title: "Marketing Strategy Analysis",
      deadline: "48 hours",
      budget: 2500,
      pages: 8,
      subject: "Business",
      status: "available",
      description: "Develop a detailed marketing strategy analysis...",
      employerId: "EMP124",
      employerName: "Jane Smith",
      employerAvatar: "/avatars/employer2.jpg"
    }
  ]);
  
  // My Orders State
  const [myOrders] = useState<Order[]>([
    {
      id: 101,
      title: "Literature Review on AI Ethics",
      deadline: "12 hours",
      budget: 1500,
      status: "in_progress",
      progress: 60,
      description: "Review of ethical considerations in AI development",
      employerId: "EMP125",
      employerName: "Tech Corp"
    },
    {
      id: 102,
      title: "Psychology Case Study",
      deadline: "36 hours",
      budget: 1800,
      status: "completed",
      progress: 100,
      description: "Analysis of behavioral patterns in adolescents",
      employerId: "EMP126",
      employerName: "Research Lab"
    }
  ]);
  
  // Stats Cards Component
  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Wallet2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Available Balance</p>
            <h3 className="text-2xl font-bold text-slate-900">
              KSH {stats.walletBalance.toLocaleString()}
            </h3>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Last 30 Days</span>
            <span className="text-green-600 font-medium">+KSH 15,000</span>
          </div>
        </div>
      </div>
  
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Completed Orders</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {stats.completedOrders}
            </h3>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>98% Success Rate</span>
          </div>
        </div>
      </div>
  
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 rounded-xl">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Active Orders</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {stats.activeOrders}
            </h3>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>All deadlines on track</span>
          </div>
        </div>
      </div>
    </div>
  );
  
  const QASection = () => {
    const [qaStats] = useState<QAStats>({  
      totalAnswers: 24,
      publishedAnswers: 18,
      pendingAnswers: 6,
      totalEarnings: 12000,
      averageRating: 4.8
    });
    
    
    const [searchQuery, setSearchQuery] = useState('');
    const [mockAnswers] = useState<QAAnswer[]>([
  {
    id: '1',
    question: "What are the main factors contributing to climate change?",
    subject: "Environmental Science",
    preview: "A comprehensive analysis of greenhouse gas emissions, industrial activities, and their impact on global warming...",
    fullAnswer: "Full detailed answer about climate change factors...",
    price: 100,
    rating: 4.8,
    purchaseCount: 45,
    author: "Dr. Smith",
    createdAt: new Date('2024-03-15'),
    tags: ['Climate', 'Environment', 'Global Warming']
  },
  {
    id: '2',
    question: "Explain the concept of quantum entanglement",
    subject: "Physics",
    preview: "A detailed explanation of quantum mechanics principles and their practical applications...",
    fullAnswer: "Complete explanation of quantum entanglement...",
    price: 100,
    rating: 4.9,
    purchaseCount: 32,
    author: "Prof. Johnson",
    createdAt: new Date('2024-03-10'),
    tags: ['Quantum Physics', 'Science', 'Theory']
  },

]);

const filteredAnswers = mockAnswers.filter(answer => 
  answer.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
  answer.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
  answer.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
);
    return (
      <div className="space-y-6">
        {/* Q&A Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{qaStats.totalAnswers}</h3>
            <p className="text-sm text-slate-500 mt-1">Total Answers</p>
          </div>
  
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">
              KSH {qaStats.totalEarnings}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Q&A Earnings</p>
          </div>
  
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-xl">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{qaStats.pendingAnswers}</h3>
            <p className="text-sm text-slate-500 mt-1">Pending Review</p>
          </div>
  
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{qaStats.averageRating}</h3>
            <p className="text-sm text-slate-500 mt-1">Average Rating</p>
          </div>
        </div>
        
        {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search questions, subjects, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 bg-slate-50 border border-slate-200 
              rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        </div>
      </div>
  
        {/* Answers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAnswers.map((answer) => (
          <div key={answer.id} 
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                  {answer.subject}
                </span>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-slate-600">{answer.rating}/5</span>
                </div>
              </div>

              <h3 className="font-medium text-slate-900">{answer.question}</h3>
              <p className="text-sm text-slate-600">{answer.preview}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-slate-900">
                    KSH {answer.price}
                  </span>
                  <span className="text-sm text-slate-500">
                    {answer.purchaseCount} purchases
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedAnswer(answer);
                    setShowPaymentModal(true);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg 
                    hover:bg-slate-700 transition-colors flex items-center space-x-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Purchase</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedAnswer && (
        <PaymentModal
          answer={selectedAnswer}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedAnswer(null);
          }}
        />
      )}
    </div>
  );
};

  const PaymentModal = ({ answer, onClose }: { answer: QAAnswer; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[448px] max-w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Purchase Answer</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>
  
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl">
            <h4 className="font-medium text-slate-900">{answer.question}</h4>
            <p className="text-sm text-slate-600 mt-1">{answer.subject}</p>
          </div>
  
          <div className="flex justify-between items-center p-4 border border-slate-200 rounded-xl">
            <div>
              <p className="text-sm text-slate-600">Price</p>
              <p className="text-lg font-semibold text-slate-900">KSH {answer.price}</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>{answer.rating}/5</span>
              <span>({answer.purchaseCount} purchases)</span>
            </div>
          </div>
  
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              M-PESA Phone Number
            </label>
            <input
              type="tel"
              placeholder="e.g., 0712345678"
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-slate-500"
            />
          </div>
  
          <button 
            onClick={() => {
              // Integrate with IntaSend API here
              window.open('ISPubKey_live_11fd885a-9338-4dcf-9d74-c387f5df1c90', '_blank');
            }}
            className="w-full p-4 bg-green-600 hover:bg-green-700 text-white 
              rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <CreditCard className="h-5 w-5" />
            <span>Pay KSH {answer.price} with M-PESA</span>
          </button>
  
          <div className="flex items-center justify-center space-x-2">
            <Lock className="h-4 w-4 text-slate-400" />
            <p className="text-xs text-slate-500">
              Secure payment powered by IntaSend
            </p>
          </div>
        </div>
      </div>
    </div>
  );


  // Order Card Component
  const OrderCard = ({ order, type }: { order: Order; type: 'available' | 'my-order' }) => (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6">
      <div className="space-y-4">
        {type === 'available' && (
          <div className="flex items-center space-x-3 mb-4 border-b border-slate-100 pb-4">
            <div className="relative">
              {order.employerAvatar ? (
                <Image
                  src={order.employerAvatar}
                  alt={order.employerName}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <User size={20} className="text-slate-500" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 
                border-2 border-white rounded-full"></span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{order.employerName}</p>
              <p className="text-xs text-slate-500">ID: {order.employerId}</p>
            </div>
          </div>
        )}
  
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-lg text-slate-900">{order.title}</h4>
              {type === 'my-order' && order.status === 'in_progress' && (
                <span className="px-2.5 py-0.5 text-xs font-medium bg-yellow-100 
                  text-yellow-800 rounded-full">
                  In Progress
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              {type === 'available' && (
                <>
                  <span className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{order.subject}</span>
                  </span>
                  <span>•</span>
                  <span>{order.pages} pages</span>
                  <span>•</span>
                </>
              )}
              <span className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Deadline: {order.deadline}</span>
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700">
                KSH {order.budget.toLocaleString()}
              </span>
            </div>
          </div>
  
          {type === 'available' ? (
            <button 
              onClick={() => {}} 
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 
                transition-colors flex items-center space-x-2"
            >
              <Star className="h-4 w-4" />
              <span>Bid Now</span>
            </button>
          ) : (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              order.status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {order.status === 'completed' ? 'Completed' : 'In Progress'}
            </span>
          )}
        </div>
  
        {order.description && (
          <p className="text-sm text-slate-600 border-t border-slate-100 pt-4">
            {order.description}
          </p>
        )}
  
        {type === 'my-order' && order.progress !== undefined && (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Progress</span>
              <span className="font-medium">{order.progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-slate-800 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${order.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Started: 2 days ago</span>
              <span>Due in: {order.deadline}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
// Continue from previous code...

// File Upload Handler
const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'final' | 'sample') => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (30MB limit)
      if (file.size > 31457280) {
        alert('File size exceeds 30MB limit. Please compress your file or split it into smaller parts.');
        return;
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/javascript',
        'text/plain',
        'application/java',
        'application/x-python'
      ];
  
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please upload a supported file format.');
        return;
      }
      
      if (type === 'final') {
        setSelectedFile(file);
      } else {
        setSampleFile(file);
      }
    }
  };
  
  // File Upload Sections Component
  const FileUploadSections = () => (
    <div className="grid md:grid-cols-2 gap-6 mb-6 px-4">
      {/* Final Paper Upload */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Final Paper Upload</h3>
          <div className="p-2 bg-blue-50 rounded-lg">
            <Upload className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 
            hover:border-slate-400 transition-colors cursor-pointer bg-slate-50">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <div className="p-4 bg-white rounded-full mb-4">
                <Upload className="h-8 w-8 text-slate-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 mb-2">
                {selectedFile ? selectedFile.name : "Drop your final paper here"}
              </span>
              <span className="text-xs text-slate-500 text-center">
                Supported formats: PDF, DOC, DOCX, XLS, XLSX, CSV, SPSS, JAMOVI, PY, JS, JAVA (Max 30MB)
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'final')}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.sav,.omv,.py,.js,.java"
              />
            </label>
          </div>
  
          {selectedFile && (
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X size={18} className="text-blue-600" />
                </button>
              </div>
              <div className="mt-3 w-full bg-blue-100 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full w-full" />
              </div>
            </div>
          )}
  
          <button
            disabled={!selectedFile}
            className={`w-full py-3 px-4 rounded-lg transition-all flex items-center 
              justify-center space-x-2 ${
              selectedFile
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span>Upload Final Paper</span>
          </button>
        </div>
      </div>
  
      {/* Sample Paper Upload */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Sample Paper Upload</h3>
          <div className="p-2 bg-green-50 rounded-lg">
            <Upload className="h-5 w-5 text-green-600" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 
            hover:border-slate-400 transition-colors cursor-pointer bg-slate-50">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <div className="p-4 bg-white rounded-full mb-4">
                <Upload className="h-8 w-8 text-slate-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 mb-2">
                {sampleFile ? sampleFile.name : "Drop your sample paper here"}
              </span>
              <span className="text-xs text-slate-500 text-center">
                Supported formats: PDF, DOC, DOCX, XLS, XLSX, CSV, SPSS, JAMOVI, PY, JS, JAVA (Max 30MB)
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'sample')}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.sav,.omv,.py,.js,.java"
              />
            </label>
          </div>
  
          {sampleFile && (
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="text-green-600" size={20} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sampleFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(sampleFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSampleFile(null)}
                  className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <X size={18} className="text-green-600" />
                </button>
              </div>
              <div className="mt-3 w-full bg-green-100 rounded-full h-1.5">
                <div className="bg-green-600 h-1.5 rounded-full w-full" />
              </div>
            </div>
          )}
  
          <button
            disabled={!sampleFile}
            className={`w-full py-3 px-4 rounded-lg transition-all flex items-center 
              justify-center space-x-2 ${
              sampleFile
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span>Upload Sample Paper</span>
          </button>
        </div>
      </div>
    </div>
  );
  


// Deposit Modal Component
const DepositModal = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 w-[448px] max-w-full mx-4 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            {depositPurpose === 'subscription' ? 'Subscribe to Premium' : 'Deposit Funds'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {depositPurpose === 'subscription' 
              ? 'Unlock premium features and reduced commission' 
              : 'Monthly Writer Subscription Fee= Kshs 560'}
          </p>
        </div>
        <button 
          onClick={() => {
            setShowDepositModal(false);
            setDepositPurpose(null);
          }}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={20} className="text-slate-500" />
        </button>
      </div>

      <div className="space-y-4">
        {depositPurpose === 'subscription' && (
          <div className="bg-slate-50 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Monthly Subscription</span>
              <span className="font-semibold text-slate-900">KSH {subscriptionFee}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No commission fees on orders</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Priority order access</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>24/7 Premium support</span>
              </div>
            </div>
          </div>
        )}

        {/* M-PESA Phone Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            M-PESA Phone Number
          </label>
          <input
            type="tel"
            placeholder="e.g., 0712345678"
            className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none 
              focus:ring-2 focus:ring-slate-500"
          />
          <p className="text-xs text-slate-500">
            You will receive an M-PESA prompt on this number
          </p>
        </div>

        {/* Payment Button */}
        <button 
          onClick={() => {
            // Handle payment logic
            window.open('ISPubKey_live_11fd885a-9338-4dcf-9d74-c387f5df1c90', '_blank');
          }}
          className="w-full p-4 bg-green-600 hover:bg-green-700 text-white 
            rounded-xl transition-colors flex items-center justify-center space-x-2"
        >
          <CreditCard className="h-5 w-5" />
          <span>
            Pay KSH {depositPurpose === 'subscription' ? subscriptionFee : ''} with M-PESA
          </span>
        </button>

        {/* Security Note */}
        <div className="flex items-center justify-center space-x-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <p className="text-xs text-slate-500">
            Secure payment powered by IntaSend
          </p>
        </div>

        {/* Terms */}
        <p className="text-xs text-slate-500 text-center">
          By proceeding, you agree to our terms of service and privacy policy
        </p>
      </div>
    </div>
  </div>
);

const handleLogout = async () => {
  try {
    // Show loading toast
    setToastMessage('Logging out...');
    setToastType('info');
    setShowToast(true);

    // Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();

    // Show success message
    setToastMessage('Logged out successfully');
    setToastType('success');
    setShowToast(true);

    // Brief delay to show the success message
    setTimeout(() => {
      window.location.href = '/sign-in';
    }, 1500);

  } catch (error) {
    console.error('Logout error:', error);
    setToastMessage('Logout failed. Please try again.');
    setToastType('error');
    setShowToast(true);
  }
};

  // Withdraw Modal Component
  const WithdrawModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[448px] max-w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Withdraw Funds</h3>
            <p className="text-sm text-slate-500 mt-1">Minimum withdrawal: KSH 1,000</p>
          </div>
          <button 
            onClick={() => setShowWithdrawModal(false)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>
  
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600">Available Balance</p>
            <p className="text-2xl font-semibold text-slate-900">
              KSH {walletBalance.toLocaleString()}
            </p>
          </div>
  
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
              Withdrawal Amount (KSH)
            </label>
            <input
              type="number"
              id="amount"
              min="1000"
              max={walletBalance}
              placeholder="Enter amount"
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
  
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              M-PESA Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              placeholder="e.g., 0712345678"
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
  
          <button 
            className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 
              transition-colors flex items-center justify-center space-x-2"
          >
            <Upload className="h-5 w-5" />
            <span>Withdraw to M-PESA</span>
          </button>
  
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500 text-center">
              Withdrawals are processed within 24 hours. Contact support for any issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
 

// Modern Chat Widget Component
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

  const handleSend = () => {
    if (!message.trim()) return;

    // Add user message
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      text: message,
      sender: 'user',  // Fixed from 'employer' to 'user'
      timestamp: new Date()
    }]);
    setMessage('');
    setIsTyping(true);

    // Add support response
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  // WhatsApp Button Component
  const WhatsAppButton = () => {
    if (!isClient) return null; // Client-side check
  
    return (
      <Link
        href="https://wa.me/254716212152"
        target="_blank"
        rel="noopener noreferrer"
        className="group"
      >
        <div className="relative flex items-center">
          {/* Hover Message */}
          <div className="absolute right-full mr-4 px-4 py-2 bg-white rounded-lg shadow-lg 
            transition-opacity duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap">
            <p className="text-slate-800 text-sm font-medium">Contact Eclipse Admin</p>
            <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 
              border-l-8 border-y-8 border-r-0 border-transparent border-l-white"/>
          </div>
          
          {/* WhatsApp Button */}
          <div className="relative flex items-center justify-center w-14 h-14 bg-[#25D366] 
            rounded-full shadow-lg hover:bg-[#1ea952] transition-all duration-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 448 512"
              className="w-7 h-7 fill-white"
            >
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
            </svg>
          </div>
        </div>
      </Link>
    );
  };
  
  // Floating Components Wrapper
  const FloatingComponents = () => {
    if (!isClient) return null;
  
    return (
      <div className="fixed bottom-24 right-6 z-[999] flex flex-col items-end gap-4">
        <ChatWidget />
        <WhatsAppButton />
      </div>
    );
  };


// Footer Component
const Footer = () => (
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
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-2"
                  >
                    <Mail size={16} />
                    <span>Email: seclipsewriters@gmail.com</span>
                  </a>
                </li>
                <li>
                  <Link 
                    href="/help" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-2"
                  >
                    <AlertTriangle size={16} />
                    <span>Help Center: Chat Us</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/faq" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-2"
                  >
                    <MessageCircle size={16} />
                    <span>Contact Us: 0716212152</span>
                    <MessageCircle size={16} />
                    <span>Contact Us: 071946667</span>
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
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-2"
                  >
                    <Lock size={16} />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/terms" 
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-2"
                  >
                    <FileText size={16} />
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
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
  
              {/* WhatsApp */}
              <a 
                href="https://wa.me/254716212152" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <span className="sr-only">WhatsApp</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 448 512">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
  

// Main Return Statement
return (
  <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isClient && (
        <div className={`
          fixed inset-0 bg-slate-900/60 z-50 md:hidden backdrop-blur-sm
          ${isSidebarOpen ? 'block' : 'hidden'}
        `}
        onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-y-0 left-0 w-64 bg-slate-800" 
            onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}
       {showToast && (
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setShowToast(false)}
      />
    )}
  
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed h-full">
        <div className="h-full bg-slate-800 sidebar-content">
          <Sidebar />
        </div>
      </div>
  
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <Header />
  
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6">
            {/* Subscription Alert */}
            <>
            {showSubscriptionAlert && (
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 
                rounded-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 
                shadow-lg shadow-orange-500/10">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6" />
                  <span>When you lack an active subscription, you will be charged 7.0% commission on each order. Kindly permit Eclipse Writers to charge you Kshs. 10 per page to compensate our editors who help you get your orders approved by the employers.</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => {
                      console.log('Subscribe button clicked');
                      setDepositPurpose('subscription');
                      setShowDepositModal(true);
                    }} 
                    className="whitespace-nowrap px-6 py-2 bg-white text-orange-600 
                      rounded-lg hover:bg-orange-50 transition-colors font-medium"
                  >
                    Subscribe Now
                  </button>
                  <button
                    onClick={() => setShowSubscriptionAlert(false)}
                    className="p-2 hover:bg-orange-400 rounded-full transition-colors"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </div>
            )}
          </>
            {/* Stats Cards */}
            <StatsCards />
            
            {/* Orders Section */}
            <div className="bg-white rounded-xl shadow-sm mb-6">
            <Tab.Group>
                  <Tab.List className="flex p-1 space-x-1 bg-slate-50 rounded-t-xl">
                    {['Available Orders', 'My Orders', 'Q&A'].map((category) => (
                      <Tab
                        key={category}
                        className={({ selected }) =>
                          `w-full py-3 text-sm font-medium leading-5 rounded-lg
                          ${selected 
                            ? 'bg-white shadow text-slate-900' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/[0.12]'
                          }`
                        }
                      >
                        {category}
                      </Tab>
                    ))}
                  </Tab.List>
                  <Tab.Panels className="p-4">
                    <Tab.Panel className="space-y-4">
                      {availableOrders.map(order => (
                        <OrderCard key={order.id} order={order} type="available" />
                      ))}
                    </Tab.Panel>
                    <Tab.Panel className="space-y-4">
                      {myOrders.map(order => (
                        <OrderCard key={order.id} order={order} type="my-order" />
                      ))}
                    </Tab.Panel>
                    <Tab.Panel>
                      <QASection />
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
            </div>
  
            {/* File Upload Section */}
            <FileUploadSections />
          </div>
        </main>
  
        <Footer />
      </div>
  
      {/* Modals */}
      {showDepositModal && <DepositModal />}
      {showWithdrawModal && <WithdrawModal />}
      
      {/* Floating Components */}
      {isClient && <FloatingComponents />}
  
      {/* Add global styles */}
      <style jsx global>
        {globalStyles}
      </style>
    </div>
  );
}