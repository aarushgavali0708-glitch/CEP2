// Admin controller
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// Log admin action
async function logAction(adminId, action, entityType, entityId, details) {
  await prisma.auditLog.create({
    data: { adminId, action, entityType, entityId, details: JSON.stringify(details) },
  });
}

// ── Dashboard stats ───────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;

    const [
      totalStudents, activeProjects, completedProjects,
      pendingProjects, totalTeams, unfilledRoles,
      pendingRecs, openReports,
    ] = await Promise.all([
      prisma.user.count({ where: { institutionId, role: 'student', isActive: true } }),
      prisma.project.count({ where: { institutionId, status: 'active' } }),
      prisma.project.count({ where: { institutionId, status: 'completed' } }),
      prisma.project.count({ where: { institutionId, status: 'pending' } }),
      prisma.teamMember.count({
        where: { project: { institutionId } },
      }),
      prisma.projectRole.count({
        where: {
          project: { institutionId, status: 'active' },
          filledSeats: { lt: prisma.projectRole.fields.seats },
        },
      }),
      prisma.recommendation.count({ where: { status: 'submitted', student: { institutionId } } }),
      prisma.report.count({ where: { status: 'open' } }),
    ]);

    // Most in-demand skills
    const skillDemand = await prisma.roleSkill.groupBy({
      by: ['skillId'],
      where: { role: { project: { institutionId, status: 'active' } } },
      _count: { skillId: true },
      orderBy: { _count: { skillId: 'desc' } },
      take: 10,
    });
    const skillIds = skillDemand.map(s => s.skillId);
    const skills = await prisma.skill.findMany({ where: { id: { in: skillIds } } });
    const skillMap = Object.fromEntries(skills.map(s => [s.id, s.name]));
    const topSkills = skillDemand.map(s => ({
      skill: skillMap[s.skillId],
      demand: s._count.skillId,
    }));

    // Student supply per skill
    const skillSupply = await prisma.userSkill.groupBy({
      by: ['skillId'],
      where: { profile: { user: { institutionId } } },
      _count: { skillId: true },
    });
    const supplyMap = Object.fromEntries(
      skillSupply.map(s => [skillMap[s.skillId], s._count.skillId])
    );

    const supplyVsDemand = topSkills.map(s => ({
      skill: s.skill,
      demand: s.demand,
      supply: supplyMap[s.skill] || 0,
    }));

    // Projects by domain
    const projectsByDomain = await prisma.project.groupBy({
      by: ['domain'],
      where: { institutionId },
      _count: { domain: true },
    });

    // Recent projects
    const recentProjects = await prisma.project.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, domain: true, createdAt: true },
    });

    res.json({
      stats: {
        totalStudents,
        activeProjects,
        completedProjects,
        pendingProjects,
        totalTeams,
        unfilledRoles,
        pendingRecs,
        openReports,
      },
      topSkills,
      supplyVsDemand,
      projectsByDomain: projectsByDomain.map(p => ({ domain: p.domain, count: p._count.domain })),
      recentProjects,
    });
  } catch (err) {
    next(err);
  }
};

// ── Manage Projects ───────────────────────────
const listAllProjects = async (req, res, next) => {
  try {
    const { status, domain } = req.query;
    const institutionId = req.user.institutionId;
    const where = { institutionId };
    if (status) where.status = status;
    if (domain) where.domain = domain;

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: { select: { members: true, roles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

const approveProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.update({
      where: { id },
      data: { status: 'active' },
    });
    await logAction(req.user.id, 'approve_project', 'project', id, { title: project.title });

    // Notify owner
    await prisma.notification.create({
      data: {
        userId: project.ownerId,
        type: 'project_approved',
        title: '✅ Project Approved',
        message: `Your project "${project.title}" has been approved and is now live!`,
        link: `/projects/${id}`,
      },
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
};

const rejectProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const project = await prisma.project.update({
      where: { id },
      data: { status: 'rejected' },
    });
    await logAction(req.user.id, 'reject_project', 'project', id, { reason });

    await prisma.notification.create({
      data: {
        userId: project.ownerId,
        type: 'project_rejected',
        title: 'Project Not Approved',
        message: `Your project "${project.title}" was not approved. Reason: ${reason || 'Not specified'}`,
      },
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
};

const archiveProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });
    await logAction(req.user.id, 'archive_project', 'project', id, {});
    res.json({ project });
  } catch (err) {
    next(err);
  }
};

const featureProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.update({
      where: { id },
      data: { featured: true },
    });
    res.json({ project });
  } catch (err) {
    next(err);
  }
};

