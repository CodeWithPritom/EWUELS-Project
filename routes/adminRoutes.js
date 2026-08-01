const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const adminController = require('../controllers/adminController');

// Apply middleware to all admin routes
router.use(authMiddleware);
router.use(requireRole('Admin'));

// Dashboard
router.get('/dashboard', adminController.dashboard);

// Equipment Types
router.get('/equipment-types', adminController.listTypes);
router.get('/equipment-types/:id/edit', adminController.editTypeForm);
router.post('/equipment-types', adminController.createType);
router.put('/equipment-types/:id', adminController.updateType);
router.delete('/equipment-types/:id', adminController.deleteType);

// Equipment Copies
router.get('/equipment-copies', adminController.listCopies);
router.post('/equipment-copies', adminController.addCopy);
router.put('/equipment-copies/:id/status', adminController.updateCopyStatus);
router.delete('/equipment-copies/:id', adminController.deleteCopy);

// Staff Accounts
router.get('/staff-accounts', adminController.listStaff);
router.post('/staff-accounts', adminController.createStaffAccount);

// Fine Settings
router.get('/fine-settings', adminController.getFineSettings);
router.post('/fine-settings', adminController.updateFineSettings);

// Audit Log
router.get('/audit-log', adminController.viewAuditLog);

// Maintenance Management
router.get('/maintenance', adminController.listMaintenance);
router.post('/maintenance/:id/repair', adminController.markRepaired);

module.exports = router;
