const express = require('express');
const router = express.Router();
const { authenticate, requireRole, institutionIsolation } = require('../middleware/auth');
const { listProjects, getProject, createProject, updateProject, getSuggestedStudents, getMyProjects } = require('../controllers/projects');

router.use(authenticate, institutionIsolation);

router.get('/', listProjects);
router.get('/my', getMyProjects);
router.get('/:id', getProject);
router.post('/', requireRole('student', 'admin'), createProject);
router.put('/:id', updateProject);
router.get('/roles/:roleId/suggestions', requireRole('student', 'admin'), getSuggestedStudents);

module.exports = router;
