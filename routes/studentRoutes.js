const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const fineCheckMiddleware = require('../middlewares/fineCheckMiddleware');
const blockCheckMiddleware = require('../middlewares/blockCheckMiddleware');
const studentController = require('../controllers/studentController');

// Apply middleware chain
router.use(authMiddleware);
router.use(requireRole('Student', 'Faculty'));
router.use(fineCheckMiddleware); // Runs on-demand check for overdue items
router.use(blockCheckMiddleware); // Redirects if user is blocked (except allowed routes)

// Dashboard
router.get('/dashboard', studentController.dashboard);

// Browse equipment
router.get('/browse', studentController.browse);

// Request form & submit
router.get('/request/:typeId', studentController.requestForm);
router.post('/request/:typeId', studentController.submitRequest);

// My Requests
router.get('/my-requests', studentController.myRequests);
router.post('/cancel/:requestId', studentController.cancelRequest);

// My Fines
router.get('/my-fines', studentController.myFines);

// Blocked page
router.get('/blocked', studentController.blockedPage);

module.exports = router;
