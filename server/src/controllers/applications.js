// Applications controller
const prisma = require('../lib/prisma');
const { computeMatchScore } = require('../services/matchingEngine');
const {
  validateApplication,
  validateAcceptance,
  computeUpdatedSeats,
} = require('../services/applicationRules');

// ── Apply to a role ───────────────────────────
const applyToRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { message } = req.body;
    const studentId = req.user.id;
    const studentInstitutionId = req.user.institutionId;

    const role = await prisma.projectRole.findUnique({
      where: { id: roleId },
      include: {
        roleSkills: { include: { skill: true } },
        project: true,
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check existing application
    const existing = await prisma.application.findUnique({
      where: { roleId_studentId: { roleId, studentId } },
    });

    // Check existing team membership
    const isMember = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId: role.projectId, userId: studentId } },
    });

    // Validate using application rules
    const validation = validateApplication({
      studentId,
      studentInstitutionId,
      project: role.project,
      role,
      existingApplication: existing,
      isExistingMember: !!isMember,
    });

    if (!validation.valid) {
      return res.status(validation.status || 400).json({ error: validation.error });
    }

    // Compute match score
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: { include: { userSkills: { include: { skill: true } } } } },
    });

    const matchResult = computeMatchScore(student, role, role.project);

    let application;
    if (existing && existing.status === 'withdrawn') {
      // Re-apply if previously withdrawn
      application = await prisma.application.update({
        where: { id: existing.id },
        data: {
          message: message || '',
          matchScore: matchResult.score,
          status: 'pending',
          updatedAt: new Date(),
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              studentProfile: { select: { avatarUrl: true, department: true } },
            },
          },
          role: { select: { id: true, title: true, seats: true, filledSeats: true } },
        },
      });
    } else {
      application = await prisma.application.create({
        data: {
          roleId,
          studentId,
          message: message || '',
          matchScore: matchResult.score,
          status: 'pending',
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              studentProfile: { select: { avatarUrl: true, department: true } },
            },
          },
          role: { select: { id: true, title: true, seats: true, filledSeats: true } },
        },
      });
    }

    // Notify project owner
    await prisma.notification.create({
      data: {
        userId: role.project.ownerId,
        type: 'application_received',
        title: 'New Application',
        message: `${req.user.fullName} applied for ${role.title} in "${role.project.title}" (${Math.round(matchResult.score)}% match).`,
        link: `/projects/${role.projectId}`,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${role.project.ownerId}`).emit('notification', {
        type: 'application_received',
        message: `${req.user.fullName} applied for ${role.title}`,
        application,
        matchScore: matchResult.score,
      });
    }

    res.status(201).json({ application, matchResult });
  } catch (err) {
    next(err);
  }
};

// ── Get applications for a whole project (owner/admin) ──
const getProjectApplications = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        institutionId: req.user.institutionId,
      },
      include: {
        roles: {
          include: { roleSkills: { include: { skill: true } } },
        },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const roleIds = project.roles.map((r) => r.id);
    const applications = await prisma.application.findMany({
      where: { roleId: { in: roleIds } },
      include: {
        role: {
          select: {
            id: true,
            title: true,
            seats: true,
            filledSeats: true,
          },
        },
        student: {
          include: {
            studentProfile: {
              include: { userSkills: { include: { skill: true } } },
            },
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    });

    const roleMap = new Map(project.roles.map((r) => [r.id, r]));
    const enriched = applications.map((app) => {
      const role = roleMap.get(app.roleId);
      const matchResult = computeMatchScore(app.student, role, project);
      return {
        ...app,
        matchResult,
      };
    });

    res.json({ applications: enriched });
  } catch (err) {
    next(err);
  }
};

// ── Get applications for a role (owner only) ──
const getRoleApplications = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    const role = await prisma.projectRole.findUnique({
      where: { id: roleId },
      include: {
        project: true,
        roleSkills: { include: { skill: true } },
      },
    });

    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.project.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'Cannot access projects outside your institution' });
    }
    if (role.project.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const applications = await prisma.application.findMany({
      where: { roleId },
      include: {
        role: {
          select: { id: true, title: true, seats: true, filledSeats: true },
        },
        student: {
          include: {
            studentProfile: {
              include: { userSkills: { include: { skill: true } } },
            },
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    });

    const enriched = applications.map((app) => {
      const result = computeMatchScore(app.student, role, role.project);
      return { ...app, matchResult: result };
    });

    res.json({ applications: enriched });
  } catch (err) {
    next(err);
  }
};

// ── Accept / Reject application ───────────────
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // accepted | rejected

    const app = await prisma.application.findUnique({
      where: { id },
      include: {
        role: { include: { project: true } },
        student: true,
      },
    });

    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.role.project.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'Cannot manage projects outside your institution' });
    }
    if (app.role.project.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (status === 'accepted') {
      const acceptanceValidation = validateAcceptance({
        role: app.role,
        application: app,
      });

      if (!acceptanceValidation.valid) {
        return res
          .status(acceptanceValidation.status || 400)
          .json({ error: acceptanceValidation.error });
      }

      // Add student to project team
      await prisma.teamMember.upsert({
        where: {
          projectId_userId: {
            projectId: app.role.projectId,
            userId: app.studentId,
          },
        },
        update: { roleId: app.roleId },
        create: {
          projectId: app.role.projectId,
          userId: app.studentId,
          roleId: app.roleId,
        },
      });

      // Increment filled seats
      await prisma.projectRole.update({
        where: { id: app.roleId },
        data: { filledSeats: { increment: 1 } },
      });

      // Award XP to student
      await prisma.studentProfile.update({
        where: { userId: app.studentId },
        data: { xp: { increment: 100 } },
      });

      // Award First Project badge if first acceptance
      const memberCount = await prisma.teamMember.count({ where: { userId: app.studentId } });
      if (memberCount === 1) {
        const badge = await prisma.badge.findUnique({ where: { name: 'First Project' } });
        if (badge) {
          await prisma.userBadge.upsert({
            where: { userId_badgeId: { userId: app.studentId, badgeId: badge.id } },
            update: {},
            create: { userId: app.studentId, badgeId: badge.id },
          });
        }
      }
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
    });

    // Notify applicant
    await prisma.notification.create({
      data: {
        userId: app.studentId,
        type: status === 'accepted' ? 'application_accepted' : 'application_rejected',
        title: status === 'accepted' ? '🎉 Application Accepted!' : 'Application Update',
        message:
          status === 'accepted'
            ? `You've been accepted as ${app.role.title} in "${app.role.project.title}"!`
            : `Your application for ${app.role.title} in "${app.role.project.title}" was not selected.`,
        link: `/projects/${app.role.projectId}`,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${app.studentId}`).emit('notification', {
        type: status === 'accepted' ? 'application_accepted' : 'application_rejected',
        message:
          status === 'accepted'
            ? `You got the ${app.role.title} role in "${app.role.project.title}"!`
            : `Application for ${app.role.title} was not accepted`,
        confetti: status === 'accepted',
      });
    }

    res.json({ application: updated });
  } catch (err) {
    next(err);
  }
};

// ── Withdraw application (student) ────────────
const withdrawApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: { role: { include: { project: true } } },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to withdraw this application' });
    }

    if (application.status !== 'pending') {
      return res
        .status(400)
        .json({ error: `Cannot withdraw an application with status "${application.status}"` });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'withdrawn' },
    });

    res.json({ message: 'Application withdrawn successfully', application: updated });
  } catch (err) {
    next(err);
  }
};

// ── My applications ───────────────────────────
const getMyApplications = async (req, res, next) => {
  try {
    const apps = await prisma.application.findMany({
      where: { studentId: req.user.id },
      include: {
        role: {
          include: {
            roleSkills: { include: { skill: true } },
            project: {
              include: {
                owner: { select: { fullName: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ applications: apps });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  applyToRole,
  getRoleApplications,
  getProjectApplications,
  updateApplicationStatus,
  withdrawApplication,
  getMyApplications,
};
