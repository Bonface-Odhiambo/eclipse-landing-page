export interface Order {
  id: number;
  title: string;
  deadline: string;
  budget: number;
  pages?: number;
  subject?: string;
  status: 'available' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  progress?: number;
}

export interface Notification {
  id: number;
  message: string;
  type: 'order' | 'system' | 'payment';
  read: boolean;
  createdAt: string;
}

export interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
}

export interface InitialData {
  totalEarnings: number;
  completedOrders: number;
  activeOrders: number;
  rating: number;
}

export interface WriterStats {
  ordersCompleted: number;
  avgRating: number;
  totalRevenue: number;
  successRate: number;
  specializations: string[];
  avgResponseTime: string;
}

export interface WriterProfile {
  id: number;
  fullName: string;
  email: string;
  avatar?: string;
  bio?: string;
  expertise: string[];
  education: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  languages: {
    language: string;
    proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
  }[];
  joinedDate: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}