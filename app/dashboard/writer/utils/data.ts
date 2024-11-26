// app/dashboard/writer/utils/data.ts
import { InitialData, Order, WriterStats, WriterProfile, Notification } from '../types/writer';

// Sample Orders
export function getSampleOrders(): Order[] {
  return [
    {
      id: 1,
      title: "Research Paper on Climate Change",
      deadline: "24 hours",
      budget: 2000,
      pages: 5,
      subject: "Environmental Science",
      status: "available",
    },
    {
      id: 2,
      title: "Literature Review on AI Ethics",
      deadline: "12 hours",
      budget: 1500,
      pages: 4,
      subject: "Computer Science",
      status: "in_progress",
      progress: 60
    }
  ];
}

// Writer Stats
export function getWriterStats(): WriterStats {
  return {
    ordersCompleted: 45,
    avgRating: 4.8,
    totalRevenue: 50000,
    successRate: 98,
    specializations: [
      "Academic Writing",
      "Research Papers",
      "Technical Writing"
    ],
    avgResponseTime: "2 hours"
  };
}

// Writer Profile
export function getWriterProfile(): WriterProfile {
  return {
    id: 1,
    fullName: "John Doe",
    email: "john@example.com",
    avatar: "/avatars/default.png",
    bio: "Professional academic writer with 5+ years experience",
    expertise: [
      "Academic Writing",
      "Research Papers",
      "Technical Writing"
    ],
    education: [
      {
        degree: "Master of Science",
        institution: "Example University",
        graduationYear: 2020
      }
    ],
    languages: [
      {
        language: "English",
        proficiency: "native"
      },
      {
        language: "Spanish",
        proficiency: "intermediate"
      }
    ],
    joinedDate: "2022-01-01",
    verificationStatus: "verified"
  };
}

// Sample Notifications
export function getSampleNotifications(): Notification[] {
  return [
    {
      id: 1,
      message: "New order available in your field",
      type: "order",
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      message: "Your withdrawal of KSH 1,500 has been processed",
      type: "payment",
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      message: "System maintenance scheduled for tomorrow",
      type: "system",
      read: true,
      createdAt: new Date().toISOString()
    }
  ];
}

// Initial Data
export async function getInitialData(): Promise<InitialData> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    totalEarnings: 50000,
    completedOrders: 45,
    activeOrders: 3,
    rating: 4.8
  };
}

// Utility Functions
export const formatCurrency = (amount: number): string => {
  return `KSH ${amount.toLocaleString()}`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeRemaining = (deadline: string): string => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} days`;
  }

  return `${hours}h ${minutes}m`;
};

// API Simulation Functions
export const submitBid = async (orderId: number): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
};

export const updateOrderStatus = async (
  orderId: number, 
  status: Order['status']
): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
};

export const markNotificationAsRead = async (
  notificationId: number
): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
};

export const updateProfile = async (
  profileData: Partial<WriterProfile>
): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
};

// Wallet Operations
interface WalletOperation {
  id: number;
  type: 'withdrawal' | 'topup';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

export const walletOperations = {
  withdraw: async (amount: number): Promise<boolean> => {
    if (amount < 50) {
      throw new ApiError('Minimum withdrawal amount is KSH 50', 400);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  },
  
  topUp: async (amount: number): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  },
  
  getTransactions: async (): Promise<WalletOperation[]> => {
    return [
      {
        id: 1,
        type: 'withdrawal',
        amount: 1500,
        status: 'completed',
        date: new Date().toISOString()
      }
    ];
  }
};

// Error Handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError('An unexpected error occurred', 500);
};