// ── Manage Students ───────────────────────────
const listStudents = async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;
    const students = await prisma.user.findMany({
      where: { institutionId, role: 'student' },
      include: {
        studentProfile: { select: { department: true, year: true, profileStrength: true } },
        _count: { select: { teamMemberships: true, applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ students });
  } catch (err) {
    next(err);
  }
};

const suspendStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    await logAction(req.user.id, 'suspend_student', 'user', id, {});
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

const activateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({ where: { id }, data: { isActive: true } });
    await logAction(req.user.id, 'activate_student', 'user', id, {});
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ── Skill taxonomy ────────────────────────────
const listSkills = async (req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { userSkills: true, roleSkills: true } } },
    });
    res.json({ skills });
  } catch (err) {
    next(err);
  }
};

const addSkill = async (req, res, next) => {
  try {
    const { name, category } = req.body;
    const skill = await prisma.skill.create({ data: { name, category } });
    await logAction(req.user.id, 'add_skill', 'skill', skill.id, { name });
    res.status(201).json({ skill });
  } catch (err) {
    next(err);
  }
};

const deleteSkill = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.skill.update({ where: { id }, data: { isActive: false } });
    await logAction(req.user.id, 'delete_skill', 'skill', id, {});
    res.json({ message: 'Skill deactivated' });
  } catch (err) {
    next(err);
  }
};

// ── Recommendations moderation ────────────────
const listPendingRecommendations = async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;
    const recs = await prisma.recommendation.findMany({
      where: { status: 'submitted', student: { institutionId } },
      include: { student: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ recommendations: recs });
  } catch (err) {
    next(err);
  }
};

const approveRecommendation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rec = await prisma.recommendation.update({
      where: { id },
      data: { status: 'approved' },
    });
    await logAction(req.user.id, 'approve_recommendation', 'recommendation', id, {});

    await prisma.notification.create({
      data: {
        userId: rec.studentId,
        type: 'recommendation',
        title: 'Recommendation Approved',
        message: `A recommendation from ${rec.teacherName} is now visible on your profile.`,
        link: `/profile/${rec.studentId}`,
      },
    });
    res.json({ recommendation: rec });
  } catch (err) {
    next(err);
  }
};

const rejectRecommendation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rec = await prisma.recommendation.update({
      where: { id },
      data: { status: 'rejected' },
    });
    await logAction(req.user.id, 'reject_recommendation', 'recommendation', id, {});
    res.json({ recommendation: rec });
  } catch (err) {
    next(err);
  }
};

// ── Reports queue ─────────────────────────────
const listReports = async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { status: 'open' },
      include: {
        reporter: { select: { fullName: true, email: true } },
        reportedUser: { select: { fullName: true, email: true } },
        reportedProject: { select: { title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ reports });
  } catch (err) {
    next(err);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // resolved | dismissed
    const report = await prisma.report.update({
      where: { id },
      data: { status: action, resolvedAt: new Date() },
    });
    await logAction(req.user.id, `${action}_report`, 'report', id, {});
    res.json({ report });
  } catch (err) {
    next(err);
  }
};

// ── Audit log ─────────────────────────────────
const getAuditLog = async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { admin: { institutionId: req.user.institutionId } },
      include: { admin: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats, listAllProjects, approveProject, rejectProject, archiveProject, featureProject,
  listStudents, suspendStudent, activateStudent,
  listSkills, addSkill, deleteSkill,
  listPendingRecommendations, approveRecommendation, rejectRecommendation,
  listReports, resolveReport, getAuditLog,
};
