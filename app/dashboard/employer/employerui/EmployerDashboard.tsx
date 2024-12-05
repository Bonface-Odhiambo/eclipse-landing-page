// app/dashboard/employer/EmployerDashboard.tsx
'use client';

import React, { useState, Fragment, useRef, useEffect } from 'react';
import { Menu, Transition, Tab, Popover, Dialog } from '@headlessui/react';
import Link from 'next/link';
import Image from 'next/image';

import { 
  Home, FileText, Wallet2, User, Mail, Settings, Calendar,
  Star, MessageCircle, AlertTriangle, Ban, Menu as MenuIcon, 
  Bell, LogOut, ChevronDown, Send, X, Clock, CheckCircle, Upload, CreditCard, Lock,
  Plus, UserPlus, DollarSign, FileUp, Edit,
  Users, Shield, Clock4, Search, HelpCircle,
  ArrowRight, BookOpen, 
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

  .order-form-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .form-section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .input-group {
    margin-bottom: 16px;
  }

  .input-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .text-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;
  }

  .text-input:focus {
    outline: none;
    border-color: #6B7280;
    ring: 2px solid #6B7280;
  }

  .file-upload-area {
    border: 2px dashed #E5E7EB;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .file-upload-area:hover {
    border-color: #6B7280;
  }

  .subscription-card {
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
  }

  .subscription-card:hover {
    border-color: #6B7280;
    transform: translateY(-2px);
  }

  .writer-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
  }

  .writer-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
  }

  .badge-success {
    background-color: #DEF7EC;
    color: #03543F;
  }

  .badge-warning {
    background-color: #FEF3C7;
    color: #92400E;
  }

  .badge-error {
    background-color: #FEE2E2;
    color: #991B1B;
  }

  .tooltip {
    position: relative;
    display: inline-block;
  }

  .tooltip-content {
    visibility: hidden;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px;
    background-color: #1F2937;
    color: white;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
  }

  .tooltip:hover .tooltip-content {
    visibility: visible;
  }
