const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Profile Management Routes
router.get('/profile', 
    auth, 
    UserController.getUserProfile
);

router.patch('/profile/update', 
    auth, 
    UserController.updateUserProfile
);

// Subscription Routes
router.get('/subscription/check', 
    auth, 
    roleCheck('writer'), 
    UserController.checkSubscription
);

// Private Writers Management Routes
router.post('/writers/:writerId/make-private', 
    auth, 
    roleCheck('employer'), 
    UserController.makeWriterPrivate
);

router.delete('/writers/:writerId/remove-private', 
    auth, 
    roleCheck('employer'), 
    UserController.removePrivateWriter
);

router.get('/private-writers', 
    auth, 
    roleCheck('employer'), 
    UserController.getPrivateWriters
);

// Role-Specific Dashboard Routes
router.get('/dashboard/writer', 
    auth, 
    roleCheck('writer'), 
    UserController.getWriterDashboard
);

router.get('/dashboard/editor', 
    auth, 
    roleCheck('editor'), 
    UserController.getEditorDashboard
);

module.exports = router;