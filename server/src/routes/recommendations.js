const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

// Request recommendation
router.post('/request', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { teacherEmail, teacherName } = req.body;
    const token = uuidv4();

    const rec = await prisma.recommendation.create({
      data: {
        studentId: req.user.id,
        teacherEmail,
        teacherName,
        token,
        status: 'pending',
      },
    });

    // TODO: Send email with secure link in production
    // For demo, return the token
    const link = `${process.env.CLIENT_URL}/recommendations/${token}`;

    res.status(201).json({ recommendation: rec, link });
  } catch (err) {
    next(err);
  }
});

// Get recommendation form (public — teacher uses token)
router.get('/form/:token', async (req, res, next) => {
  try {
    const rec = await prisma.recommendation.findUnique({
      where: { token: req.params.token },
      include: { student: { select: { fullName: true, email: true } } },
    });
    if (!rec) return res.status(404).json({ error: 'Recommendation link not found or expired' });
    if (rec.status !== 'pending') {
      return res.status(400).json({ error: 'This recommendation has already been submitted' });
    }
    res.json({ recommendation: rec });
  } catch (err) {
    next(err);
  }
});

// Submit recommendation (teacher — no auth needed, uses token)
router.post('/submit/:token', async (req, res, next) => {
  try {
    const {
      text, teacherName, teacherDesignation, teacherDepartment,
      ratingTechnical, ratingTeamwork, ratingReliability, ratingCommunication,
      endorsedSkills,
    } = req.body;

    const rec = await prisma.recommendation.update({
      where: { token: req.params.token },
      data: {
        text,
        teacherName,
        teacherDesignation,
        teacherDepartment,
        ratingTechnical: parseInt(ratingTechnical),
        ratingTeamwork: parseInt(ratingTeamwork),
        ratingReliability: parseInt(ratingReliability),
        ratingCommunication: parseInt(ratingCommunication),
        endorsedSkills: JSON.stringify(endorsedSkills || []),
        status: 'submitted',
        submittedAt: new Date(),
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: rec.studentId,
        type: 'recommendation',
        title: 'Recommendation Received',
        message: `${teacherName} submitted a recommendation for you. Awaiting admin approval.`,
        link: `/profile/${rec.studentId}`,
      },
    });

    res.json({ message: 'Recommendation submitted successfully. It will appear after admin review.' });
  } catch (err) {
    next(err);
  }
});

// Get my recommendations
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const recs = await prisma.recommendation.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ recommendations: recs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
