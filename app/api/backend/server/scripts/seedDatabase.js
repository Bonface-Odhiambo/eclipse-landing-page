// scripts/seedDatabase.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Subscription, Question, Answer } = require('../models/index');
const { connectDB } = require('../config/database');

const seedDatabase = async () => {
    try {
        await connectDB();
        
        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Subscription.deleteMany({}),
            Question.deleteMany({}),
            Answer.deleteMany({})
        ]);

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
            name: 'System Admin',
            email: 'admin@eclipsewriters.com',
            password: adminPassword,
            role: 'admin',
            phoneNumber: '+254700000000',
            status: 'active'
        });

        // Create sample users
        const writers = await User.insertMany([
            {
                name: 'John Writer',
                email: 'john@example.com',
                password: await bcrypt.hash('writer123', 10),
                role: 'writer',
                phoneNumber: '+254711111111',
                specialties: ['Academic Writing', 'Research Papers'],
                rating: 4.5,
                completedOrders: 25,
                successRate: 95,
                status: 'active'
            },
            {
                name: 'Jane Writer',
                email: 'jane@example.com',
                password: await bcrypt.hash('writer123', 10),
                role: 'writer',
                phoneNumber: '+254722222222',
                specialties: ['Technical Writing', 'Business Reports'],
                rating: 4.8,
                completedOrders: 30,
                successRate: 98,
                status: 'active'
            }
        ]);

        const editors = await User.insertMany([
            {
                name: 'Mike Editor',
                email: 'mike@example.com',
                password: await bcrypt.hash('editor123', 10),
                role: 'editor',
                phoneNumber: '+254733333333',
                specialties: ['Academic Editing', 'Proofreading'],
                rating: 4.7,
                status: 'active'
            }
        ]);

        const employers = await User.insertMany([
            {
                name: 'Sarah Client',
                email: 'sarah@example.com',
                password: await bcrypt.hash('employer123', 10),
                role: 'employer',
                phoneNumber: '+254744444444',
                status: 'active'
            }
        ]);

        // Create sample subscriptions
        await Subscription.insertMany([
            {
                user: writers[0]._id,
                type: 'writer',
                amount: 560,
                status: 'active',
                duration: 'month',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                autoRenew: true
            },
            {
                user: employers[0]._id,
                type: 'employer',
                amount: 750,
                status: 'active',
                duration: 'month',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                autoRenew: true
            }
        ]);

        // Create sample questions
        const questions = await Question.insertMany([
            {
                title: 'Understanding Blockchain Technology',
                content: 'Explain the fundamental concepts of blockchain technology and its applications in modern business.',
                subject: 'Technology',
                author: admin._id,
                status: 'approved',
                keywords: ['blockchain', 'technology', 'business'],
                viewCount: 150
            },
            {
                title: 'Climate Change Impact Analysis',
                content: 'Analyze the current impacts of climate change on global agriculture and food security.',
                subject: 'Environmental Science',
                author: admin._id,
                status: 'approved',
                keywords: ['climate change', 'agriculture', 'food security'],
                viewCount: 200
            }
        ]);

        // Create sample answers
        await Answer.insertMany([
            {
                question: questions[0]._id,
                author: writers[0]._id,
                content: 'Comprehensive explanation of blockchain technology...',
                preview: 'Blockchain technology is a distributed ledger system...',
                status: 'approved',
                price: 100,
                purchaseCount: 5,
                rating: 4.5,
                reviews: [
                    {
                        user: employers[0]._id,
                        rating: 4.5,
                        comment: 'Very informative answer',
                        createdAt: new Date()
                    }
                ]
            },
            {
                question: questions[1]._id,
                author: writers[1]._id,
                content: 'Detailed analysis of climate change impacts...',
                preview: 'Climate change has significantly affected global agriculture...',
                status: 'approved',
                price: 100,
                purchaseCount: 3,
                rating: 4.8
            }
        ]);

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();