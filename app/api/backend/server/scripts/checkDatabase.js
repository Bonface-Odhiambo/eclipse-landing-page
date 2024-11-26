// scripts/checkDatabase.js

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Subscription, Order, Question, Answer, Payment, Notification } = require('../models');

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB successfully!\n');

        // Check all collections
        console.log('DATABASE CONTENT SUMMARY:');
        console.log('------------------------');

        // Users
        const users = await User.find();
        console.log('\nUSERS:', users.length);
        console.log('Breakdown by role:');
        const userRoles = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});
        console.log(userRoles);

        // Subscriptions
        const subscriptions = await Subscription.find();
        console.log('\nSUBSCRIPTIONS:', subscriptions.length);
        console.log('Active subscriptions:', 
            subscriptions.filter(sub => sub.status === 'active').length);

        // Orders
        const orders = await Order.find();
        console.log('\nORDERS:', orders.length);
        console.log('Status breakdown:');
        const orderStatus = orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {});
        console.log(orderStatus);

        // Questions & Answers
        const questions = await Question.find();
        const answers = await Answer.find();
        console.log('\nQ&A CONTENT:');
        console.log('Questions:', questions.length);
        console.log('Answers:', answers.length);
        console.log('Questions with answers:', 
            await Question.countDocuments({ _id: { $in: answers.map(a => a.question) } }));

        // Payments
        const payments = await Payment.find();
        console.log('\nPAYMENTS:', payments.length);
        console.log('Payment types breakdown:');
        const paymentTypes = payments.reduce((acc, payment) => {
            acc[payment.type] = (acc[payment.type] || 0) + 1;
            return acc;
        }, {});
        console.log(paymentTypes);

        // Notifications
        const notifications = await Notification.find();
        console.log('\nNOTIFICATIONS:', notifications.length);

        // Sample data preview
        console.log('\nSAMPLE DATA PREVIEW:');
        
        if (users.length > 0) {
            console.log('\nSample User (Writer):', 
                users.find(u => u.role === 'writer'));
        }
        
        if (orders.length > 0) {
            console.log('\nSample Order:', orders[0]);
        }
        
        if (questions.length > 0) {
            console.log('\nSample Question:', questions[0]);
        }

        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    } catch (error) {
        console.error('Error checking database:', error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    }
}

checkDatabase();