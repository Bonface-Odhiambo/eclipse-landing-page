// middleware/permissions.js

const permissions = {
    // Admin permissions
    MANAGE_USERS: 'manage:users',
    MANAGE_ORDERS: 'manage:orders',
    MANAGE_PAYMENTS: 'manage:payments',
    MANAGE_WRITERS: 'manage:writers',
    MANAGE_EDITORS: 'manage:editors',
    MANAGE_SUBSCRIPTIONS: 'manage:subscriptions',
    READ_STATISTICS: 'read:statistics',
  
    // Editor permissions
    READ_ORDERS: 'read:orders',
    READ_WRITER_SUBMISSIONS: 'read:writer_submissions',
    MANAGE_WRITER_SUBMISSIONS: 'manage:writer_submissions',
    CREATE_REPORTS: 'create:reports',
    READ_USER_PROFILES: 'read:user_profiles',
    SUBMIT_WORK_TO_EMPLOYER: 'submit:work_to_employer',
  
    // Writer permissions
    BID_ON_ORDERS: 'bid:orders',
    SUBMIT_WORK: 'submit:work',
    VIEW_OWN_ORDERS: 'view:own_orders',
    WITHDRAW_EARNINGS: 'withdraw:earnings',
    VIEW_LOGGED_IN_EMPLOYERS: 'view:logged_in_employers',
    VIEW_POSTED_ORDERS: 'view:posted_orders',
  
    // Employer permissions
    POST_ORDERS: 'post:orders',
    ASSIGN_ORDERS: 'assign:orders',
    VIEW_OWN_POSTED_ORDERS: 'view:own_posted_orders',
    PRIVATIZE_WRITERS: 'privatize:writers',
    REQUEST_REFUND: 'request:refund',
    VIEW_REPORTS: 'view:reports',
  
    // Communication permissions
    CHAT_WITH_EMPLOYERS: 'chat:employers',
    CHAT_WITH_WRITERS: 'chat:writers',
    CHAT_WITH_EDITORS: 'chat:editors',
    CHAT_WITH_ADMIN: 'chat:admin',
  };
  
  const rolePermissions = {
    admin: [
      permissions.MANAGE_USERS,
      permissions.MANAGE_ORDERS,
      permissions.MANAGE_PAYMENTS,
      permissions.MANAGE_WRITERS,
      permissions.MANAGE_EDITORS,
      permissions.MANAGE_SUBSCRIPTIONS,
      permissions.READ_STATISTICS,
      permissions.READ_ORDERS,
      permissions.READ_WRITER_SUBMISSIONS,
      permissions.CREATE_REPORTS,
      permissions.READ_USER_PROFILES,
      permissions.CHAT_WITH_EMPLOYERS,
      permissions.CHAT_WITH_WRITERS,
      permissions.CHAT_WITH_EDITORS,
    ],
    editor: [
      permissions.READ_ORDERS,
      permissions.READ_WRITER_SUBMISSIONS,
      permissions.MANAGE_WRITER_SUBMISSIONS,
      permissions.CREATE_REPORTS,
      permissions.READ_USER_PROFILES,
      permissions.CHAT_WITH_EMPLOYERS,
      permissions.CHAT_WITH_WRITERS,
      permissions.SUBMIT_WORK_TO_EMPLOYER,
    ],
    writer: [
      permissions.BID_ON_ORDERS,
      permissions.SUBMIT_WORK,
      permissions.VIEW_OWN_ORDERS,
      permissions.WITHDRAW_EARNINGS,
      permissions.VIEW_LOGGED_IN_EMPLOYERS,
      permissions.VIEW_POSTED_ORDERS,
      permissions.CHAT_WITH_EMPLOYERS,
      permissions.CHAT_WITH_EDITORS,
      permissions.CHAT_WITH_ADMIN,
    ],
    employer: [
      permissions.POST_ORDERS,
      permissions.ASSIGN_ORDERS,
      permissions.VIEW_OWN_POSTED_ORDERS,
      permissions.PRIVATIZE_WRITERS,
      permissions.REQUEST_REFUND,
      permissions.VIEW_REPORTS,
      permissions.CHAT_WITH_WRITERS,
      permissions.CHAT_WITH_EDITORS,
      permissions.CHAT_WITH_ADMIN,
    ]
  };
  
  const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
      const userRole = req.user.role; // Assuming role is set in req.user by Auth0
      if (rolePermissions[userRole] && rolePermissions[userRole].includes(requiredPermission)) {
        next();
      } else {
        res.status(403).json({ error: 'Permission denied' });
      }
    };
  };
  
  module.exports = { permissions, checkPermission };