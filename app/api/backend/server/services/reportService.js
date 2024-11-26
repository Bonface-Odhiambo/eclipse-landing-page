// services/reportService.js
const Order = require('../models/Order');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Writer = require('../models/Writer');
const Editor = require('../models/Editor');

class ReportService {
  // Generate writer performance report
  static async generateWriterReport(writerId, startDate, endDate) {
    try {
      const orders = await Order.find({
        writer: writerId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('client', 'name email');

      const completedOrders = orders.filter(order => order.status === 'completed');
      const totalEarnings = completedOrders.reduce((sum, order) => sum + order.writerPayment, 0);
      const onTimeDelivery = completedOrders.filter(order => 
        new Date(order.completedAt) <= new Date(order.deadline)
      ).length;

      return {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: orders.filter(order => order.status === 'in_progress').length,
        totalEarnings,
        onTimeDeliveryRate: (onTimeDelivery / completedOrders.length) * 100,
        averageRating: completedOrders.reduce((sum, order) => sum + (order.rating || 0), 0) / completedOrders.length,
        orderDetails: orders.map(order => ({
          orderId: order._id,
          client: order.client.name,
          status: order.status,
          amount: order.writerPayment,
          deadline: order.deadline,
          completedAt: order.completedAt,
          rating: order.rating
        }))
      };
    } catch (error) {
      throw new Error(`Error generating writer report: ${error.message}`);
    }
  }

  // Generate editor performance report
  static async generateEditorReport(editorId, startDate, endDate) {
    try {
      const orders = await Order.find({
        editor: editorId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const completedEdits = orders.filter(order => order.editingStatus === 'completed');
      const totalEarnings = completedEdits.reduce((sum, order) => sum + order.editorFee, 0);

      return {
        totalAssignments: orders.length,
        completedEdits: completedEdits.length,
        pendingEdits: orders.filter(order => order.editingStatus === 'in_progress').length,
        totalEarnings,
        averageResponseTime: this.calculateAverageResponseTime(completedEdits),
        editingDetails: orders.map(order => ({
          orderId: order._id,
          status: order.editingStatus,
          fee: order.editorFee,
          assignedAt: order.editorAssignedAt,
          completedAt: order.editingCompletedAt
        }))
      };
    } catch (error) {
      throw new Error(`Error generating editor report: ${error.message}`);
    }
  }

  // Generate employer/client spending report
  static async generateEmployerReport(employerId, startDate, endDate) {
    try {
      const orders = await Order.find({
        client: employerId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('writer', 'name');

      const payments = await Payment.find({
        user: employerId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      return {
        totalSpent: payments.reduce((sum, payment) => sum + payment.amount, 0),
        orderCount: orders.length,
        completedOrders: orders.filter(order => order.status === 'completed').length,
        activeOrders: orders.filter(order => order.status === 'in_progress').length,
        averageOrderValue: orders.reduce((sum, order) => sum + order.amount, 0) / orders.length,
        paymentHistory: payments.map(payment => ({
          amount: payment.amount,
          type: payment.type,
          status: payment.status,
          date: payment.createdAt
        })),
        orderDetails: orders.map(order => ({
          orderId: order._id,
          writer: order.writer?.name || 'Unassigned',
          amount: order.amount,
          status: order.status,
          createdAt: order.createdAt,
          deadline: order.deadline
        }))
      };
    } catch (error) {
      throw new Error(`Error generating employer report: ${error.message}`);
    }
  }

  // Generate admin dashboard report
  static async generateAdminReport(startDate, endDate) {
    try {
      const orders = await Order.find({
        createdAt: { $gte: startDate, $lte: endDate }
      });
      const payments = await Payment.find({
        createdAt: { $gte: startDate, $lte: endDate }
      });
      const users = await User.find({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      return {
        revenue: {
          total: payments.reduce((sum, payment) => sum + payment.amount, 0),
          byType: this.groupPaymentsByType(payments),
          monthlyTrend: this.calculateMonthlyRevenue(payments)
        },
        orders: {
          total: orders.length,
          completed: orders.filter(order => order.status === 'completed').length,
          inProgress: orders.filter(order => order.status === 'in_progress').length,
          averageValue: orders.reduce((sum, order) => sum + order.amount, 0) / orders.length
        },
        users: {
          total: users.length,
          writers: users.filter(user => user.role === 'writer').length,
          editors: users.filter(user => user.role === 'editor').length,
          employers: users.filter(user => user.role === 'employer').length
        },
        performance: {
          averageCompletionTime: this.calculateAverageCompletionTime(orders),
          satisfactionRate: this.calculateSatisfactionRate(orders)
        }
      };
    } catch (error) {
      throw new Error(`Error generating admin report: ${error.message}`);
    }
  }

  // Helper methods
  static calculateAverageResponseTime(orders) {
    const responseTimes = orders.map(order => 
      new Date(order.editingCompletedAt) - new Date(order.editorAssignedAt)
    );
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  static calculateAverageCompletionTime(orders) {
    const completedOrders = orders.filter(order => order.status === 'completed');
    const completionTimes = completedOrders.map(order => 
      new Date(order.completedAt) - new Date(order.createdAt)
    );
    return completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
  }

  static calculateSatisfactionRate(orders) {
    const ratedOrders = orders.filter(order => order.rating);
    return ratedOrders.reduce((sum, order) => sum + order.rating, 0) / ratedOrders.length;
  }

  static groupPaymentsByType(payments) {
    return payments.reduce((groups, payment) => {
      if (!groups[payment.type]) {
        groups[payment.type] = 0;
      }
      groups[payment.type] += payment.amount;
      return groups;
    }, {});
  }

  static calculateMonthlyRevenue(payments) {
    return payments.reduce((monthly, payment) => {
      const month = new Date(payment.createdAt).getMonth();
      if (!monthly[month]) {
        monthly[month] = 0;
      }
      monthly[month] += payment.amount;
      return monthly;
    }, {});
  }

  // Generate custom date range report
  static async generateCustomReport(params) {
    const { startDate, endDate, metrics, roles } = params;
    try {
      let report = {};

      if (metrics.includes('revenue')) {
        report.revenue = await this.calculateRevenueMetrics(startDate, endDate);
      }

      if (metrics.includes('performance')) {
        report.performance = await this.calculatePerformanceMetrics(startDate, endDate, roles);
      }

      if (metrics.includes('user_activity')) {
        report.userActivity = await this.calculateUserActivityMetrics(startDate, endDate, roles);
      }

      return report;
    } catch (error) {
      throw new Error(`Error generating custom report: ${error.message}`);
    }
  }

  static async calculateRevenueMetrics(startDate, endDate) {
    // Implement revenue calculation logic
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    return {
      total: payments.reduce((sum, payment) => sum + payment.amount, 0),
      byType: this.groupPaymentsByType(payments),
      dailyTrend: this.calculateDailyRevenue(payments)
    };
  }

  static async calculatePerformanceMetrics(startDate, endDate, roles) {
    // Implement performance metrics calculation
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    return {
      completionRate: this.calculateCompletionRate(orders),
      averageRating: this.calculateAverageRating(orders),
      onTimeDelivery: this.calculateOnTimeDeliveryRate(orders)
    };
  }

  static async calculateUserActivityMetrics(startDate, endDate, roles) {
    // Implement user activity metrics calculation
    const users = await User.find({
      role: { $in: roles },
      createdAt: { $gte: startDate, $lte: endDate }
    });

    return {
      activeUsers: users.length,
      byRole: this.groupUsersByRole(users),
      activityTrend: await this.calculateUserActivityTrend(startDate, endDate, roles)
    };
  }
}

module.exports = ReportService;