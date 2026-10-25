const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, adminLogin, getMe, getInstitutions } = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.get('/institutions', getInstitutions);

router.post('/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('institutionId').notEmpty().withMessage('Institution is required'),
], register);

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], login);

router.post('/admin/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], adminLogin);

router.get('/me', authenticate, getMe);

module.exports = router;
