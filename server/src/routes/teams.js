const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { getProjectAccess } = require('../lib/projectAccess');
const { workspaceActionDecision, memberRemovalEffects } = require('../services/workspacePolicy');

async function requireProjectMember(req, res, next) {
  try {
    const access = await getProjectAccess(req.params.projectId, req.user);
    if (access.status) return res.status(access.status).json({ error: access.error });
    if (!access.allowed) return res.status(403).json({ error: 'You are not allowed to access this project' });
    req.project = access.project;
    req.isProjectOwner = access.isOwner;
    next();
  } catch (err) {
    next(err);
  }
}

function requireProjectOwner(req, res, next) {
  const decision = workspaceActionDecision(req.project, req.isProjectOwner, 'announcements');
  if (!decision.allowed) return res.status(decision.status).json({ error: decision.error });
  next();
}

function requireProjectWritable(req, res, next) {
  const decision = workspaceActionDecision(req.project, req.isProjectOwner, 'write');
  if (!decision.allowed) return res.status(decision.status).json({ error: decision.error });
  next();
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validTaskStatus(status) {
  return status === undefined || ['todo', 'inprogress', 'done'].includes(status);
}

function validPriority(priority) {
  return priority === undefined || ['low', 'medium', 'high'].includes(priority);
}

async function notifyTaskAssignee(req, task, assigneeId) {
  if (!assigneeId || assigneeId === req.user.id) return;
  await prisma.notification.create({
    data: {
      userId: assigneeId,
      type: 'task_assigned',
      title: '📋 New Task Assigned',
      message: `${req.user.fullName} assigned you to "${task.title}" in "${req.project.title}".`,
      link: `/projects/${req.project.id}/workspace`,
    },
  });
  req.app.get('io')?.to(`user:${assigneeId}`).emit('notification', {
    type: 'task_assigned',
    message: `You were assigned "${task.title}" by ${req.user.fullName}`,
  });
}

router.use('/:projectId', authenticate, requireProjectMember);

// Workspace overview: accepted members, their skills, project requirements, and progress data.
router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.project.id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            studentProfile: {
              select: {
                avatarUrl: true,
                department: true,
                userSkills: { include: { skill: { select: { name: true } } } },
              },
            },
          },
        },
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                studentProfile: {
                  select: {
                    avatarUrl: true,
                    department: true,
                    userSkills: { include: { skill: { select: { name: true } } } },
                  },
                },
              },
            },
            role: { select: { title: true } },
          },
        },
        roles: { include: { roleSkills: { include: { skill: { select: { name: true } } } } } },
        tasks: { include: { assignee: { select: { id: true, fullName: true } } } },
        milestones: true,
        announcements: { include: { author: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    const membersById = new Map(project.members.map((member) => [member.userId, member]));
    if (!membersById.has(project.ownerId)) {
      membersById.set(project.ownerId, { userId: project.ownerId, user: project.owner, role: null, isOwner: true });
    }
    const members = [...membersById.values()].map((member) => ({
      ...member,
      isOwner: member.userId === project.ownerId,
      roleTitle: member.userId === project.ownerId ? 'Owner' : member.role?.title || 'Member',
    }));
    res.json({ workspace: { ...project, members } });
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/messages', async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { projectId: req.project.id, type: 'team', isDeleted: false },
      include: { sender: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json({ messages: messages.reverse() });
  } catch (err) { next(err); }
});

router.post('/:projectId/messages', requireProjectWritable, async (req, res, next) => {
  try {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 1000) return res.status(400).json({ error: 'Message must be 1–1000 characters' });
    const Filter = require('bad-words');
    if (new Filter().isProfane(content)) return res.status(400).json({ error: 'Message contains inappropriate language' });
    const message = await prisma.message.create({
      data: { projectId: req.project.id, senderId: req.user.id, content, type: 'team' },
      include: { sender: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true } } } } },
    });
    req.app.get('io')?.to(`project:${req.project.id}`).emit('new_message', { message });
    res.status(201).json({ message });
  } catch (err) { next(err); }
});

