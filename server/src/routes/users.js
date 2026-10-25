const express = require('express');
const router = express.Router();
const { authenticate, requireRole, institutionIsolation } = require('../middleware/auth');
const {
  completeOnboarding, getProfile, updateProfile, updateSkills, searchStudents, getLeaderboard,
} = require('../controllers/users');

router.use(authenticate);

router.post('/onboarding', completeOnboarding);
router.get('/search', institutionIsolation, searchStudents);
router.get('/leaderboard', institutionIsolation, getLeaderboard);
router.get('/:userId/profile', institutionIsolation, getProfile);
router.put('/profile', updateProfile);
router.put('/skills', updateSkills);

module.exports = router;
