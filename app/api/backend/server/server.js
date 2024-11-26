// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const socketService = require('./services/socketService');
const checkRole = require('./middleware/CheckRole');
const { 
  AdminUsers, 
  AdminOrders, 
  AdminTransactions, 
  AdminSystem 
} = require('./models/adminModels');

// Import routes after app initialization
const adminRoutes = require('./routes/adminRoutes');
const editorRoutes = require('./routes/editorRoutes');
const employerRoutes = require('./routes/employerRoutes');
const writerRoutes = require('./routes/writerRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Initialize express app first
const app = express();
const server = http.createServer(app);


// Import dashboard models
const AdminDashboard = require('./models/adminModels');
const EditorDashboard = require('./models/editorModels');
const EmployerDashboard = require('./models/employerModels');
const WriterDashboard = require('./models/writerModels');

dotenv.config();

// Debug logging for startup
console.log('Initializing server...');

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Eclipse_Writers:xOGX1UkwTznrMsvN@cluster0.k0ncz.mongodb.net/myDatabase?retryWrites=true&w=majority&appName=Cluster0';

// Dashboard initialization function
const initializeDashboards = async () => {
  try {
      console.log('Initializing dashboard collections...');

      // Initialize Admin System
      const systemExists = await AdminSystem.findOne();
      if (!systemExists) {
          await AdminSystem.create({
              metrics: {
                  cpu: 0,
                  memory: 0,
                  activeUsers: 0,
                  responseTime: 0,
                  timestamp: new Date()
              },
              settings: {
                  maintenanceMode: false,
                  emailNotifications: true,
                  autoAssignOrders: false,
                  minimumOrderAmount: 10,
                  platformFee: 5,
                  version: '1.0.0',
                  lastUpdate: new Date()
              }
          });
          console.log('✅ Admin System initialized');
      }

      // Add an initial admin user if none exists
      const adminExists = await AdminUsers.findOne({ role: 'admin' });
      if (!adminExists) {
          await AdminUsers.create({
              name: 'System Admin',
              email: 'admin@eclipsewriters.com',
              role: 'admin',
              status: 'active',
              stats: {
                  assignedOrders: 0,
                  completionRate: 0,
                  rating: 5
              }
          });
          console.log('✅ Admin User initialized');
      }

      console.log('✅ Admin collections initialized successfully');
  } catch (error) {
      console.error('Error initializing admin collections:', error);
      // Log error but don't throw to allow server to continue starting
      console.log('Continuing server startup despite initialization error');
  }
};

async function initializeEditorDashboard() {
  try {
      // Initialize Editor Dashboard
      const editorDashboardExists = await EditorDashboard.findOne().exec();

      if (!editorDashboardExists) {
          await EditorDashboard.create({
              stats: {
                  papersReviewed: { total: 0, today: 0 },
                  averageResponseTime: 0,
                  averageRating: 0,
                  qualityScore: 100
              }
          });
          console.log('✅ Editor Dashboard initialized');
      }
  } catch (error) {
      console.error('❌ Error initializing Editor Dashboard:', error);
  }
}

    async function initializeEmployerDashboard() {
      try {
          // Initialize Employer Dashboard
          const employerDashboardExists = await EmployerDashboard.findOne().exec();

          if (!employerDashboardExists) {
              await EmployerDashboard.create({
                  wallet: {
                      balance: 0,
                      escrowBalance: 0,
                      totalSpent: 0
                  },
                  subscription: {
                      type: 'basic',
                      status: 'inactive'
                  }
              });
              console.log('✅ Employer Dashboard initialized');
          }
      } catch (error) {
          console.error('❌ Error initializing Employer Dashboard:', error);
      }
    }

    async function initializeWriterDashboard() {
      try {
          // Initialize Writer Dashboard
          const writerDashboardExists = await WriterDashboard.findOne().exec();

          if (!writerDashboardExists) {
              await WriterDashboard.create({
                  stats: {
                      walletBalance: 0,
                      completedOrders: { total: 0, lastMonth: 0 },
                      activeOrders: 0,
                      rating: { average: 0, totalRatings: 0 }
                  },
                  subscription: {
                      status: 'inactive',
                      type: 'basic'
                  }
              });
              console.log('✅ Writer Dashboard initialized');
          }

          console.log('✅ All dashboard collections initialized successfully');
      } catch (error) {
          console.error('❌ Error initializing Writer Dashboard:', error);
      }
  }


// MongoDB Connection Function
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    const connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB Connected Successfully!');
    console.log('Connected to database:', connection.connection.name);
    console.log('Host:', connection.connection.host);

    // Initialize dashboards after successful connection
    (async () => {
      await initializeDashboards();
    })();

    // Monitor database connection
    mongoose.connection.on('error', err => {
      console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('\x1b[33m%s\x1b[0m', '⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB connection error:', error.message);
    
    if (error.message.includes('bad auth')) {
      console.log('\nAuthentication Error - Please check:');
      console.log('1. Username and password in connection string');
      console.log('2. Database access permissions');
      console.log('3. IP whitelist in MongoDB Atlas');
    }
    
    process.exit(1);
  }
};

// Connect to MongoDB before starting the server
connectDB();
// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Authorization"]
  },
  pingTimeout: 60000
});