router.post('/:projectId/tasks', requireProjectWritable, async (req, res, next) => {
  try {
    const { title, description, assigneeId, status, priority, dueDate } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) return res.status(400).json({ error: 'Task title is required and must be 160 characters or fewer' });
    if (description != null && (typeof description !== 'string' || description.length > 2000)) return res.status(400).json({ error: 'Description must be 2000 characters or fewer' });
    if (!validTaskStatus(status) || !validPriority(priority)) return res.status(400).json({ error: 'Invalid task status or priority' });
    const parsedDueDate = dueDate ? validDate(dueDate) : null;
    if (parsedDueDate === undefined) return res.status(400).json({ error: 'Invalid due date' });
    const normalizedAssigneeId = assigneeId || null;
    if (normalizedAssigneeId) {
      const assignee = await prisma.teamMember.findFirst({ where: { projectId: req.project.id, userId: normalizedAssigneeId, leftAt: null } });
      if (normalizedAssigneeId !== req.project.ownerId && !assignee) return res.status(400).json({ error: 'Assignee must be an accepted team member' });
    }
    const task = await prisma.task.create({
      data: { projectId: req.project.id, createdById: req.user.id, title: title.trim(), description, assigneeId: normalizedAssigneeId, status: status || 'todo', priority: priority || 'medium', dueDate: parsedDueDate },
      include: { assignee: { select: { id: true, fullName: true } }, creator: { select: { id: true, fullName: true } } },
    });
    await notifyTaskAssignee(req, task, normalizedAssigneeId);
    req.app.get('io')?.to(`project:${req.project.id}`).emit('task_updated', { task });
    res.status(201).json({ task });
  } catch (err) { next(err); }
});

router.patch('/:projectId/tasks/:taskId', requireProjectWritable, async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.taskId, projectId: req.project.id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const { status, title, description, assigneeId, priority, dueDate } = req.body;
    if (!validTaskStatus(status) || !validPriority(priority)) return res.status(400).json({ error: 'Invalid task status or priority' });
    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 160)) return res.status(400).json({ error: 'Task title is required and must be 160 characters or fewer' });
    if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 2000)) return res.status(400).json({ error: 'Description must be 2000 characters or fewer' });
    const hasAssignee = Object.hasOwn(req.body, 'assigneeId');
    const normalizedAssigneeId = hasAssignee ? (assigneeId || null) : existing.assigneeId;
    if (hasAssignee && normalizedAssigneeId) {
      const assignee = await prisma.teamMember.findFirst({ where: { projectId: req.project.id, userId: normalizedAssigneeId, leftAt: null } });
      if (normalizedAssigneeId !== req.project.ownerId && !assignee) return res.status(400).json({ error: 'Assignee must be an accepted team member' });
    }
    const parsedDueDate = dueDate === undefined ? undefined : dueDate ? validDate(dueDate) : null;
    if (dueDate && parsedDueDate === undefined) return res.status(400).json({ error: 'Invalid due date' });
    const task = await prisma.task.update({ where: { id: existing.id }, data: { status, title: title?.trim(), description, assigneeId: hasAssignee ? normalizedAssigneeId : undefined, priority, dueDate: parsedDueDate }, include: { assignee: { select: { id: true, fullName: true } }, creator: { select: { id: true, fullName: true } } } });
    if (hasAssignee && normalizedAssigneeId !== existing.assigneeId) await notifyTaskAssignee(req, task, normalizedAssigneeId);
    req.app.get('io')?.to(`project:${req.project.id}`).emit('task_updated', { task });
    res.json({ task });
  } catch (err) { next(err); }
});

router.delete('/:projectId/tasks/:taskId', requireProjectWritable, async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.taskId, projectId: req.project.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!req.isProjectOwner && task.createdById !== req.user.id) return res.status(403).json({ error: 'Only the task creator or project owner can delete this task' });
    await prisma.task.delete({ where: { id: task.id } });
    req.app.get('io')?.to(`project:${req.project.id}`).emit('task_deleted', { taskId: task.id });
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

router.post('/:projectId/milestones', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    const { title, description, dueDate } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) return res.status(400).json({ error: 'Milestone title is required and must be 160 characters or fewer' });
    if (description != null && (typeof description !== 'string' || description.length > 2000)) return res.status(400).json({ error: 'Description must be 2000 characters or fewer' });
    const parsedDueDate = dueDate ? validDate(dueDate) : null;
    if (parsedDueDate === undefined) return res.status(400).json({ error: 'Invalid due date' });
    const milestone = await prisma.milestone.create({ data: { projectId: req.project.id, title: title.trim(), description, dueDate: parsedDueDate } });
    res.status(201).json({ milestone });
  } catch (err) { next(err); }
});

