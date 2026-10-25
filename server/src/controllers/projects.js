// Projects controller
const prisma = require('../lib/prisma');
const { computeProjectMatchScore } = require('../services/matchingEngine');
const Filter = require('bad-words');
const filter = new Filter();

// Helper: build student data for matching
async function getStudentMatchData(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: { userSkills: { include: { skill: true } } },
      },
    },
  });

  const completedProjects = await prisma.teamMember.count({
    where: {
      userId,
      project: { status: 'completed' },
    },
  });

  const endorsementsCount = await prisma.skillEndorsement.count({
    where: { userSkill: { profile: { userId } } },
  });

  const reviews = await prisma.peerReview.findMany({
    where: { revieweeId: userId },
  });
  const avgPeerRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + ((r.ratingReliability + r.ratingCommunication + r.ratingSkill) / 3), 0) / reviews.length
    : 0;

  return { ...user, completedProjects, endorsementsCount, avgPeerRating };
}

// ── List / Discover Projects ──────────────────
const listProjects = async (req, res, next) => {
  try {
    const { domain, status, skill, search, sort } = req.query;
    const institutionId = req.institutionId || req.user?.institutionId;

    const where = {
      institutionId,
      status: { not: 'rejected' },
    };

    if (domain) where.domain = domain;
    if (status) where.status = status;
    else where.status = { in: ['active', 'pending'] };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    let projects = await prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true } } } },
        roles: {
          include: { roleSkills: { include: { skill: true } } },
        },
        members: { include: { user: { select: { id: true, fullName: true } } } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by skill if provided
    if (skill) {
      projects = projects.filter(p =>
        p.roles.some(r => r.roleSkills.some(rs => rs.skill.name.toLowerCase() === skill.toLowerCase()))
      );
    }

    // Compute match scores if student
    if (req.user?.role === 'student') {
      const student = await getStudentMatchData(req.user.id);
      projects = projects.map(p => {
        const matchResult = computeProjectMatchScore(student, p);
        return { ...p, matchScore: matchResult.score, bestRole: matchResult.bestRole, matchBreakdown: matchResult.breakdown };
      });

      // Sort by match score by default
      if (!sort || sort === 'match') {
        projects.sort((a, b) => b.matchScore - a.matchScore);
      } else if (sort === 'latest') {
        projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    }

    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

// ── Get single project ────────────────────────
const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const institutionId = req.user?.institutionId;

    const project = await prisma.project.findFirst({
      where: { id, institutionId },
      include: {
        owner: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true, department: true } } } },
        roles: {
          include: { roleSkills: { include: { skill: true } } },
        },
        members: {
          include: {
            user: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true, department: true } } } },
            role: { select: { title: true } },
          },
        },
        milestones: { orderBy: { dueDate: 'asc' } },
        _count: { select: { members: true } },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    let matchResult = null;
    if (req.user?.role === 'student') {
      const student = await getStudentMatchData(req.user.id);
      const roleScores = [];
      for (const role of project.roles) {
        if (role.filledSeats < role.seats) {
          const { computeMatchScore, getLearningResources } = require('../services/matchingEngine');
          const result = computeMatchScore(student, role, project);
          const missingWithResources = result.explanation.missing.map(skill => ({
            skill,
            resources: getLearningResources(skill),
          }));
          roleScores.push({ role, ...result, missingWithResources });
        }
      }
      roleScores.sort((a, b) => b.score - a.score);
      matchResult = { roleScores, bestScore: roleScores[0]?.score || 0 };
    }

    res.json({ project, matchResult });
  } catch (err) {
    next(err);
  }
};