// Initialize socket service
console.log('Initializing socket service...');
socketService.initialize(io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Supabase Client Configuration
const supabase = createClient(
  'https://kxjytpekabiyaykwtuly.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4anl0cGVrYWJpeWF5a3d0dWx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTk5NDQzOCwiZXhwIjoyMDQ3NTcwNDM4fQ.r0_PrgMzu2syP0QMCUPh46rxFHG-s1pLz6-TSxxIqBA'
);

// Supabase token verification middleware
const verifySupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('Socket connection rejected: Missing token');
      return next(new Error('Authentication token missing'));
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Socket authentication error:', error);
      return next(new Error('Authentication failed'));
    }

    socket.user = user;
    socket.join(user.id);
    console.log(`Socket authenticated for user: ${user.id}`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.user.id);

  // Join chat handler
  socket.on('join_chat', async (data) => {
    const { chatId, role } = data;
    socket.join(chatId);
    console.log(`User ${socket.user.id} joined chat ${chatId}`);
    
    socket.to(chatId).emit('user_joined', {
      userId: socket.user.id,
      role,
      timestamp: new Date()
    });
  });

  // Leave chat handler
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    socket.to(chatId).emit('user_left', {
      userId: socket.user.id,
      timestamp: new Date()
    });
  });

  // Send message handler
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, recipientId, messageType = 'text' } = data;

      const message = await ChatMessage.create({
        sender: socket.user.id,
        recipient: recipientId,
        chatId,
        content,
        messageType,
        timestamp: new Date()
      });

      // Emit to all users in the chat
      io.to(chatId).emit('new_message', {
        ...message.toJSON(),
        sender: {
          id: socket.user.id,
          role: socket.user.role
        }
      });

      // Send notification to recipient
      io.to(recipientId).emit('message_notification', {
        chatId,
        senderId: socket.user.id,
        content: messageType === 'text' ? content : `New ${messageType} message`,
        timestamp: new Date()
      });

      // Update chat last activity
      await Chat.findByIdAndUpdate(chatId, {
        lastActivity: new Date(),
        lastMessage: content
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', {
        message: 'Failed to send message',
        error: error.message
      });
    }
  });

  // Typing indicator handler
  socket.on('typing', (data) => {
    const { chatId, isTyping } = data;
    socket.to(chatId).emit('user_typing', {
      userId: socket.user.id,
      isTyping,
      timestamp: new Date()
    });
  });

  // Mark messages as read handler
  socket.on('mark_read', async (data) => {
    try {
      const { chatId, messageIds } = data;
      
      await ChatMessage.updateMany(
        { 
          _id: { $in: messageIds },
          recipient: socket.user.id 
        },
        { 
          $set: { 
            read: true, 
            readAt: new Date() 
          } 
        }
      );

      io.to(chatId).emit('messages_read', {
        userId: socket.user.id,
        messageIds,
        timestamp: new Date()
      });

      // Update chat status
      await Chat.findByIdAndUpdate(chatId, {
        lastRead: {
          [socket.user.id]: new Date()
        }
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', {
        message: 'Failed to mark messages as read',
        error: error.message
      });
    }
  });

  // File upload status handler
  socket.on('file_upload_status', (data) => {
    const { chatId, status, fileName } = data;
    socket.to(chatId).emit('file_status_update', {
      userId: socket.user.id,
      fileName,
      status,
      timestamp: new Date()
    });
  });

  // Chat activity handler
  socket.on('chat_activity', async (data) => {
    const { chatId, activity } = data;
    try {
      await Chat.findByIdAndUpdate(chatId, {
        $push: {
          activities: {
            userId: socket.user.id,
            type: activity,
            timestamp: new Date()
          }
        }
      });

      socket.to(chatId).emit('activity_update', {
        userId: socket.user.id,
        activity,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating chat activity:', error);
      socket.emit('error', {
        message: 'Failed to update chat activity',
        error: error.message
      });
    }
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.user.id);
    
    // Update user's online status
    try {
      await User.findByIdAndUpdate(socket.user.id, {
        'status.online': false,
        'status.lastSeen': new Date()
      });

      io.emit('user_offline', {
        userId: socket.user.id,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating user status on disconnect:', error);
    }
  });
});
// API Routes with Debug Logging
console.log('Registering API routes...');

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// Basic health check route
app.get('/health', (req, res) => {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    mongodb: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host
    },
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.json(healthcheck);
});

