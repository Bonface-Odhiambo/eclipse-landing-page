// types/employer.ts

interface Message {
  id: number;
  text: string;
  sender: 'employer' | 'support';
  timestamp: Date;
  read?: boolean;
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
  message: string;
  type: 'order' | 'bid' | 'payment' | 'system';
  timestamp: Date;
  read: boolean;
}

interface Subscription {
  id: string;
  type: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'expired';
  expiresAt: Date;
  features: string[];
  price: number;
}
interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface SidebarNestedItem extends SidebarItem {
  subItems?: SidebarItem[];
}