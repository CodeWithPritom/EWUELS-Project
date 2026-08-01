const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const staffController = require('../controllers/staffController');

// Apply middleware to all staff routes
router.use(authMiddleware);
router.use(requireRole('Staff'));

// Dashboard
router.get('/dashboard', staffController.dashboard);

// Pending Requests (Approve / Reject)
router.get('/pending', staffController.pendingRequests);
router.post('/approve/:requestId', staffController.approveRequest);
router.post('/reject/:requestId', staffController.rejectRequest);

// Reserved Equipment (Issue / Cancel)
router.get('/reserved', staffController.reservedList);
router.post('/cancel/:requestId', staffController.staffCancel);
router.post('/issue/:requestId', staffController.issueEquipment);

// Issued Equipment (Return)
router.get('/issued', staffController.issuedList);
router.get('/return/:requestId', staffController.returnForm);
router.post('/return/:requestId', staffController.processReturn);

// Fine Management
router.get('/fines', staffController.listFines);
router.post('/fines/:fineId/pay', staffController.markFinePaid);

// Block Management
router.get('/blocks', staffController.listUsersForBlock);
router.post('/blocks/:userId/block', staffController.manualBlock);
router.post('/blocks/:userId/unblock', staffController.manualUnblock);

module.exports = router;
