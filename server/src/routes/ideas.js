const express = require('express');
const router = express.Router();
const { authenticate, requireRole, institutionIsolation } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const Filter = require('bad-words');
const filter = new Filter();

// List ideas
router.get('/', authenticate, institutionIsolation, async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;
    const ideas = await prisma.idea.findMany({
      where: { institutionId, status: { not: 'archived' } },
      include: {
        author: { select: { fullName: true, studentProfile: { select: { avatarUrl: true } } } },
        votes: { select: { userId: true } },
        _count: { select: { votes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ ideas: ideas.map(i => ({
      ...i,
      voteCount: i._count.votes,
      commentCount: i._count.comments,
      hasVoted: i.votes.some(v => v.userId === req.user.id),
    })) });
  } catch (err) {
    next(err);
  }
});

// Get single idea with comments
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { fullName: true, studentProfile: { select: { avatarUrl: true } } } },
        votes: { select: { userId: true } },
        comments: {
          include: {
            author: { select: { fullName: true, studentProfile: { select: { avatarUrl: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    res.json({ idea: { ...idea, hasVoted: idea.votes.some(v => v.userId === req.user.id) } });
  } catch (err) {
    next(err);
  }
});

// Post idea
router.post('/', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { title, problem, domain } = req.body;
    if (filter.isProfane(title + ' ' + problem)) {
      return res.status(400).json({ error: 'Content contains inappropriate language' });
    }
    const idea = await prisma.idea.create({
      data: {
        title, problem, domain,
        authorId: req.user.id,
        institutionId: req.user.institutionId,
      },
    });
    res.status(201).json({ idea });
  } catch (err) {
    next(err);
  }
});

// Vote on idea
router.post('/:id/vote', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const existing = await prisma.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId: id, userId } },
    });
    if (existing) {
      await prisma.ideaVote.delete({ where: { id: existing.id } });
      return res.json({ voted: false });
    }
    await prisma.ideaVote.create({ data: { ideaId: id, userId } });
    res.json({ voted: true });
  } catch (err) {
    next(err);
  }
});

// Comment on idea
router.post('/:id/comments', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (filter.isProfane(content)) {
      return res.status(400).json({ error: 'Inappropriate language' });
    }
    const comment = await prisma.ideaComment.create({
      data: { ideaId: req.params.id, authorId: req.user.id, content },
      include: { author: { select: { fullName: true, studentProfile: { select: { avatarUrl: true } } } } },
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// Pick up idea (convert to project)
router.post('/:id/pickup', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    if (idea.status !== 'open') return res.status(400).json({ error: 'Idea already picked up' });

    const { roles } = req.body;
    const project = await prisma.project.create({
      data: {
        title: idea.title,
        description: idea.problem,
        domain: idea.domain || 'General',
        ownerId: req.user.id,
        institutionId: req.user.institutionId,
        status: 'pending',
        roles: {
          create: (roles || []).map(r => ({
            title: r.title,
            seats: r.seats || 1,
            hoursPerWeek: r.hoursPerWeek || 10,
            roleSkills: {
              create: (r.skills || []).map(s => ({
                skillId: s.skillId,
                requiredLevel: s.requiredLevel || 'Beginner',
              })),
            },
          })),
        },
      },
    });

    await prisma.idea.update({
      where: { id },
      data: { status: 'picked', pickedByProject: project.id },
    });

    await prisma.teamMember.create({ data: { projectId: project.id, userId: req.user.id } });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// Report idea
router.post('/:id/report', authenticate, async (req, res, next) => {
  try {
    const { reason, description } = req.body;
    const idea = await prisma.idea.findUnique({ where: { id: req.params.id } });
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    await prisma.report.create({
      data: {
        reporterId: req.user.id,
        reportedUserId: idea.authorId,
        reason,
        description,
      },
    });
    res.json({ message: 'Reported successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
