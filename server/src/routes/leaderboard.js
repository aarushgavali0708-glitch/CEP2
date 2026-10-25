const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// Get leaderboard
router.get('/', authenticate, async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;
    // Build from student profiles ordered by XP
    const profiles = await prisma.studentProfile.findMany({
      where: { user: { institutionId, isActive: true } },
      include: {
        user: { select: { id: true, fullName: true } },
        userSkills: { select: { id: true } },
      },
      orderBy: { xp: 'desc' },
      take: 50,
    });

    const leaderboard = profiles.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      fullName: p.user.fullName,
      avatarUrl: p.avatarUrl,
      department: p.department,
      xp: p.xp,
      level: p.level,
      skillCount: p.userSkills.length,
    }));

    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
