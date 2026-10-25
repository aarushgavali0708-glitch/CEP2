const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// Get all skills
router.get('/', authenticate, async (req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ skills });
  } catch (err) {
    next(err);
  }
});

// Search skills
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    const skills = await prisma.skill.findMany({
      where: {
        isActive: true,
        name: { contains: q || '' },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
    res.json({ skills });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
