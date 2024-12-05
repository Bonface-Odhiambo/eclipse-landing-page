const mongoose = require('mongoose');

// User Management Schema
const adminUsersSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'writer', 'employer'], required: true },
    status: { type: String, enum: ['active', 'inactive', 'pending', 'blocked'], default: 'active' },
    lastActive: { type: Date, default: Date.now },
    stats: {
        assignedOrders: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        rating: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Order Management Schema
const adminOrdersSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'active', 'completed', 'disputed', 'reassigned'], 
        default: 'pending' 
    },
    writer: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUsers' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUsers' },
    dueDate: { type: Date, required: true }
}, { timestamps: true });

// Financial Management Schema
const adminTransactionsSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    type: { 
        type: String, 
        enum: ['platform_fee', 'writer_payment', 'client_payment'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'escrowed', 'failed'], 
        default: 'pending' 
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminOrders' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUsers' }
}, { timestamps: true });

// System Management Schema
const adminSystemSchema = new mongoose.Schema({
    metrics: {
        cpu: { type: Number, default: 0 },
        memory: { type: Number, default: 0 },
        activeUsers: { type: Number, default: 0 },
        responseTime: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now }
    },
    settings: {
        maintenanceMode: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: true },
        autoAssignOrders: { type: Boolean, default: false },
        minimumOrderAmount: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        version: { type: String, default: '1.0.0' },
        lastUpdate: { type: Date, default: Date.now }
    },
    systemErrors: [{
        timestamp: { type: Date, default: Date.now },
        level: { 
            type: String, 
            enum: ['error', 'warning', 'info'], 
            default: 'info' 
        },
        message: { type: String, required: true },
        stack: String
    }]
}, { timestamps: true });

// Create models using defined schemas
const models = {
    AdminUsers: mongoose.models.AdminUsers || mongoose.model('AdminUsers', adminUsersSchema),
    AdminOrders: mongoose.models.AdminOrders || mongoose.model('AdminOrders', adminOrdersSchema),
    AdminTransactions: mongoose.models.AdminTransactions || mongoose.model('AdminTransactions', adminTransactionsSchema),
    AdminSystem: mongoose.models.AdminSystem || mongoose.model('AdminSystem', adminSystemSchema),
};

// Export all models
module.exports = models;
