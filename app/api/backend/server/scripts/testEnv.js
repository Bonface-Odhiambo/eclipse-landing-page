// scripts/testEnv.js

require('dotenv').config();

console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded:', process.env.MONGODB_URI ? 'Yes' : 'No');
if (process.env.MONGODB_URI) {
    console.log('MongoDB URI found:', process.env.MONGODB_URI.substring(0, 20) + '...');
} else {
    console.log('MongoDB URI not found');
    console.log('Available environment variables:', Object.keys(process.env));
}