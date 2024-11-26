// mockdata.ts
import type { DashboardStats, Order, User, ActivityLog, SystemSettings, } from './adminui/AdminDashboard';

const getRandomDate = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

export const mockDashboardData: {
  stats: DashboardStats;
  orders: Order[];
  users: User[];
  logs: ActivityLog[];
  settings: SystemSettings;
  analyticsData: Array<{
    date: string;
    revenue: number;
    orders: number;
    users: number;
  }>;
} = {
  stats: {
    totalRevenue: 1250000,
    totalOrders: 324,
    activeWriters: 85,
    completionRate: 94.5,
    averageRating: 4.7,
    disputeRate: 1.8,
    revenueGrowth: 23.5,
    userGrowth: 15.7,
    activeEmployers: 156,
    pendingQuestions: 5,
    pendingAnswers: 8,
    totalQARevenue: 25000,
    qaGrowth: 12.5
  },

  orders: [
    {
      id: 'ORD001',
      title: 'Economic Analysis Research Paper',
      client: 'John Matthews',
      subject: 'Economics',
      amount: 2500,
      status: 'pending' as const,
      dueDate: getRandomDate(),
      createdAt: getRandomDate()
    },
    {
      id: 'ORD002',
      title: 'Literature Review',
      client: 'Sarah Wilson',
      subject: 'English',
      amount: 1800,
      status: 'active' as const,
      dueDate: getRandomDate(),
      createdAt: getRandomDate()
    }
  ],

  users: [
    {
      id: 'USR001',
      name: 'David Wilson',
      email: 'david.wilson@example.com',
      role: 'writer' as const,
      status: 'active' as const,
      lastActive: getRandomDate(),
      phone: '+1234567890'
    },
    {
      id: 'USR002',
      name: 'Emma Thompson',
      email: 'emma.t@example.com',
      role: 'editor' as const,
      status: 'active' as const,
      lastActive: getRandomDate(),
      phone: '+1234567891'
    }
  ],

  logs: [
    {
      id: 'LOG001',
      user: 'System',
      action: 'Order Created',
      details: 'New order #ORD001 created',
      timestamp: getRandomDate(),
      type: 'order' as const
    },
    {
      id: 'LOG002',
      user: 'David Wilson',
      action: 'User Login',
      details: 'User logged in successfully',
      timestamp: getRandomDate(),
      type: 'user' as const
    }
  ],

  settings: {
    emailNotifications: true,
    autoAssignOrders: false,
    minimumOrderAmount: 500,
    platformFee: 10,
    maintenanceMode: false
  },

  analyticsData: Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.now() - (29 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    revenue: Math.floor(Math.random() * 10000) + 5000,
    orders: Math.floor(Math.random() * 20) + 10,
    users: Math.floor(Math.random() * 10) + 5
  }))
};