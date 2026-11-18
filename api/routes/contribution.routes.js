const express = require('express');
const router = express.Router();
const {
  createContribution,
  getUserContributions,
  getContributionInvoice,
  emailInvoice,
  getContributionStats,
} = require('../controllers/contribution.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  validateContribution,
  validateObjectIdParam,
} = require('../middlewares/validation.middleware');

// Protect all /contributions routes with authentication
router.use('/contributions', authenticateToken);

// POST /api/contributions - Create new contribution
router.post('/contributions', validateContribution, createContribution);

// GET /api/contributions/user/:userId - Get user contributions
router.get('/contributions/user/:userId', validateObjectIdParam('userId'), getUserContributions);

// GET /api/contributions/stats/:userId - Get contribution statistics
router.get('/contributions/stats/:userId', validateObjectIdParam('userId'), getContributionStats);

// GET /api/contributions/:id/invoice - Get contribution invoice
router.get('/contributions/:id/invoice', validateObjectIdParam('id'), getContributionInvoice);

// POST /api/contributions/:id/email-invoice - Email invoice
router.post('/contributions/:id/email-invoice', validateObjectIdParam('id'), emailInvoice);

module.exports = router;
