// config/database.js
const mongoose = require('mongoose');


const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://Eclipse_Writers:<xOGX1UkwTznrMsvN>@cluster0.k0ncz.mongodb.net/myDatabase?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
    });
    console.log('MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log(colors.cyan.underline(`MongoDB Connected: ${conn.connection.host}`));
    });

    mongoose.connection.on('error', (err) => {
      console.error(colors.red('MongoDB connection error:'), err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log(colors.yellow('MongoDB disconnected'));
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log(colors.yellow('MongoDB connection closed through app termination'));
      process.exit(0);
    });

    // Set up Mongoose configuration
    mongoose.set('strictQuery', true); // Ensure strict schema checks
    mongoose.set('debug', process.env.NODE_ENV === 'development'); // Log queries in development

    // Add global indexes for commonly queried fields
    await Promise.all([
      conn.connection.collection('users').createIndex({ email: 1 }, { unique: true }),
      conn.connection.collection('users').createIndex({ 'role': 1 }),
      conn.connection.collection('orders').createIndex({ 'status': 1 }),
      conn.connection.collection('orders').createIndex({ 'employer': 1 }),
      conn.connection.collection('orders').createIndex({ 'writer': 1 }),
      conn.connection.collection('payments').createIndex({ 'user': 1 }),
      conn.connection.collection('payments').createIndex({ 'status': 1 }),
      conn.connection.collection('questions').createIndex({ 'status': 1 }),
      conn.connection.collection('answers').createIndex({ 'question': 1 }),
      conn.connection.collection('messages').createIndex({ 'sender': 1, 'receiver': 1 }),
    ]);

    return conn;
  } catch (error) {
    console.error(colors.red('MongoDB connection error:'), error);
    process.exit(1);
  }
};

// Helper function to check connection status
const checkConnection = () => {
  return mongoose.connection.readyState === 1;
};

// Helper function to close connection
const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log(colors.yellow('MongoDB connection closed'));
  } catch (error) {
    console.error(colors.red('Error closing MongoDB connection:'), error);
    throw error;
  }
};

// Export as an object with multiple functions
module.exports = {
  connectDB,
  checkConnection,
  closeConnection,
  getConnection: () => mongoose.connection
};