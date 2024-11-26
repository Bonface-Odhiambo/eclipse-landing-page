// scripts/setupSchemas.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI ||'mongodb+srv://<Eclipse_Writers>:<xOGX1UkwTznrMsvN>@cluster0.k0ncz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const setupDatabase = async () => {
    try {
        // Updated connection options
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        mongoose.set('strictQuery', false); // Add this line to handle the deprecation warning

        console.log('Connected to MongoDB Cluster0...');

        // Get the database instance
        const db = mongoose.connection.db;

        // Create collections
        const collections = ['users', 'subscriptions', 'orders', 'questions', 'answers', 'payments', 'notifications'];
        
        for (const collectionName of collections) {
            try {
                await db.createCollection(collectionName);
                console.log(`Created collection: ${collectionName}`);
            } catch (error) {
                if (error.code === 48) {
                    console.log(`Collection ${collectionName} already exists`);
                } else {
                    throw error;
                }
            }
        }

        // Create basic indexes
        await Promise.all([
            db.collection('users').createIndex({ email: 1 }, { unique: true }),
            db.collection('orders').createIndex({ employer: 1 }),
            db.collection('questions').createIndex({ subject: 1 }),
            db.collection('answers').createIndex({ question: 1 }),
            db.collection('payments').createIndex({ user: 1 }),
            db.collection('notifications').createIndex({ user: 1 })
        ]);

        console.log('Database schema setup completed successfully!');
        console.log('Collections created:');
        const existingCollections = await db.listCollections().toArray();
        existingCollections.forEach(collection => {
            console.log(`- ${collection.name}`);
        });

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error setting up database schema:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

setupDatabase();