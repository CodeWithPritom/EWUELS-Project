const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET /auth/login
router.get('/login', authController.getLogin);

// POST /auth/login
router.post('/login', authController.login);

// GET /auth/signup
router.get('/signup', authController.getSignup);

// POST /auth/signup
router.post('/signup', authController.signup);

// GET /auth/logout
router.get('/logout', authController.logout);

module.exports = router;
