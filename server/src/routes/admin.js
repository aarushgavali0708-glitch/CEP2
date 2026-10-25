const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getDashboardStats, listAllProjects, approveProject, rejectProject, archiveProject, featureProject,
  listStudents, suspendStudent, activateStudent,
  listSkills, addSkill, deleteSkill,
  listPendingRecommendations, approveRecommendation, rejectRecommendation,
  listReports, resolveReport, getAuditLog,
} = require('../controllers/admin');

router.use(authenticate, requireRole('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Projects
router.get('/projects', listAllProjects);
router.patch('/projects/:id/approve', approveProject);
router.patch('/projects/:id/reject', rejectProject);
router.patch('/projects/:id/archive', archiveProject);
router.patch('/projects/:id/feature', featureProject);

// Students
router.get('/students', listStudents);
router.patch('/students/:id/suspend', suspendStudent);
router.patch('/students/:id/activate', activateStudent);

// Skills
router.get('/skills', listSkills);
router.post('/skills', addSkill);
router.delete('/skills/:id', deleteSkill);

// Recommendations
router.get('/recommendations', listPendingRecommendations);
router.patch('/recommendations/:id/approve', approveRecommendation);
router.patch('/recommendations/:id/reject', rejectRecommendation);

// Reports
router.get('/reports', listReports);
router.patch('/reports/:id/resolve', resolveReport);

// Audit log
router.get('/audit', getAuditLog);

module.exports = router;