// Protected routes with Supabase verification and role check
app.use('/api/admin', verifySupabaseToken, checkRole('admin'), adminRoutes);
app.use('/api/editor', verifySupabaseToken, checkRole('editor'), editorRoutes);
app.use('/api/employer', verifySupabaseToken, checkRole('employer'), employerRoutes);
app.use('/api/writer', verifySupabaseToken, checkRole('writer'), writerRoutes);
app.use('/api/chat', verifySupabaseToken, chatRoutes);

// Dashboard-specific routes
// Change these lines:
app.use('/api/dashboard/admin', 
  verifySupabaseToken, 
  checkRole('admin'), 
  require('./routes/adminRoutes')
);

app.use('/api/dashboard/editor', 
  verifySupabaseToken, 
  checkRole('editor'), 
  require('./routes/editorRoutes')
);

app.use('/api/dashboard/employer', 
  verifySupabaseToken, 
  checkRole('employer'), 
  require('./routes/employerRoutes')
);

app.use('/api/dashboard/writer', 
  verifySupabaseToken, 
  checkRole('writer'), 
  require('./routes/writerRoutes')
);

// Development routes - only available in development environment
if (process.env.NODE_ENV === 'development') {
  app.get('/dev/collections', async (req, res) => {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      res.json({
        message: 'Available collections',
        collections: collections.map(c => c.name)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/dev/data/:collectionName', async (req, res) => {
    try {
      const collection = mongoose.connection.db.collection(req.params.collectionName);
      const data = await collection.find({}).limit(50).toArray();
      res.json({
        collection: req.params.collectionName,
        count: data.length,
        data: data
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/dev/stats', async (req, res) => {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const stats = [];
      
      for (const collection of collections) {
        const count = await mongoose.connection.db
          .collection(collection.name)
          .countDocuments();
        stats.push({ collection: collection.name, documentCount: count });
      }
      
      res.json({
        databaseName: mongoose.connection.db.databaseName,
        collections: stats,
        serverUptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Rate limiting middleware for production
if (process.env.NODE_ENV === 'production') {
  const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  });

  app.use('/api/', limiter);
}

// 404 Handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// Global Error handling middleware
app.use((err, req, res, next) => {
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.detail = err.detail;
  }

  // Log error details
  console.error('Application Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: err.stack,
    user: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query
  });

  res.status(err.status || 500).json(errorResponse);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log('\x1b[36m%s\x1b[0m', `🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
  console.log(`MongoDB Status: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  
  // Log server configuration
  console.log('\nServer Configuration:');
  console.log('- NodeJS Version:', process.version);
  console.log('- Memory Usage:', process.memoryUsage());
  console.log('- CPUs:', require('os').cpus().length);
});

// Process Error Handlers
process.on('uncaughtException', (error) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  // Attempt graceful shutdown
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  
  // Attempt graceful shutdown
  shutdown('unhandledRejection');
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Graceful shutdown function
async function shutdown(signal) {
  console.log(`\n${signal} signal received. Starting graceful shutdown...`);
  
  // Set a timeout for the shutdown
  const shutdownTimeout = setTimeout(() => {
    console.error('Forceful shutdown initiated - could not close connections in time');
    process.exit(1);
  }, 10000); // 10 seconds timeout

  try {
    // Close server first to stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
    });

    // Close socket.io connections
    io.close(() => {
      console.log('Socket.IO server closed');
    });

    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');

    // Clear the timeout and exit gracefully
    clearTimeout(shutdownTimeout);
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

module.exports = { app, server, io };