// ── Create project ────────────────────────────
const createProject = async (req, res, next) => {
  try {
    const { title, description, goals, domain, duration, roles } = req.body;
    const ownerId = req.user.id;
    const institutionId = req.user.institutionId;

    // Profanity check
    if (filter.isProfane(title + ' ' + description)) {
      return res.status(400).json({ error: 'Content contains inappropriate language' });
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        goals,
        domain,
        duration,
        ownerId,
        institutionId,
        status: 'pending', // requires admin approval
        roles: {
          create: roles.map(r => ({
            title: r.title,
            description: r.description,
            seats: r.seats || 1,
            hoursPerWeek: r.hoursPerWeek || 10,
            importance: r.importance || 'must-have',
            roleSkills: {
              create: (r.skills || []).map(s => ({
                skillId: s.skillId,
                requiredLevel: s.requiredLevel || 'Beginner',
                importance: s.importance || 'must-have',
              })),
            },
          })),
        },
      },
      include: {
        roles: { include: { roleSkills: { include: { skill: true } } } },
      },
    });

    // Auto-add owner as member
    await prisma.teamMember.create({
      data: { projectId: project.id, userId: ownerId },
    });

    // Notify admin (via notification to all admins)
    const admins = await prisma.user.findMany({
      where: { institutionId, role: 'admin' },
    });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'new_project_pending',
          title: 'New Project Pending Approval',
          message: `"${title}" by ${req.user.fullName} needs review.`,
          link: `/admin/projects`,
        },
      });
    }

    const io = req.app.get('io');
    io.to(`institution:${institutionId}:admins`).emit('notification', {
      type: 'new_project_pending',
      message: `New project "${title}" awaiting approval`,
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
};

// ── Update project ────────────────────────────
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, goals, domain, duration, timeline } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { title, description, goals, domain, duration, timeline },
    });

    res.json({ project: updated });
  } catch (err) {
    next(err);
  }
};

// ── Get suggested students for a role ─────────
const getSuggestedStudents = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const institutionId = req.user.institutionId;

    const role = await prisma.projectRole.findFirst({
      where: { id: roleId },
      include: {
        roleSkills: { include: { skill: true } },
        project: true,
      },
    });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.project.institutionId !== institutionId) {
      return res.status(403).json({ error: 'Cannot access projects outside your institution' });
    }

    // Get all students in the institution (not already members)
    const members = await prisma.teamMember.findMany({
      where: { projectId: role.projectId },
      select: { userId: true },
    });
    const memberIds = members.map(m => m.userId);

    // Also exclude existing applicants to this role
    const applicants = await prisma.application.findMany({
      where: { roleId },
      select: { studentId: true },
    });
    const applicantIds = applicants.map(a => a.studentId);

    // Get existing invitations for this role to annotate invite status
    const existingInvitations = await prisma.invitation.findMany({
      where: { roleId },
      select: { id: true, recipientId: true, status: true },
    });
    const invitationMap = new Map(existingInvitations.map(inv => [inv.recipientId, inv]));

    const excludedIds = Array.from(
      new Set([...memberIds, ...applicantIds, role.project.ownerId, req.user.id])
    );

    const students = await prisma.user.findMany({
      where: {
        institutionId,
        role: 'student',
        id: { notIn: excludedIds },
        isActive: true,
      },
      include: {
        studentProfile: {
          include: { userSkills: { include: { skill: true } } },
        },
      },
      take: 50,
    });

    const { computeMatchScore } = require('../services/matchingEngine');

    const ranked = students
      .filter(s => s.studentProfile)
      .map(s => {
        const result = computeMatchScore(s, role, role.project);
        const inv = invitationMap.get(s.id);
        return {
          student: s,
          invitation: inv || null,
          ...result,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ suggestions: ranked });
  } catch (err) {
    next(err);
  }
};

// ── Get my projects (owned & joined) ──────────
const getMyProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const institutionId = req.institutionId || req.user.institutionId;

    // Owned projects
    const owned = await prisma.project.findMany({
      where: {
        ownerId: userId,
        institutionId,
      },
      include: {
        roles: {
          include: { roleSkills: { include: { skill: true } } },
        },
        members: {
          include: {
            user: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true } } } },
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Joined projects (member but not owner)
    const memberships = await prisma.teamMember.findMany({
      where: {
        userId,
        project: {
          ownerId: { not: userId },
          institutionId,
        },
      },
      include: {
        role: { select: { id: true, title: true } },
        project: {
          include: {
            owner: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true } } } },
            roles: {
              include: { roleSkills: { include: { skill: true } } },
            },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const joined = memberships.map(m => ({
      ...m.project,
      myRole: m.role?.title || 'Contributor',
      joinedAt: m.joinedAt,
    }));

    res.json({ owned, joined });
  } catch (err) {
    next(err);
  }
};

module.exports = { listProjects, getProject, createProject, updateProject, getSuggestedStudents, getMyProjects };
