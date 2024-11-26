// scripts/populateDatabase.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Subscription, Order, Question, Answer, Payment } = require('../models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://<Eclipse_Writers>:<xOGX1UkwTznrMsvN>@cluster0.k0ncz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const populateDatabase = async () => {
    try {
        // Updated connection options
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        mongoose.set('strictQuery', false); // Add this line to handle the deprecation warning

        console.log('Connected to MongoDB...');

        // Clear existing data
        console.log('Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Subscription.deleteMany({}),
            Order.deleteMany({}),
            Question.deleteMany({}),
            Answer.deleteMany({}),
            Payment.deleteMany({})
        ]);

        // [Rest of your population code remains the same...]

        console.log('Database populated successfully!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error populating database:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

populateDatabase();