router.patch('/:projectId/milestones/:milestoneId', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    const existing = await prisma.milestone.findFirst({ where: { id: req.params.milestoneId, projectId: req.project.id } });
    if (!existing) return res.status(404).json({ error: 'Milestone not found' });
    const { completed, progress, title, description, dueDate } = req.body;
    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 160)) return res.status(400).json({ error: 'Milestone title is required and must be 160 characters or fewer' });
    if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 2000)) return res.status(400).json({ error: 'Description must be 2000 characters or fewer' });
    if (completed !== undefined && typeof completed !== 'boolean') return res.status(400).json({ error: 'Completed must be true or false' });
    if (progress !== undefined && (!Number.isInteger(progress) || progress < 0 || progress > 100)) return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    const parsedDueDate = dueDate === undefined ? undefined : dueDate ? validDate(dueDate) : null;
    if (dueDate && parsedDueDate === undefined) return res.status(400).json({ error: 'Invalid due date' });
    const milestone = await prisma.milestone.update({ where: { id: existing.id }, data: { completed, completedAt: completed === undefined ? undefined : completed ? new Date() : null, progress, title: title?.trim(), description, dueDate: parsedDueDate } });
    res.json({ milestone });
  } catch (err) { next(err); }
});

router.delete('/:projectId/milestones/:milestoneId', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    const milestone = await prisma.milestone.findFirst({ where: { id: req.params.milestoneId, projectId: req.project.id } });
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    await prisma.milestone.delete({ where: { id: milestone.id } });
    res.json({ message: 'Milestone deleted' });
  } catch (err) { next(err); }
});

router.post('/:projectId/announcements', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    const { title, content, isPinned } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) return res.status(400).json({ error: 'Title is required and must be 160 characters or fewer' });
    if (typeof content !== 'string' || !content.trim() || content.trim().length > 5000) return res.status(400).json({ error: 'Message is required and must be 5000 characters or fewer' });
    if (isPinned !== undefined && typeof isPinned !== 'boolean') return res.status(400).json({ error: 'isPinned must be true or false' });
    const announcement = await prisma.announcement.create({
      data: { projectId: req.project.id, authorId: req.user.id, title: title.trim(), content: content.trim(), isPinned: Boolean(isPinned) },
      include: { author: { select: { id: true, fullName: true } } },
    });
    const io = req.app.get('io');
    io?.to(`project:${req.project.id}`).emit('announcement', { announcement });
    const members = await prisma.teamMember.findMany({ where: { projectId: req.project.id, leftAt: null }, select: { userId: true } });
    const memberIds = new Set([req.project.ownerId, ...members.map(({ userId }) => userId)]);
    for (const userId of memberIds) {
      if (userId === req.user.id) continue;
      await prisma.notification.create({ data: { userId, type: 'announcement', title: `📢 New Announcement in "${req.project.title}"`, message: `${req.user.fullName}: "${announcement.title}"`, link: `/projects/${req.project.id}/workspace` } });
      io?.to(`user:${userId}`).emit('notification', { type: 'announcement', message: `New announcement: ${announcement.title}` });
    }
    res.status(201).json({ announcement });
  } catch (err) { next(err); }
});

router.get('/:projectId/announcements', async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { projectId: req.project.id },
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ announcements });
  } catch (err) { next(err); }
});

router.patch('/:projectId/announcements/:announcementId', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    const existing = await prisma.announcement.findFirst({ where: { id: req.params.announcementId, projectId: req.project.id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });
    const { title, content, isPinned } = req.body;
    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 160)) return res.status(400).json({ error: 'Title is required and must be 160 characters or fewer' });
    if (content !== undefined && (typeof content !== 'string' || !content.trim() || content.trim().length > 5000)) return res.status(400).json({ error: 'Message is required and must be 5000 characters or fewer' });
    if (isPinned !== undefined && typeof isPinned !== 'boolean') return res.status(400).json({ error: 'isPinned must be true or false' });
    const announcement = await prisma.announcement.update({
      where: { id: existing.id },
      data: { title: title?.trim(), content: content?.trim(), isPinned },
      include: { author: { select: { id: true, fullName: true } } },
    });
    req.app.get('io')?.to(`project:${req.project.id}`).emit('announcement_updated', { announcement });
    res.json({ announcement });
  } catch (err) { next(err); }
});

router.delete('/:projectId/announcements/:announcementId', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.findFirst({ where: { id: req.params.announcementId, projectId: req.project.id } });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    await prisma.announcement.delete({ where: { id: announcement.id } });
    req.app.get('io')?.to(`project:${req.project.id}`).emit('announcement_deleted', { announcementId: announcement.id });
    res.json({ message: 'Announcement deleted' });
  } catch (err) { next(err); }
});

