// utils/data.ts
import { 
    Paper, 
    PaperReview, 
    EditorStats, 
    EditorNotification,
    EditorWallet,
    WalletTransaction 
  } from '../editor/types';
  
  // Calculate earnings for a paper
  export const calculatePaperEarnings = (pageCount: number): number => {
    return pageCount * 5; // KSH 5 per page
  };
  
  // Format currency
  export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Format time ago
  export const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
  
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };
  
  // Calculate time until deadline
  export const calculateTimeUntilDeadline = (deadline: Date): {
    hours: number;
    isOverdue: boolean;
    format: string;
  } => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    
    return {
      hours,
      isOverdue: hours < 0,
      format: hours < 0 
        ? 'Overdue' 
        : hours < 24 
          ? `${hours} hours remaining`
          : `${Math.ceil(hours / 24)} days remaining`
    };
  };
  
  // Calculate review completeness
  export const calculateReviewCompleteness = (review: PaperReview): number => {
    const totalChecks = Object.values(review).filter(value => 
      typeof value === 'boolean'
    ).length;
    
    const completedChecks = Object.values(review).filter(value => 
      value === true
    ).length;
  
    return Math.round((completedChecks / totalChecks) * 100);
  };
  
  // Get paper priority level
  export const getPaperPriority = (paper: Paper): 'high' | 'medium' | 'low' => {
    const timeUntilDeadline = calculateTimeUntilDeadline(paper.deadline);
    
    if (timeUntilDeadline.hours < 12) return 'high';
    if (timeUntilDeadline.hours < 24) return 'medium';
    return 'low';
  };
  
  // Generate mock data for testing
  export const generateMockData = () => {
    const mockPapers: Paper[] = [
      {
        id: '1',
        orderId: 'ORD-2024-001',
        writerId: 'WR-001',
        title: 'Research Paper on AI Ethics',
        subject: 'Computer Science',
        pageCount: 12,
        status: 'pending_review',
        submittedAt: new Date(),
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        file: null,
        priority: 'high',
        description: 'Comprehensive analysis of ethical considerations in AI development'
      },
      // Add more mock papers...
    ];
  
    const mockStats: EditorStats = {
      papersReviewed: 156,
      totalEarnings: 78000,
      averageRating: 4.8,
      rejectionRate: 0.05,
      reviewSpeed: {
        average: 2.5,
        trend: 'improving',
        lastWeek: 3.0
      },
      qualityScore: {
        current: 98,
        trend: 'stable',
        lastWeek: 97
      },
      accuracy: {
        current: 99,
        trend: 'improving',
        lastWeek: 98
      }
    };
  
    const mockWallet: EditorWallet = {
      balance: 15000,
      totalEarned: 78000,
      pendingPayments: 3000,
      lastPayout: {
        amount: 12000,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      transactions: [
        {
          id: 'TRX-001',
          type: 'earning',
          amount: 1500,
          timestamp: new Date(),
          status: 'completed',
          description: 'Paper review earnings',
          paperId: '1'
        }
        // Add more transactions...
      ]
    };
  
    return {
      papers: mockPapers,
      stats: mockStats,
      wallet: mockWallet
    };
  };
  
  // Validate review submission
  export const validateReview = (review: PaperReview): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];
  
    if (!review.comments.trim()) {
      errors.push('Review comments are required');
    }
  
    const requiredChecks = [
      'grammar',
      'noPlagiarism',
      'properReferencing',
      'properFormatting'
    ];
  
    requiredChecks.forEach(check => {
      if (!review[check as keyof PaperReview]) {
        errors.push(`${check.replace(/([A-Z])/g, ' $1').toLowerCase()} check is required`);
      }
    });
  
    return {
      isValid: errors.length === 0,
      errors
    };
  };