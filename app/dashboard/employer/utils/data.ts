// utils/data.ts

import { Writer, Order, Message, Notification } from '../types/employer';

export const mockWriters: Writer[] = [
  {
    id: '1',
    name: 'John Doe',
    avatar: '/avatars/writer1.jpg',
    rating: 4.8,
    ordersCompleted: 156,
    successRate: 98,
    status: 'available',
    privacyStatus: 'public'
  },
  {
    id: '2',
    name: 'Jane Smith',
    avatar: '/avatars/writer2.jpg',
    rating: 4.9,
    ordersCompleted: 243,
    successRate: 99,
    status: 'busy',
    privacyStatus: 'private',
    privateToEmployer: 'emp_123'
  },
  // Add more mock writers...
];

export const mockOrders: Order[] = [
  {
    id: '1',
    employerId: 'emp_123',
    title: 'Research Paper on Climate Change',
    description: 'Comprehensive analysis of climate change impacts...',
    subject: 'Environmental Science',
    deadline: '2024-05-01T15:00:00Z',
    pages: 10,
    budget: 2000,
    status: 'posted',
    academicLevel: 'undergraduate',
    formatStyle: 'apa',
    spacing: 'double',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Add more mock orders...
];

export const mockMessages: Message[] = [
  {
    id: '1',
    senderId: 'emp_123',
    receiverId: 'writer_1',
    text: 'Hello, I have a question about the order.',
    timestamp: new Date(),
    read: false
  },
  // Add more mock messages...
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: 'emp_123',
    title: 'Subscription Required',
    message: 'You cannot post orders before subscribing.',
    type: 'warning',
    timestamp: new Date(),
    read: false
  },
  // Add more mock notifications...
];

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount);
};

export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const calculateTimeLeft = (deadline: string): string => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 0) return 'Expired';
  if (hours < 24) return `${hours} hours left`;
  const days = Math.floor(hours / 24);
  return `${days} days left`;
};

export const getOrderStatusColor = (status: Order['status']): string => {
  const colors = {
    draft: 'bg-slate-100 text-slate-800',
    posted: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status];
};

export const validateOrderForm = (order: Partial<Order>): string[] => {
  const errors: string[] = [];
  
  if (!order.title?.trim()) errors.push('Title is required');
  if (!order.description?.trim()) errors.push('Description is required');
  if (!order.subject?.trim()) errors.push('Subject is required');
  if (!order.deadline) errors.push('Deadline is required');
  if (!order.pages || order.pages < 1) errors.push('Pages must be at least 1');
  if (!order.budget || order.budget <= 0) errors.push('Budget must be greater than 0');
  
  return errors;
};

export const isValidFile = (file: File): boolean => {
  const maxSize = 30 * 1024 * 1024; // 30MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png'
  ];
  
  return file.size <= maxSize && allowedTypes.includes(file.type);
};