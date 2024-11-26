// types/editor.ts
export interface Paper {
    id: string;
    orderId: string;
    writerId: string;
    title: string;
    subject: string;
    pageCount: number;
    status: PaperStatus;
    submittedAt: Date;
    deadline: Date;
    file: File | null;
    reviewNotes?: PaperReview;
    priority: 'high' | 'medium' | 'low';
    description?: string;
    technicalRequirements?: string[];
    attachments?: File[];
  }
  
  export type PaperStatus = 
    | 'pending_review'
    | 'under_review'
    | 'reviewed'
    | 'approved'
    | 'rejected';
  
  export interface PaperReview {
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
    reviewedAt?: Date;
    reviewerId?: string;
  }
  
  export interface EditorStats {
    papersReviewed: number;
    totalEarnings: number;
    averageRating: number;
    rejectionRate: number;
    reviewSpeed: {
      average: number; // in hours
      trend: 'improving' | 'declining' | 'stable';
      lastWeek: number;
    };
    qualityScore: {
      current: number; // percentage
      trend: 'improving' | 'declining' | 'stable';
      lastWeek: number;
    };
    accuracy: {
      current: number; // percentage
      trend: 'improving' | 'declining' | 'stable';
      lastWeek: number;
    };
  }
  
  export interface EditorNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    priority: 'high' | 'medium' | 'low';
    actionUrl?: string;
    relatedPaperId?: string;
  }
  
  export type NotificationType = 
    | 'new_paper'
    | 'deadline_approaching'
    | 'revision_needed'
    | 'payment'
    | 'system';
  
  export interface EditorMessage {
    id: string;
    text: string;
    sender: 'editor' | 'support' | 'system';
    timestamp: Date;
    read: boolean;
    attachments?: File[];
  }
  
  export interface EditorWallet {
    balance: number;
    totalEarned: number;
    pendingPayments: number;
    lastPayout: {
      amount: number;
      date: Date;
    };
    transactions: WalletTransaction[];
  }
  
  export interface WalletTransaction {
    id: string;
    type: 'earning' | 'withdrawal' | 'bonus';
    amount: number;
    timestamp: Date;
    status: 'completed' | 'pending' | 'failed';
    description: string;
    paperId?: string;
  }