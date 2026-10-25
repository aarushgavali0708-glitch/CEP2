const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  applyToRole,
  getRoleApplications,
  getProjectApplications,
  updateApplicationStatus,
  withdrawApplication,
  getMyApplications,
} = require('../controllers/applications');

router.use(authenticate);

// Student routes
router.get('/my', getMyApplications);
router.post('/roles/:roleId/apply', requireRole('student'), applyToRole);
router.patch('/:id/withdraw', withdrawApplication);
router.delete('/:id', withdrawApplication);

// Owner / Admin routes
router.get('/projects/:projectId', getProjectApplications);
router.get('/roles/:roleId', getRoleApplications);
router.patch('/:id/status', updateApplicationStatus);

module.exports = router;