router.post('/:projectId/reviews', requireProjectWritable, async (req, res, next) => {
  try {
    const { revieweeId, ratingReliability, ratingCommunication, ratingSkill, comment } = req.body;
    if (!revieweeId || revieweeId === req.user.id) return res.status(400).json({ error: 'Choose another team member to review' });
    const reviewee = await prisma.teamMember.findFirst({ where: { projectId: req.project.id, userId: revieweeId, leftAt: null } });
    if (revieweeId !== req.project.ownerId && !reviewee) return res.status(400).json({ error: 'Review target must be a team member' });
    const ratings = [ratingReliability, ratingCommunication, ratingSkill];
    if (ratings.some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 5)) return res.status(400).json({ error: 'Ratings must be integers from 1 to 5' });
    const prior = await prisma.peerReview.findUnique({ where: { projectId_reviewerId_revieweeId: { projectId: req.project.id, reviewerId: req.user.id, revieweeId } } });
    const review = await prisma.peerReview.upsert({
      where: { projectId_reviewerId_revieweeId: { projectId: req.project.id, reviewerId: req.user.id, revieweeId } },
      update: { ratingReliability, ratingCommunication, ratingSkill, comment },
      create: { projectId: req.project.id, reviewerId: req.user.id, revieweeId, ratingReliability, ratingCommunication, ratingSkill, comment },
    });
    if (!prior) await prisma.studentProfile.update({ where: { userId: revieweeId }, data: { xp: { increment: 25 } } });
    res.status(201).json({ review });
  } catch (err) { next(err); }
});

router.delete('/:projectId/members/:memberId', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const member = await prisma.teamMember.findFirst({ where: { projectId: req.project.id, userId: memberId, leftAt: null } });
    if (!member) return res.status(404).json({ error: 'Team member not found' });
    const removal = memberRemovalEffects(req.project, { ...member, userId: memberId });
    if (!removal.allowed) return res.status(400).json({ error: removal.error });
    await prisma.$transaction(async (tx) => {
      if (removal.restoreRoleSeat) await tx.projectRole.updateMany({ where: { id: member.roleId, projectId: req.project.id, filledSeats: { gt: 0 } }, data: { filledSeats: { decrement: 1 } } });
      await tx.task.updateMany({ where: { projectId: req.project.id, assigneeId: memberId }, data: { assigneeId: null } });
      await tx.teamMember.delete({ where: { id: member.id } });
      await tx.notification.create({ data: { userId: memberId, type: 'team_member_removed', title: 'Removed from project team', message: `You were removed from "${req.project.title}".`, link: `/projects/${req.project.id}` } });
    });
    const io = req.app.get('io');
    io?.in(`user:${memberId}`).socketsLeave(`project:${req.project.id}`);
    io?.to(`user:${memberId}`).emit('project_access_revoked', { projectId: req.project.id });
    res.json({ message: 'Team member removed' });
  } catch (err) { next(err); }
});

router.patch('/:projectId/complete', requireProjectOwner, requireProjectWritable, async (req, res, next) => {
  try {
    if (req.project.status !== 'completed') {
      await prisma.project.update({ where: { id: req.project.id }, data: { status: 'completed' } });
      req.app.get('io')?.to(`project:${req.project.id}`).emit('project_completed', { projectId: req.project.id });
      const members = await prisma.teamMember.findMany({ where: { projectId: req.project.id, leftAt: null }, select: { userId: true } });
      const memberIds = [...new Set([req.project.ownerId, ...members.map((member) => member.userId)])];
      for (const userId of memberIds) {
        await prisma.studentProfile.updateMany({ where: { userId }, data: { xp: { increment: 200 } } });
        const completedCount = await prisma.teamMember.count({ where: { userId, project: { status: 'completed' } } });
        if (completedCount >= 3) {
          const badge = await prisma.badge.findUnique({ where: { name: 'Team Player' } });
          if (badge) await prisma.userBadge.upsert({ where: { userId_badgeId: { userId, badgeId: badge.id } }, update: {}, create: { userId, badgeId: badge.id } });
        }
        await prisma.notification.create({ data: { userId, type: 'project_completed', title: '🏆 Project Completed!', message: `"${req.project.title}" is marked as complete. Great work!`, link: `/projects/${req.project.id}/workspace` } });
        req.app.get('io')?.to(`user:${userId}`).emit('project_completed', { projectId: req.project.id });
      }
    }
    res.json({ message: 'Project completed' });
  } catch (err) { next(err); }
});

module.exports = router;
