// middleware/auth.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    'https://kxjytpekabiyaykwtuly.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4anl0cGVrYWJpeWF5a3d0dWx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDc3NDUwOSwiZXhwIjoyMDQ2MzUwNTA5fQ.3qNYOxloEzS3Wb7y8uxAj6BgurCXD2JdmuZV1MJ-1Uc',
);

const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }

    // Get user role from Supabase database
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error verifying user role.' 
      });
    }

    // Attach user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: userData.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication.' 
    });
  }
};

const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated.' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

const isWriter = (req, res, next) => {
  if (!req.user || req.user.role !== 'writer') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Writer privileges required.' 
    });
  }
  next();
};

const isEmployer = (req, res, next) => {
  if (!req.user || req.user.role !== 'employer') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Employer privileges required.' 
    });
  }
  next();
};

const isEditor = (req, res, next) => {
  if (!req.user || req.user.role !== 'editor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Editor privileges required.' 
    });
  }
  next();
};

module.exports = {
  auth,
  authorize,
  isAdmin,
  isWriter,
  isEmployer,
  isEditor
};