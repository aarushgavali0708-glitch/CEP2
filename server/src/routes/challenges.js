const express = require('express');
const router = express.Router();
const { authenticate, requireRole, institutionIsolation } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// List challenges
router.get('/', authenticate, institutionIsolation, async (req, res, next) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { institutionId: req.user.institutionId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ challenges });
  } catch (err) {
    next(err);
  }
});

// Create challenge (admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { title, description, domain, deadline } = req.body;
    const challenge = await prisma.challenge.create({
      data: {
        title, description, domain,
        deadline: deadline ? new Date(deadline) : null,
        postedBy: req.user.id,
        institutionId: req.user.institutionId,
      },
    });
    res.status(201).json({ challenge });
  } catch (err) {
    next(err);
  }
});

// Close challenge (admin)
router.patch('/:id/close', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const challenge = await prisma.challenge.update({
      where: { id: req.params.id },
      data: { status: 'closed' },
    });
    res.json({ challenge });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