`;

// Add these interface definitions after the global styles

interface QAContent {
  id: string;
  title: string;
  subject: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

interface Question extends QAContent {
  answerCount: number;
  status: 'pending' | 'answered' | 'closed';
}

interface Answer extends QAContent {
  questionId: string;
  price: number; // Fixed at 100 KSH
  isPurchased: boolean;
  rating?: number;
  preview: string;
}
interface SidebarNestedItem {
    label: string;
    icon: React.ReactNode;
    href: string;
    subItems?: SidebarItem[];
  }
  
  interface SidebarItem {
    label: string;
    icon: React.ReactNode;
    href: string;
  }
  
  interface OrderFormData {
    title: string;
    description: string;
    budget: number;
    deadline: string;
    subject: string;
    pages: number;
    wordCount: number;
    paperFormat: string;
    references: number;
    technicalRequirements: string[];
    isPrivate: boolean;
  }
  interface Writer {
    id: string;
    name: string;
    rating: number;
    completedOrders: number;
    successRate: number;
    expertise: string[];
    isPrivate: boolean;
    avatar?: string;
  }
  
  interface Order {
    id: number;
    title: string;
    description: string;
    budget: number;
    deadline: string;
    status: 'draft' | 'posted' | 'in_progress' | 'completed' | 'disputed' | 'canceled';
    subject?: string;
    pages?: number;
    wordCount?: number;
    technicalRequirements?: string[];
    attachments?: File[];
    isPrivate?: boolean;
    selectedWriters?: Writer[];
    bids?: Bid[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  interface Bid {
    id: string;
    writerId: string;
    writerName: string;
    orderId: string;
    amount: number;
    proposal: string;
    timestamp: Date;
  }
  
  interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'order' | 'bid' | 'payment' | 'system';
    timestamp: Date;
    read: boolean;
  }
  
  interface Message {
    id: number;
    text: string;
    sender: 'employer' | 'support';
    timestamp: Date;
    read?: boolean;
  }
  
  interface Subscription {
    id: string;
    type: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'expired';
    expiresAt: Date;
    features: string[];
    price: number;
  }

export default function EmployerDashboard() {
    // Core state management
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
    const [isClient, setIsClient] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isChatOpen, setChatOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [showMoneyBackModal, setShowMoneyBackModal] = useState(false);
    const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
   
  
    // Order management state
    const [orders, setOrders] = useState<Order[]>([]);
    const [draftOrders, setDraftOrders] = useState<Order[]>([]);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [orderFiles, setOrderFiles] = useState<File[]>([]);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [orderFormData, setOrderFormData] = useState<OrderFormData>({
      title: '',
      description: '',
      budget: 0,
      deadline: '',
      subject: '',
      pages: 0,
      wordCount: 0,
      paperFormat: 'APA', // Default value
      references: 0,
      technicalRequirements: [], // Initialize as empty array
      isPrivate: false
    });
    
    // Writer management state
    const [privateWriters, setPrivateWriters] = useState<Writer[]>([]);
    const [publicWriters, setPublicWriters] = useState<Writer[]>([]);
    const [selectedWriters, setSelectedWriters] = useState<Writer[]>([]);
    const [writerSearchQuery, setWriterSearchQuery] = useState('');
    
  
    // Subscription and wallet state
    const [subscription, setSubscription] = useState<Subscription>({
      id: '1',
      type: 'basic',
      status: 'inactive',
      expiresAt: new Date(),
      features: ['Basic Support', 'Public Writers Access'],
      price: 49.99
    });
    
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositPurpose, setDepositPurpose] = useState<'order' | 'subscription' | 'answer_purchase' | null>(null);
  
    // Notifications state
    const [notifications, setNotifications] = useState<Notification[]>([
      {
        id: 1,
        title: 'New Bid Received',
        message: 'A writer has placed a bid on your order "Research Paper on AI"',
        type: 'bid',
        timestamp: new Date(),
        read: false
      },
      {
        id: 2,
        title: 'Subscription Expiring',
        message: 'Your premium subscription will expire in 3 days',
        type: 'system',
        timestamp: new Date(),
        read: false
      }
    ]);
  
    // Messages state
    const [messages, setMessages] = useState<Message[]>([
      {
        id: 1,
        text: "👋 Welcome to Eclipse Writers! How can we assist you today?",
        sender: 'support',
        timestamp: new Date(),
        read: false
      }
    ]);
  
    // Client-side initialization
    useEffect(() => {
      setIsClient(true);
    }, []);
  
    // Message scroll effect
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
  
    // Order management handlers
    const handleCreateOrder = (isDraft: boolean = false) => {
      const newOrder: Order = {
        id: orders.length + 1,
        ...orderFormData,
        status: isDraft ? 'draft' : 'posted',
        attachments: orderFiles,
        bids: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
  
      if (isDraft) {
        setDraftOrders(prev => [...prev, newOrder]);
      } else {
        setOrders(prev => [...prev, newOrder]);
      }
      
  
      // Reset form
      setOrderFormData({
        title: '',
        description: '',
        budget: 0,
        deadline: '',
        subject: '',
        pages: 0,
        wordCount: 0,
        paperFormat: 'APA',  // Add this
        references: 0,       // Add this
        technicalRequirements: [],
        isPrivate: false
      });
      setOrderFiles([]);
      setShowOrderForm(false);
    };

    const handleLogout = async () => {
      try {
        // Show loading toast
        setToastMessage('Logging out...');
        setToastType('info');
        setShowToast(true);
    
        // Add any API logout call here if needed
        // const response = await fetch('/api/auth/logout', ...);
    
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
    
        // Show success toast
        setToastMessage('Logged out successfully');
        setToastType('success');
        setShowToast(true);
    
        // Redirect after a brief delay
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

    // File upload handler
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        const newFiles = Array.from(files).filter(file => {
          const isValidSize = file.size <= 52428800; // Increased to 50MB limit
          const acceptedTypes = [
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            // Images
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            // Archives
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            // Other
            'application/rtf',
            'text/rtf',
            'application/x-latex',
            'application/x-tex'
          ];
    
          const isValidType = acceptedTypes.includes(file.type);
    
          if (!isValidSize) {
            alert(`File ${file.name} exceeds 50MB limit`);
          }
          if (!isValidType) {
            alert(`File ${file.name} is not a supported format`);
          }
    
          return isValidSize && isValidType;
        });
    
        setOrderFiles(prev => [...prev, ...newFiles]);
      }
    };
    
    // Writer management handlers
    const toggleWriterPrivate = (writerId: string) => {
      const writer = publicWriters.find(w => w.id === writerId);
      if (writer) {
        setPrivateWriters(prev => [...prev, { ...writer, isPrivate: true }]);
        setPublicWriters(prev => prev.filter(w => w.id !== writerId));
      }
    };
  
    // Deposit handler
const handleDeposit = async () => {
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }
  
      try {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setWalletBalance(prev => prev + parseFloat(depositAmount));
        setShowDepositModal(false);
        setDepositAmount('');
        setDepositPurpose(null);
        
        setNotifications(prev => [...prev, {
          id: Date.now(),
          title: 'Deposit Successful',
          message: `Successfully deposited KSH ${depositAmount}`,
          type: 'payment',
          timestamp: new Date(),
          read: false
        }]);
      } catch (error) {
        alert('Deposit failed. Please try again.');
      }
    };
  
    // Message handler
const handleSend = () => {
      if (!message.trim()) return;
      
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: message,
        sender: 'employer',
        timestamp: new Date()
      }]);
      setMessage('');
  
      // Simulate response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: "Thank you for your message. Our support team will assist you shortly.",
          sender: 'support',
          timestamp: new Date(),
          read: false
        }]);
      }, 1000);
    };
  
    // Helper function for date formatting
    const formatDate = (date: Date): string => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    };
  
    // Helper function for currency formatting
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0
      }).format(amount);
    };

  // Enhanced Sidebar Component
  const Sidebar = () => {
    // Sidebar Items Configuration
    const sidebarItems: SidebarNestedItem[] = [
      {
        label: "Q&A",
        icon: <BookOpen size={20} className="text-slate-100" />,
        href: "/employer/qa",
        subItems: [
          {
            label: "Search Q&A",
            icon: <Search size={16} className="text-slate-100" />,
            href: "/employer/qa/search"
          },
          {
            label: "My Purchased Answers",
            icon: <Lock size={16} className="text-slate-100" />,
            href: "/employer/qa/purchased"
          }
        ]
      },
      { 
        label: "Dashboard", 
        icon: <Home size={20} className="text-slate-100" />, 
        href: "/employer/dashboard" 
      },
      { 
        label: "Orders", 
        icon: <FileText size={20} className="text-slate-100" />, 
        href: "/employer/orders",
        subItems: [
          {
            label: "Create Order",
            icon: <Plus size={16} className="text-slate-100" />,
            href: "/employer/orders/create"
          },
          {
            label: "Active Orders",
            icon: <Clock4 size={16} className="text-slate-100" />,
            href: "/employer/orders/active"
          },
          {
            label: "Completed Orders",
            icon: <CheckCircle size={16} className="text-slate-100" />,
            href: "/employer/orders/completed"
          },
          {
            label: "Draft Orders",
            icon: <Edit size={16} className="text-slate-100" />,
            href: "/employer/orders/drafts"
          },
          {
            label: "Disputed Orders",
            icon: <AlertTriangle size={16} className="text-slate-100" />,
            href: "/employer/orders/disputed"
          }
        ]
      },
      { 
        label: "Writers", 
        icon: <Users size={20} className="text-slate-100" />, 
        href: "/employer/writers",
        subItems: [
          {
            label: "Find Writers",
            icon: <Search size={16} className="text-slate-100" />,
            href: "/employer/writers/find"
          },
          {
            label: "Private Writers",
            icon: <UserPlus size={16} className="text-slate-100" />,
            href: "/employer/writers/private"
          },
          {
            label: "Blocked Writers",
            icon: <Ban size={16} className="text-slate-100" />,
            href: "/employer/writers/blocked"
          }
        ]
      },
      { 
        label: "Wallet", 
        icon: <Wallet2 size={20} className="text-slate-100" />, 
        href: "/employer/wallet",
        subItems: [
          {
            label: "Deposit Funds",
            icon: <DollarSign size={16} className="text-slate-100" />,
            href: "/employer/wallet/deposit"
          },
          {
            label: "Subscription",
            icon: <Star size={16} className="text-slate-100" />,
            href: "/employer/wallet/subscription"
          },
          {
            label: "Transaction History",
            icon: <Clock size={16} className="text-slate-100" />,
            href: "/employer/wallet/history"
          }
        ]
      },
      { 
        label: "Messages", 
        icon: <Mail size={20} className="text-slate-100" />, 
        href: "/employer/messages" 
      },
      { 
        label: "Profile", 
        icon: <User size={20} className="text-slate-100" />, 
        href: "/employer/profile" 
      },
      { 
        label: "Settings", 
        icon: <Settings size={20} className="text-slate-100" />, 
        href: "/employer/settings" 
      },
      { 
        label: "Support", 
        icon: <HelpCircle size={20} className="text-slate-100" />, 
        href: "/employer/support" 
      }
    ];
  
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
  
          {/* Stats Section */}
          {isSidebarOpen && (
            <div className="mt-8 px-4 py-6 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-4">
                Account Overview
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Active Orders</p>
                  <p className="text-lg font-semibold">
                    {orders.filter(o => o.status === 'in_progress').length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Subscription Status</p>
                  <p className="text-lg font-semibold">
                    {subscription.status === 'active' ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          )}
  
          {/* User Status */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">EM</span>
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-slate-900" />
              </div>
              {isSidebarOpen && (
                <div>
                  <p className="text-sm font-medium">Employer Name</p>
                  <p className="text-xs text-slate-400">Premium Account</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    );
  };
  
  const mockAnswers: Answer[] = [
    {
      id: "1",
      questionId: "q1",
      title: "How to implement binary search in Python?",
      subject: "Computer Science",
      content: "Here's a detailed implementation of binary search in Python with time complexity analysis...",
      preview: "Binary search is an efficient algorithm for searching sorted arrays. The basic steps include...",
      author: {
        id: "a1",
        name: "John Developer"
      },
      price: 100,
      isPurchased: false,
      rating: 4.8,
      createdAt: new Date('2024-03-15')
    },
    {
      id: "2", 
      questionId: "q2",
      title: "Explain the causes of World War I",
      subject: "History",
      content: "The major causes of World War I included nationalism, imperialism, militarism, and alliance systems...",
      preview: "World War I was triggered by multiple complex factors including international tensions...",
      author: {
        id: "a2",
        name: "History Expert"
      },
      price: 100,
      isPurchased: false,
      rating: 4.9,
      createdAt: new Date('2024-03-16')
    },
    {
      id: "3",
      questionId: "q3", 
      title: "Solving quadratic equations step-by-step",
      subject: "Mathematics",
      content: "To solve quadratic equations, follow these steps: 1) Put in standard form ax² + bx + c = 0...",
      preview: "Quadratic equations can be solved using multiple methods including factoring...",
      author: {
        id: "a3",
        name: "Math Tutor"
      },
      price: 100,
      isPurchased: false,
      rating: 4.7,
      createdAt: new Date('2024-03-17')
    }
  ];
  
  const mockQuestions: Question[] = [
    {
      id: "q1",
      title: "Binary Search Implementation",
      subject: "Computer Science",
      content: "What's the most efficient way to implement binary search in Python?",
      author: {
        id: "u1",
        name: "Student123"
      },
      createdAt: new Date('2024-03-15'),
      answerCount: 3,
      status: 'answered'
    },
  ];

  const QASection = () => {
    const [activeTab, setActiveTab] = useState<'browse' | 'purchased'>('browse');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [answers, setAnswers] = useState<Answer[]>(mockAnswers);
    const [purchasedAnswers, setPurchasedAnswers] = useState<Answer[]>([]);
  
    const handlePurchaseAnswer = (answerId: string) => {
      if (walletBalance >= 100) {
        setWalletBalance(prev => prev - 100);
        const purchased = answers.find(a => a.id === answerId);
        if (purchased) {
          setPurchasedAnswers(prev => [...prev, {...purchased, isPurchased: true}]);
          setAnswers(prev => prev.map(a => 
            a.id === answerId ? {...a, isPurchased: true} : a
          ));
          
          setToastMessage('Answer purchased successfully!');
          setToastType('success');
          setShowToast(true);
        }
      } else {
        setDepositPurpose('answer_purchase');
        setShowDepositModal(true);
      }
    };
  
    return (
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('browse')}
                className={`${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Browse Answers
              </button>
              <button
                onClick={() => setActiveTab('purchased')}
                className={`${
                  activeTab === 'purchased'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                My Purchased Answers
              </button>
            </nav>
          </div>
        </div>
  
        {/* Search and Filters */}
        {activeTab === 'browse' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search answers..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Computer Science">Computer Science</option>
                <option value="History">History</option>
                {/* Add more subjects */}
              </select>
            </div>
          </div>
        )}
  
        {/* Answer Cards */}
        <div className="space-y-4">
          {(activeTab === 'browse' ? answers : purchasedAnswers)
            .filter(answer => 
              (selectedSubject === 'all' || answer.subject === selectedSubject) &&
              (answer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               answer.content.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map((answer) => (
              <div key={answer.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{answer.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{answer.subject}</p>
                  </div>
                  {!answer.isPurchased && (
                    <button
                      onClick={() => handlePurchaseAnswer(answer.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                        transition-colors flex items-center space-x-2"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Purchase for KSH 100</span>
                    </button>
                  )}
                </div>
                
                <p className="mt-4 text-gray-600">
                  {answer.isPurchased ? answer.content : answer.preview}
                </p>
  
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="ml-1 text-sm text-gray-600">{answer.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      By {answer.author.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(answer.createdAt)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Header Component
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
                placeholder="Search orders, writers, or help..."
                className="w-full px-4 py-2 pl-10 bg-slate-50 border border-slate-200 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-5 h-5" />
              </span>
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
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
                    <div className="mt-4 space-y-3">
                      {notifications.map(notification => (
                        <div 
                          key={notification.id}
                          className={`p-3 rounded-lg ${
                            notification.read ? 'bg-white' : 'bg-blue-50'
                          }`}
                        >
                          <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                          <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {formatDate(notification.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>
            </Popover>
  
            {/* User Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 hover:bg-slate-50 p-2 
                rounded-lg transition-colors">
                <div className="relative">
                  <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User size={20} className="text-slate-600" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full 
                    border-2 border-white" />
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
                 {/* Right Section - Modify Menu.Items for the user dropdown */}
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

const getMinDate = () => {
  const now = new Date();
  now.setHours(now.getHours() + 1); // Minimum 1 hour from now
  return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
};

const isValidDeadline = (dateTimeString: string) => {
  const selectedDate = new Date(dateTimeString);
  const minDate = new Date(getMinDate());
  return selectedDate > minDate;
};

const OrderForm = () => {
  const fileInputRef = useRef(null);
  
  const [orderFormData, setOrderFormData] = useState({
    title: '',
    subject: '',
    description: '',
    budget: 0,
    pages: 0,
    paperFormat: 'APA',
    references: 0,
    deadline: new Date().toISOString().split('.')[0],
    isPrivate: false
  });

  const [orderFiles, setOrderFiles] = useState([]);
  
  const validateOrderForm = () => {
    if (!orderFormData.title?.trim()) {
      setToastMessage('Please enter an order title');
      setToastType('error');
      setShowToast(true);
      return false;
    }
    if (!orderFormData.description?.trim()) {
      setToastMessage('Please provide a description');
      setToastType('error');
      setShowToast(true);
      return false;
    }
    if (!orderFormData.budget || orderFormData.budget <= 0) {
      setToastMessage('Please enter a valid budget');
      setToastType('error');
      setShowToast(true);
      return false;
    }
    if (!orderFormData.deadline) {
      setToastMessage('Please set a deadline');
      setToastType('error');
      setShowToast(true);
      return false;
    }
    if (!isValidDeadline(orderFormData.deadline)) {
      setToastMessage('Deadline must be at least 1 hour from now');
      setToastType('error');
      setShowToast(true);
      return false;
    }
    if (!orderFormData.subject) {
      setToastMessage('Please select a subject area');
      setToastType('error');
      setShowToast(true);
      return false;
    }
    return true;
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateOrderForm()) return;

    const platformFee = subscription.status === 'active' ? 0 : (orderFormData.budget * 0.09);
    const totalAmount = orderFormData.budget + platformFee;

    setDepositPurpose('order');
    setDepositAmount(totalAmount.toString());
    
    setCurrentOrder({
      id: orders.length + 1,
      ...orderFormData,
      status: 'draft',
      attachments: orderFiles,
      bids: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    setShowDepositModal(true);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setOrderFiles(prev => [...prev, ...files]);
  };

  return (
    <form onSubmit={handleOrderSubmit} className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-lg p-8 border border-slate-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Create New Order
        </h2>
        <p className="text-slate-600 mt-2">Fill in the details below to create your order</p>
      </div>
      
      <div className="space-y-8">
        {/* Basic Order Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="group">
            <label className="block text-sm font-medium mb-2 text-slate-700 group-hover:text-blue-600 transition-colors">
              Order Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orderFormData.title}
              onChange={(e) => setOrderFormData(prev => ({
                ...prev,
                title: e.target.value
              }))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all
                hover:border-blue-300 bg-white shadow-sm"
              placeholder="Enter a descriptive title"
              required
            />
          </div>

          <div className="group">
            <label className="block text-sm font-medium mb-2 text-slate-700 group-hover:text-purple-600 transition-colors">
              Subject Area <span className="text-red-500">*</span>
            </label>
            <select
              value={orderFormData.subject}
              onChange={(e) => setOrderFormData(prev => ({
                ...prev,
                subject: e.target.value
              }))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all
                hover:border-purple-300 bg-white shadow-sm appearance-none cursor-pointer"
              required
            >
              <option value="">Select Subject</option>
              <option value="technical">Technical Writing</option>
              <option value="academic">Academic Writing</option>
              <option value="business">Business Writing</option>
              <option value="creative">Creative Writing</option>
            </select>
          </div>
        </div>

        {/* Order Description */}
        <div className="group">
          <label className="block text-sm font-medium mb-2 text-slate-700 group-hover:text-indigo-600 transition-colors">
            Order Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={orderFormData.description}
            onChange={(e) => setOrderFormData(prev => ({
              ...prev,
              description: e.target.value
            }))}
            rows={6}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all
              hover:border-indigo-300 bg-white shadow-sm resize-none"
            placeholder="Provide detailed instructions for your order..."
            required
          />
        </div>

        {/* Order Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group">
            <label className="block text-sm font-medium mb-2 text-slate-700 group-hover:text-green-600 transition-colors">
              Budget (KSH) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                KSH
              </span>
              <input
                type="number"
                value={orderFormData.budget || ''}
                onChange={(e) => setOrderFormData(prev => ({
                  ...prev,
                  budget: parseFloat(e.target.value)
                }))}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                  focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all
                  hover:border-green-300 bg-white shadow-sm"
                placeholder="Enter budget"
                min="100"
                required
              />
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium mb-2 text-slate-700 group-hover:text-yellow-600 transition-colors">
              Number of Pages
            </label>
            <input
              type="number"
              value={orderFormData.pages || ''}
              onChange={(e) => setOrderFormData(prev => ({
                ...prev,
                pages: parseInt(e.target.value)
              }))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all
                hover:border-yellow-300 bg-white shadow-sm"
              placeholder="Enter pages"
              min="1"
            />
          </div>

          <div className="group">
            <label className="block text-sm font-medium mb-2 text-slate-700 group-hover:text-rose-600 transition-colors">
              Paper Format <span className="text-red-500">*</span>
            </label>
            <select
              value={orderFormData.paperFormat}
              onChange={(e) => setOrderFormData(prev => ({
                ...prev,
                paperFormat: e.target.value
              }))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all
                hover:border-rose-300 bg-white shadow-sm appearance-none cursor-pointer"
              required
            >
              <option value="APA">APA</option>
              <option value="MLA">MLA</option>
              <option value="Chicago">Chicago</option>
              <option value="Harvard">Harvard</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="group">
            <label className="block text-sm font-medium mb-2 text-slate-700 group-hover:text-teal-600 transition-colors">
              Number of References
            </label>
            <input
              type="number"
              value={orderFormData.references || ''}
              onChange={(e) => setOrderFormData(prev => ({
                ...prev,
                references: parseInt(e.target.value)
              }))}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all
                hover:border-teal-300 bg-white shadow-sm"
              placeholder="Enter number of references"
              min="0"
            />
          </div>
        </div>

        {/* Deadline Section */}
        <div className="group bg-white p-6 rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-all">
          <label className="block text-sm font-medium mb-4 text-slate-700 group-hover:text-blue-600 transition-colors">
            Deadline <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div className="relative">
              <input
                type="date"
                value={orderFormData.deadline.split('T')[0]}
                onChange={(e) => {
                  const currentTime = orderFormData.deadline.split('T')[1] || '00:00';
                  setOrderFormData(prev => ({
                    ...prev,
                    deadline: `${e.target.value}T${currentTime}`
                  }));
                }}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all
                  hover:border-blue-300 bg-white shadow-sm"
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 pointer-events-none" />
            </div>

            {/* Time Selection */}
            <div className="relative">
              <input
                type="time"
                value={orderFormData.deadline.split('T')[1] || '00:00'}
                onChange={(e) => {
                  const currentDate = orderFormData.deadline.split('T')[0] || new Date().toISOString().split('T')[0];
                  setOrderFormData(prev => ({
                    ...prev,
                    deadline: `${currentDate}T${e.target.value}`
                  }));
                }}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none 
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all
                  hover:border-blue-300 bg-white shadow-sm"
                required
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 pointer-events-none" />
            </div>
          </div>

          {/* Timezone Information */}
          <div className="flex items-center space-x-2 text-sm text-slate-500 mt-4">
            <Clock4 className="h-4 w-4 text-blue-500" />
            <span>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>

          {/* Deadline Preview */}
          {orderFormData.deadline && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Your deadline will be:</p>
              <p className="text-base text-blue-800 font-semibold mt-1">
                {new Date(orderFormData.deadline).toLocaleString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>

        {/* File Upload Section */}
        <div className="group bg-white border-2 border-dashed border-slate-200 rounded-lg p-6 transition-all 
          hover:border-purple-300 hover:bg-purple-50">
          <div className="text-center">
            <div className="mx-auto flex flex-col items-center">
              <Upload className="h-12 w-12 text-purple-400 mb-4" />
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                      transition-colors text-base flex items-center space-x-2 shadow-md hover:shadow-lg"
                  >
                    <FileUp className="h-5 w-5" />
                    <span>Choose Files</span>
                  </button>
                  <span className="text-sm text-slate-500">or drag and drop</span>
                </div>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.rtf,.tex"
          />

          <p className="text-sm text-slate-500 text-center mt-4">
            Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, JPG, PNG, GIF, WEBP, ZIP, RAR, RTF, TEX (Max 50MB)
          </p>

          {/* File List */}
          {orderFiles.length > 0 && (
            <div className="mt-6 space-y-2 max-h-48 overflow-y-auto">
              {orderFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100
                    hover:border-purple-200 hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileText className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderFiles(prev => prev.filter((_, i) => i !== index))}
                    className="p-1.5 hover:bg-purple-100 rounded-full transition-colors flex-shrink-0 ml-2"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4 text-purple-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Status */}
          {orderFiles.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-purple-600 font-medium">
                {orderFiles.length} file{orderFiles.length !== 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={() => setOrderFiles([])}
                className="text-red-600 hover:text-red-700 transition-colors font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Writer Access Options */}
        <div className="group">
          <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-slate-200 
            hover:border-green-300 transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={orderFormData.isPrivate}
              onChange={(e) => setOrderFormData(prev => ({
                ...prev,
                isPrivate: e.target.checked
              }))}
              className="rounded border-slate-300 text-green-600 focus:ring-green-500 w-5 h-5"
            />
            <span className="text-base text-slate-700">
              Make this order private (only selected writers can view and bid)
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => handleCreateOrder(true)}
            className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg 
              transition-colors font-medium"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg 
              hover:from-blue-700 hover:to-purple-700 transition-colors font-medium shadow-md 
              hover:shadow-lg flex items-center space-x-2"
          >
            <DollarSign className="h-5 w-5" />
            <span>Proceed to Payment</span>
          </button>
        </div>

        {/* Subscription Notice */}
        {subscription.status !== 'active' && (
          <div className="text-center mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-700">
              A 9% editorial fee will be added to your order total.
              <button
                type="button"
                onClick={() => {
                  setDepositPurpose('subscription');
                  setShowDepositModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 ml-2 font-medium"
              >
                Subscribe to start posting orders
              </button>
            </p>
          </div>
        )}
      </div>
    </form>
  );
};
// Writer Management and Wallet Components
const WriterManagement = () => {
    return (
      <div className="space-y-6">
        {/* Writer Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Writers Directory</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  value={writerSearchQuery}
                  onChange={(e) => setWriterSearchQuery(e.target.value)}
                  placeholder="Search writers..."
                  className="w-full md:w-64 px-4 py-2 pl-10 bg-slate-50 border border-slate-200 
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              </div>
              <select
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">All Expertise</option>
                <option value="technical">Technical</option>
                <option value="academic">Academic</option>
                <option value="creative">Creative</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>
          {/* Selected Writers Section */}
          {selectedWriters.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Selected Writers for Current Order
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedWriters.map((writer) => (
                  <div key={writer.id} className="writer-card">
                    {/* Writer card content */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Writer info */}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedWriters(prev => 
                            prev.filter(w => w.id !== writer.id)
                          );
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
  
          {/* Writers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicWriters.map((writer) => (
              <div key={writer.id} className="writer-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {writer.avatar ? (
                      <Image
                        src={writer.avatar}
                        alt={writer.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-slate-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-slate-900">{writer.name}</h3>
                      <div className="flex items-center space-x-1 text-sm text-slate-500">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span>{writer.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleWriterPrivate(writer.id)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <UserPlus className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
  
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Completed Orders</p>
                    <p className="font-medium text-slate-900">{writer.completedOrders}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Success Rate</p>
                    <p className="font-medium text-slate-900">{writer.successRate}%</p>
                  </div>
                </div>
  
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mb-2">Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {writer.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
  
        {/* Private Writers Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Private Writers</h2>
          {privateWriters.length > 0 ? (
            <div className="space-y-4">
              {privateWriters.map((writer) => (
                <div key={writer.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{writer.name}</h3>
                      <p className="text-sm text-slate-500">{writer.expertise.join(', ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPrivateWriters(prev => prev.filter(w => w.id !== writer.id));
                      setPublicWriters(prev => [...prev, { ...writer, isPrivate: false }]);
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No private writers yet</p>
              <p className="text-sm text-slate-500">Add writers from the directory above</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Wallet and Subscription Components

const WalletSection = () => {
  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Wallet Overview</h2>
          <button
            onClick={() => setShowDepositModal(true)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 
              transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Funds</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 rounded-xl p-6">
            <p className="text-sm text-slate-500">Available Balance</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {formatCurrency(walletBalance)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-6">
            <p className="text-sm text-slate-500">Escrow Balance</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {formatCurrency(0)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-6">
            <p className="text-sm text-slate-500">Total Spent</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {formatCurrency(15000)}
            </p>
          </div>
        </div>
      </div>

      {/* Premium Subscription Plan */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Premium Subscription</h2>
        <div className="max-w-2xl mx-auto">
          <div className="subscription-card border-2 border-slate-800 p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Premium Account</h3>
                <p className="text-slate-500">Full access to all features</p>
              </div>
              <span className="badge badge-success">Best Value</span>
            </div>
            
            <p className="text-3xl font-bold text-slate-900 mb-6">
              KSH 750<span className="text-sm font-normal text-slate-500">/month</span>
            </p>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center space-x-3 text-slate-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Unlimited order posting</span>
              </li>
              <li className="flex items-center space-x-3 text-slate-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Access to all verified writers</span>
              </li>
              <li className="flex items-center space-x-3 text-slate-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Priority support 24/7</span>
              </li>
              <li className="flex items-center space-x-3 text-slate-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Dedicated account manager</span>
              </li>
            </ul>

            <button
              onClick={() => {
                setDepositPurpose('subscription');
                setShowDepositModal(true);
              }}
              className="w-full py-3 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 
                transition-colors flex items-center justify-center space-x-2"
            >
              <Star className="h-5 w-5" />
              <span>Subscribe Now</span>
            </button>

            <p className="text-sm text-slate-500 text-center mt-4">
              Subscribe now and get access to all premium features instantly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add the Subscription Modal component
const SubscriptionModal = () => {
  return (
    <Dialog
      open={showSubscriptionModal}
      onClose={() => setShowSubscriptionModal(false)}
    >
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
          <Dialog.Panel className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          
          <Dialog.Panel className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6">
            {/* Subscription modal content */}
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Choose a Subscription Plan
            </h2>
            {/* Add subscription plans and payment options */}
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

  // Chat and Support Components
const ChatWidget = () => {
    if (!isClient) return null;
  
    const handleSend = () => {
      if (message.trim()) {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: message,
          sender: 'employer',
          timestamp: new Date()
        }]);
        
        // Clear input after sending
        setMessage('');
        
        // Simulate response after a delay
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: prev.length + 1,
            text: "Thank you for your message. Our support team will assist you shortly.",
            sender: 'support',
            timestamp: new Date()
          }]);
        }, 1000);
      }
    };
  
    return (
      <>
        {/* Chat Toggle Button */}
        <button
          onClick={() => setChatOpen(!isChatOpen)}
          className="p-3 bg-[#0066FF] text-white rounded-full shadow-lg hover:bg-[#0052CC] 
            transition-all duration-300 flex items-center justify-center w-12 h-12"
          aria-label="Toggle Chat"
        >
          <MessageCircle size={20} className={`transform transition-transform duration-300 ${isChatOpen ? 'rotate-360' : ''}`} />
        </button>
  
        {/* Chat Window */}
        {isChatOpen && (
          <div className="fixed bottom-24 right-6 w-[300px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Chat Header */}
            <div className="bg-[#0066FF] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Support Chat</h3>
                  <p className="text-white/80 text-xs">Typically replies in minutes</p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
  
            {/* Messages Container */}
            <div className="h-[320px] overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === 'employer' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'support' && index === 0 && (
                      <div className="flex items-start space-x-2 max-w-[80%]">
                        <div className="w-8 h-8 bg-[#0066FF] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">EW</span>
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
                          <p className="text-gray-800 text-sm">{msg.text}</p>
                          <span className="text-xs text-gray-500 mt-1 block">
                            {msg.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    )}
  
                    {(msg.sender !== 'support' || index !== 0) && (
                      <div className={`max-w-[80%] ${
                        msg.sender === 'employer' 
                          ? 'bg-[#0066FF] text-white rounded-2xl rounded-tr-none' 
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-none shadow-sm'
                      } px-3 py-2`}>
                        <p className="text-sm">{msg.text}</p>
                        <span className={`text-xs ${
                          msg.sender === 'employer' ? 'text-white/80' : 'text-gray-500'
                        } mt-1 block`}>
                          {msg.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </div>
  
            {/* Message Input - With Continuous Text Input */}
            <div className="border-t border-gray-100 bg-white">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center p-2"
              >
                <textarea
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 px-4 py-2 text-sm focus:outline-none bg-white
                    placeholder-gray-500 min-w-0 resize-none max-h-20 overflow-y-auto"
                  style={{ height: '40px' }}
                  rows={1}
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="ml-2 p-2 bg-[#0066FF] text-white rounded-full hover:bg-[#0052CC] 
                    transition-colors disabled:bg-gray-200 disabled:text-gray-400
                    flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  aria-label="Send Message"
                >
                  <Send size={16} className={message.trim() ? 'text-white' : 'text-gray-400'} />
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  };
  
  // Support Section Component
const SupportSection = () => {
    return (
      <div className="space-y-6">
        {/* Quick Help Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Quick Help</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Order Guide */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Creating Orders</h3>
              <p className="text-sm text-slate-600 mb-4">
                Click on "orders" then click on "Create Order" to proceed seamlessly.
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                The Guide →
              </button>
            </div>
  
            {/* Writer Management */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Managing Writers</h3>
              <p className="text-sm text-slate-600 mb-4">
                Work with both private and public writers at your disposal.
              </p>
              <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                Learn More →
              </button>
            </div>
  
            {/* Payment Guide */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Wallet2 className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2">Payment & Security</h3>
              <p className="text-sm text-slate-600 mb-4">
                Eclipse Writers offers a secure payment system and money-back guarantee.
              </p>
              <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                View Details →
              </button>
            </div>
          </div>
        </div>
  
        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                question: "How does the money-back guarantee work?",
                answer: "If no writer bids on your order, you will eligible for a full refund on that order monthly."
              },
              {
                question: "Can I choose specific writers for my orders?",
                answer: "Yes, you can privatize writers and work exclusively with them through our private writers feature."
              },
              {
                question: "What happens if I'm not satisfied with the work?",
                answer: "You can request revisions or open a dispute within 72 hours of delivery."
              },
              {
                question: "How do I know if a writer is qualified?",
                answer: "Check writer profiles for ratings, completion rates, and expertise areas. You can also view samples of their work."
              }
            ].map((faq, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900 mb-2">{faq.question}</p>
                <p className="text-sm text-slate-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
  
        {/* Contact Options */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Need More Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="mailto:support@eclipsewriters.com"
              className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 
                transition-colors"
            >
              <Mail className="h-6 w-6 text-slate-600" />
              <div>
                <p className="font-medium text-slate-900">Email Support</p>
                <p className="text-sm text-slate-500">Get help via email</p>
              </div>
            </Link>
  
            <Link
              href="https://wa.me/254716212152"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 
                transition-colors"
            >
              <MessageCircle className="h-6 w-6 text-slate-600" />
              <div>
                <p className="font-medium text-slate-900">WhatsApp</p>
                <p className="text-sm text-slate-500">Chat with us directly</p>
              </div>
            </Link>
  
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 
                transition-colors"
            >
              <MessageCircle className="h-6 w-6 text-slate-600" />
              <div>
                <p className="font-medium text-slate-900">Live Chat</p>
                <p className="text-sm text-slate-500">Chat with support</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };
  // Modal Components
  const DepositModal = () => {
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
  
    const calculateTotal = () => {
      if (depositPurpose === 'order' && currentOrder) {
        const platformFee = subscription.status === 'active' ? 0 : (currentOrder.budget * 0.09);
        return currentOrder.budget + platformFee;
      }
      if (depositPurpose === 'subscription') {
        return 750; // Subscription fee
      }
      return parseFloat(depositAmount) || 0;
    };
  
    const handlePaymentSuccess = async () => {
      if (!phoneNumber.match(/^(07|01)\d{8}$/)) {
        setToastMessage('Please enter a valid phone number');
        setToastType('error');
        setShowToast(true);
        return;
      }
  
      setIsProcessingPayment(true);
  
      try {
        // Mock payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
  
        if (depositPurpose === 'order' && currentOrder) {
          // Add the order to the orders list
          setOrders(prev => [...prev, { ...currentOrder, status: 'posted' }]);
          
          setToastMessage('Order posted successfully! Check your phone for M-PESA prompt.');
          setToastType('success');
          setShowToast(true);
          
          // Reset order states
          setCurrentOrder(null);
          setOrderFiles([]);
          setOrderFormData({
            title: '',
            description: '',
            budget: 0,
            deadline: '',
            subject: '',
            pages: 0,
            wordCount: 0,
            paperFormat: 'APA',  // Add this
            references: 0,       // Add this
            technicalRequirements: [],
            isPrivate: false
          });
        } else if (depositPurpose === 'subscription') {
          setSubscription(prev => ({
            ...prev,
            status: 'active',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          }));
          
          setToastMessage('Subscription activated successfully!');
          setToastType('success');
          setShowToast(true);
        }
        
        setShowDepositModal(false);
        setPhoneNumber('');
      } catch (error) {
        setToastMessage('Payment failed. Please try again.');
        setToastType('error');
        setShowToast(true);
      }
      
      setIsProcessingPayment(false);
    };
  
    return (
      <Dialog
        open={showDepositModal}
        onClose={() => !isProcessingPayment && setShowDepositModal(false)}
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
                    {depositPurpose === 'order' ? 'Order Payment' : 
                     depositPurpose === 'subscription' ? 'Subscribe' : 'Add Funds'}
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-slate-500">
                    Complete payment to proceed
                  </p>
                </div>
                {!isProcessingPayment && (
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                )}
              </div>
  
              <div className="space-y-6">
                {/* Payment Summary */}
                {depositPurpose === 'order' && currentOrder && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-medium text-slate-900 mb-2">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Order Amount:</span>
                        <span>{formatCurrency(currentOrder.budget)}</span>
                      </div>
                      {subscription.status !== 'active' && (
                        <div className="flex justify-between text-slate-600">
                          <span>Platform Fee (9%):</span>
                          <span>{formatCurrency(currentOrder.budget * 0.09)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                        </div>
                  </div>
                </div>
              )}

              {depositPurpose === 'subscription' && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-2">Subscription Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Premium Monthly Subscription:</span>
                      <span>{formatCurrency(750)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-600 mt-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Only 9 % editorial fee charged after subscribing</span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Priority support</span>
                    </div>
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Access to top-rated writers</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Money Back Guarantee Info */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-800">
                      Money Back Guarantee
                    </p>
                    <p className="text-sm text-green-700">
                      • Full refund if no writers bid on your order in 3 weeks after posting
                    </p>
                    <p className="text-sm text-green-700">
                      • Funds held securely in escrow
                    </p>
                    <p className="text-sm text-green-700">
                      • Instant refund processing
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  M-PESA Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g., 0712345678"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none 
                      focus:ring-2 focus:ring-slate-500"
                    required
                    disabled={isProcessingPayment}
                  />
                  {phoneNumber && !phoneNumber.match(/^(07|01)\d{8}$/) && (
                    <p className="mt-1 text-xs text-red-500">
                      Please enter a valid Kenyan phone number
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Button */}
              <button 
                onClick={handlePaymentSuccess}
                disabled={isProcessingPayment || !phoneNumber.match(/^(07|01)\d{8}$/)}
                className="w-full p-4 bg-green-600 hover:bg-green-700 text-white 
                  rounded-xl transition-colors flex items-center justify-center space-x-2
                  disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                {isProcessingPayment ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing Payment...</span>
                  </div>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Pay Ksh 100 with M-PESA</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-2">
                <Lock className="h-4 w-4 text-slate-400" />
                <p className="text-xs text-slate-500">
                  Secure payment powered by IntaSend
                </p>
              </div>

              <p className="text-xs text-slate-500 text-center">
                By proceeding, you agree to our terms of service and privacy policy.
                All payments are protected by our money-back guarantee.
              </p>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};
  // Money Back Guarantee Modal
  const MoneyBackModal = () => {
    return (
      <Dialog
        open={showMoneyBackModal}
        onClose={() => setShowMoneyBackModal(false)}
      >
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            {/* Background overlay */}
            <Dialog.Panel
            
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
  
            {/* Modal panel */}
            <Dialog.Panel className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all 
              transform bg-white shadow-xl rounded-2xl relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Dialog.Title className="text-xl font-semibold text-slate-900">
                    Money Back Guarantee
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-slate-500">
                    Request a refund for your order
                  </p>
                </div>
                <button
                  onClick={() => setShowMoneyBackModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
  
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Eligible for Refund
                      </p>
                      <p className="text-sm text-yellow-600 mt-1">
                        Your order hasn't received any bids in the last 24 hours. You can request a full refund.
                      </p>
                    </div>
                  </div>
                </div>
  
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Reason for Refund
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Please provide additional details about your refund request..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none 
                      focus:ring-2 focus:ring-slate-500"
                  />
                </div>
  
                <button
                  onClick={() => {
                    // Add refund logic
                    setShowMoneyBackModal(false);
                  }}
                  className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 
                    transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowRight className="h-5 w-5" />
                  <span>Request Refund</span>
                </button>
  
                <p className="text-xs text-slate-500 text-center mt-4">
                  Refunds are typically processed within 24-48 hours.
                </p>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    );
  };
  
  // Delete Order Confirmation Modal
  const DeleteOrderModal = () => {
    return (
      <Dialog
        open={showDeleteOrderModal}
        onClose={() => setShowDeleteOrderModal(false)}
      >
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            {/* Background overlay */}
            <Dialog.Panel className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
  
            {/* Modal panel */}
            <Dialog.Panel className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all 
              transform bg-white shadow-xl rounded-2xl relative z-10">
              <div className="flex justify-between items-start mb-6">
                <Dialog.Title className="text-xl font-semibold text-slate-900">
                  Delete Order
                </Dialog.Title>
                <button
                  onClick={() => setShowDeleteOrderModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
  
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-600">
                      Are you sure you want to delete this order? This action cannot be undone.
                    </p>
                  </div>
                </div>
  
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteOrderModal(false)}
                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg 
                      hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Add delete logic
                      setShowDeleteOrderModal(false);
                    }}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                      transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    );
  };
  // Notifications and Alerts Components

// Subscription Alert Banner
const SubscriptionAlert = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide banner after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 30000);

    // Cleanup timer on component unmount
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible || subscription.status === 'active') return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 
      rounded-xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 
      shadow-lg shadow-orange-500/10 relative">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-6 w-6" />
        <span>
          Without an active subscription, employers cannot post orders. Employers will be 
          charged 9% on all orders to help compensate our editors for helping us with 
          all-rounded quality assurance. Minimum order cpp is Kshs 260
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={() => {
            setDepositPurpose('subscription');
            setShowDepositModal(true);
          }}
          className="whitespace-nowrap px-6 py-2 bg-white text-orange-600 
            rounded-lg hover:bg-orange-50 transition-colors font-medium"
        >
          Subscribe Now
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-orange-100 transition-colors"
          aria-label="Close alert"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

  
  // Toast Notifications Component
  const Toast = ({ message, type, onClose }: { 
    message: string; 
    type: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
  }) => {
    // Auto-dismiss after 3 seconds
    useEffect(() => {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
  
      return () => clearTimeout(timer);
    }, [onClose]);
  
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
      <div 
        className={`fixed top-4 right-4 z-50 p-4 rounded-lg text-white flex items-center 
          space-x-3 shadow-lg ${bgColor} animate-slide-in`}
      >
        {icon}
        <span className="font-medium">{message}</span>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors ml-2"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };
  
  // Notifications Center Component
  const NotificationsCenter = () => {
    const groupedNotifications = notifications.reduce((acc, notification) => {
      const date = notification.timestamp.toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(notification);
      return acc;
    }, {} as Record<string, Notification[]>);
  
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
          <button
            onClick={() => {
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Mark all as read
          </button>
        </div>
  
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-slate-500 mb-3">{date}</h3>
              <div className="space-y-3">
                {items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg ${
                      notification.read ? 'bg-white' : 'bg-blue-50'
                    } border border-slate-100`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          notification.type === 'order' ? 'bg-blue-100 text-blue-600' :
                          notification.type === 'bid' ? 'bg-green-100 text-green-600' :
                          notification.type === 'payment' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {notification.type === 'order' ? <FileText className="h-5 w-5" /> :
                           notification.type === 'bid' ? <Users className="h-5 w-5" /> :
                           notification.type === 'payment' ? <DollarSign className="h-5 w-5" /> :
                           <Bell className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-900">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-2">
                            {formatDate(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                      
                      {!notification.read && (
                        <button
                          onClick={() => {
                            setNotifications(prev => prev.map(n => 
                              n.id === notification.id ? { ...n, read: true } : n
                            ));
                          }}
                          className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                        >
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {showToast && (
            <Toast
              message={toastMessage}
              type={toastType}
              onClose={() => setShowToast(false)}
            />
          )}
  
          {notifications.length === 0 && (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No notifications yet</p>
              <p className="text-sm text-slate-500">
                We'll notify you when something important happens
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Order Status Alert Component
  const OrderStatusAlert = ({ order }: { order: Order }) => {
    const statusConfig = {
      draft: {
        color: 'bg-slate-100',
        textColor: 'text-slate-600',
        icon: <Edit className="h-5 w-5" />,
        message: 'This order is saved as a draft. Complete and post it to receive bids.'
      },
      posted: {
        color: 'bg-blue-100',
        textColor: 'text-blue-600',
        icon: <Clock className="h-5 w-5" />,
        message: 'Order is posted and waiting for writer bids.'
      },
      in_progress: {
        color: 'bg-yellow-100',
        textColor: 'text-yellow-600',
        icon: <Clock4 className="h-5 w-5" />,
        message: 'Order is currently being worked on by a writer.'
      },
      completed: {
        color: 'bg-green-100',
        textColor: 'text-green-600',
        icon: <CheckCircle className="h-5 w-5" />,
        message: 'Order has been completed. Please review and approve.'
      },
      disputed: {
        color: 'bg-red-100',
        textColor: 'text-red-600',
        icon: <AlertTriangle className="h-5 w-5" />,
        message: 'This order is under dispute resolution.'
      },
      canceled: {
        color: 'bg-slate-100',
        textColor: 'text-slate-600',
        icon: <X className="h-5 w-5" />,
        message: 'This order has been canceled.'
      }
    };
  
    const config = statusConfig[order.status];
  
    return (
      <div className={`p-4 ${config.color} rounded-lg mb-6`}>
        <div className="flex items-start space-x-3">
          <div className={`${config.textColor}`}>
            {config.icon}
          </div>
          <div>
            <p className={`text-sm font-medium ${config.textColor}`}>
              Order Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {config.message}
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  // System Alerts Component
  const SystemAlerts = () => {
    return (
      <div className="space-y-4">
        {subscription.status === 'active' && subscription.expiresAt < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Subscription Expiring Soon
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  Your subscription will expire in {
                    Math.ceil((subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  } days. Renew now to avoid interruption.
                </p>
                <button
                  onClick={() => {
                    setDepositPurpose('subscription');
                    setShowDepositModal(true);
                  }}
                  className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                >
                  Renew Now →
                </button>
              </div>
            </div>
          </div>
        )}
  
        {walletBalance < 1000 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Wallet2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Low Wallet Balance
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Your wallet balance running low? Add funds to ensure uninterrupted service.
                </p>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="mt-2 text-sm font-medium text-blue-800 hover:text-blue-900"
                >
                  Add Funds →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
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
            <SubscriptionAlert />
  
            {/* System Alerts */}
            <SystemAlerts />
  
            {/* Content Tabs */}
            <Tab.Group>
              <Tab.List className="flex space-x-1 rounded-xl bg-white p-1 shadow-sm mb-6">
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    ${selected 
                      ? 'bg-slate-800 text-white shadow' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  Dashboard
                </Tab>
                  <Tab
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                  ${selected 
                    ? 'bg-slate-800 text-white shadow' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                Orders
              </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    ${selected 
                      ? 'bg-slate-800 text-white shadow' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  Writers
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    ${selected 
                      ? 'bg-slate-800 text-white shadow' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  Q&A
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    ${selected 
                      ? 'bg-slate-800 text-white shadow' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  Wallet
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                    ${selected 
                      ? 'bg-slate-800 text-white shadow' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  Support
                </Tab>
              </Tab.List>
  
              <Tab.Panels>
                {/* Dashboard Panel */}
                <Tab.Panel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Wallet Overview Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Wallet Balance</h3>
                        <button
                          onClick={() => setShowDepositModal(true)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="text-2xl font-semibold text-slate-900">
                        {formatCurrency(walletBalance)}
                      </p>
                      <div className="mt-4 flex items-center space-x-2 text-sm text-slate-500">
                        <Wallet2 className="h-4 w-4" />
                        <span>Last deposit 2 days ago</span>
                      </div>
                    </div>
  
                    {/* Active Orders Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Active Orders</h3>
                        <Link
                          href="/employer/orders"
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      </div>
                      <p className="text-2xl font-semibold text-slate-900">
                        {orders.filter(o => o.status === 'in_progress').length}
                      </p>
                      <div className="mt-4 flex items-center space-x-2 text-sm text-slate-500">
                        <Clock4 className="h-4 w-4" />
                        <span>Next deadline in 12 hours</span>
                      </div>
                    </div>
  
                    {/* Subscription Status Card */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Subscription Status</h3>
                        <button
                          onClick={() => {
                            setDepositPurpose('subscription');
                            setShowDepositModal(true);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                        >
                          <Star className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="text-2xl font-semibold text-slate-900">
                        {subscription.type.charAt(0).toUpperCase() + subscription.type.slice(1)}
                      </p>
                      <div className="mt-4 flex items-center space-x-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span>
                          Expires in {
                            Math.ceil((subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          } days
                        </span>
                      </div>
                    </div>
                  </div>
  
                  {/* Recent Activity */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
                    <NotificationsCenter />
                  </div>
                </Tab.Panel>
  
                {/* Orders Panel */}
                <Tab.Panel>
                  <div className="space-y-6">
                    {showOrderForm ? (
                      <OrderForm />
                    ) : (
                      <>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <button
                            onClick={() => setShowOrderForm(true)}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 
                              text-white rounded-lg hover:bg-slate-700 transition-colors"
                          >
                            <Plus className="h-5 w-5" />
                            <span>Create New Order</span>
                          </button>
  
                          <div className="flex items-center space-x-4">
                            <select
                              className="px-4 py-2 bg-white border border-slate-200 rounded-lg 
                                focus:outline-none focus:ring-2 focus:ring-slate-500"
                            >
                              <option value="all">All Orders</option>
                              <option value="active">Active Orders</option>
                              <option value="completed">Completed Orders</option>
                              <option value="disputed">Disputed Orders</option>
                            </select>
  
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search orders..."
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg 
                                  focus:outline-none focus:ring-2 focus:ring-slate-500"
                              />
                              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                            </div>
                          </div>
                        </div>

                        {/*Draft Orders Section */}
                        {draftOrders.length > 0 && (
                          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                              Draft Orders ({draftOrders.length})
                            </h3>
                            <div className="space-y-4">
                              {draftOrders.map((draft) => (
                                <div key={draft.id} className="border border-slate-200 rounded-lg p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium text-slate-900">{draft.title}</h4>
                                      <p className="text-sm text-slate-500 mt-1">
                                        Created on {formatDate(draft.createdAt)}
                                      </p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => {
                                          setOrderFormData(draft);
                                          setShowOrderForm(true);
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                      >
                                        <Edit className="h-5 w-5 text-slate-600" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setDraftOrders(prev => 
                                            prev.filter(d => d.id !== draft.id)
                                          );
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                      >
                                        <X className="h-5 w-5 text-red-600" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
  
                        {/* Orders List */}
                        <div className="space-y-4">
                          {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
                              <OrderStatusAlert order={order} />
                              {/* Order details implementation... */}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Tab.Panel>
  
                {/* Writers Panel */}
                <Tab.Panel>
                  <WriterManagement />
                </Tab.Panel>
                <Tab.Panel>
                  <QASection />
                </Tab.Panel>
                {/* New Wallet Panel */}
                  <Tab.Panel>
                    <WalletSection />
                  </Tab.Panel>
                  {/* New Support Panel */}
                  <Tab.Panel>
                    <SupportSection />
                  </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </main>
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
                    <MessageCircle size={16}/>
                    <span>Contact Us:071946667</span>
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
  
      </div>
  
      {/* Modals */}
      {showDepositModal && <DepositModal />}
      {showMoneyBackModal && <MoneyBackModal />}
      {showDeleteOrderModal && <DeleteOrderModal />}
      {showSubscriptionModal && <SubscriptionModal />}
  
      {/* Floating Components */}
      {isClient && (
        <div className="fixed bottom-24 right-6 z-[999] flex flex-col items-end gap-4">
          <ChatWidget />
          <Link
            href="https://wa.me/254716212152"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#1ea952] 
              transition-all duration-300 flex items-center justify-center w-12 h-12"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 448 512"
              className="w-6 h-6 fill-white"
            >
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
            </svg>
          </Link>
        </div>
      )}
  
      {/* Add global styles */}
      <style jsx global>
        {globalStyles}
      </style>
    </div>
  );
  }
  