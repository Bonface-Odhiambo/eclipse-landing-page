// middleware/CheckRole.js
const checkRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Add role to user object from user_metadata if it exists
      const userRole = req.user.user_metadata?.role || req.user.role;

      if (!userRole || userRole === 'authenticated') {
        return res.status(403).json({ 
          error: 'Role not assigned. Please contact support to get proper role assignment.',
          currentRole: userRole,
          requiredRole
        });
      }

      if (userRole !== requiredRole) {
        return res.status(403).json({ 
          error: 'Access denied. Insufficient permissions.',
          currentRole: userRole,
          requiredRole
        });
      }

      // Add role to request object for later use
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Error checking user role' });
    }
  };
};

module.exports = checkRole;