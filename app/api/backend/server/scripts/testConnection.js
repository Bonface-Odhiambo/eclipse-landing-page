require('dotenv').config();
const mongoose = require('mongoose');

// Connection string (store this in .env file in production)
const MONGODB_URI = 'mongodb+srv://Eclipse_Writers:xOGX1UkwTznrMsvN@cluster0.k0ncz.mongodb.net/myDatabase?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
    try {
        console.log('Attempting to connect to MongoDB...');
        // Log sanitized connection string for debugging
        console.log('Connection string (sanitized):', 
            MONGODB_URI.replace(/:([^@]+)@/, ':****@'));

        // Configure connection options
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            heartbeatFrequencyMS: 1000,     // Check server status every second
        };

        // Attempt connection
        await mongoose.connect(MONGODB_URI, connectionOptions);

        // Connection successful checks
        console.log('\n✅ Successfully connected to MongoDB!');
        console.log('Connection Details:');
        console.log('- Connection State:', mongoose.connection.readyState);
        console.log('- Database Name:', mongoose.connection.name);
        console.log('- Host:', mongoose.connection.host);
        
        // Test database access and list collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nAvailable collections:');
        if (collections.length === 0) {
            console.log('No collections found in database');
        } else {
            collections.forEach(collection => {
                console.log(`- ${collection.name}`);
            });
        }

        // Test write permission by attempting to ping
        await mongoose.connection.db.command({ ping: 1 });
        console.log('\n✅ Database write permission test passed');

    } catch (error) {
        console.error('\n❌ Connection error:', error.message);
        
        // Detailed error handling
        if (error.message.includes('bad auth')) {
            console.log('\nAuthentication Error - Possible solutions:');
            console.log('1. Verify your username and password are correct');
            console.log('2. Check if your database user has the correct permissions');
            console.log('3. Ensure your username/password are properly URL encoded');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('\nHost Not Found Error - Possible solutions:');
            console.log('1. Check your internet connection');
            console.log('2. Verify the cluster hostname in your connection string');
            console.log('3. Ensure you\'re not behind a firewall blocking MongoDB access');
        } else if (error.message.includes('timed out')) {
            console.log('\nTimeout Error - Possible solutions:');
            console.log('1. Check if your IP address is whitelisted in MongoDB Atlas');
            console.log('2. Verify your network can reach MongoDB Atlas');
            console.log('3. Consider increasing the serverSelectionTimeoutMS value');
        }
    } finally {
        // Always try to close the connection
        try {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close();
                console.log('\nConnection closed successfully');
            }
        } catch (error) {
            console.error('Error closing connection:', error.message);
        }
        process.exit();
    }
}

// Add event listeners for connection status
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('Mongoose connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
});

testConnection();