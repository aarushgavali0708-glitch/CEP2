const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// Get invitations for current user
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: { recipientId: req.user.id },
      include: {
        role: {
          include: {
            project: { select: { id: true, title: true, domain: true, ownerId: true } },
          },
        },
        sender: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ invitations });
  } catch (err) {
    next(err);
  }
});

// Send invitation
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { roleId, recipientId, message } = req.body;

    const role = await prisma.projectRole.findUnique({
      where: { id: roleId },
      include: { project: true },
    });

    if (!role) return res.status(404).json({ error: 'Role not found' });

    if (role.project.institutionId !== req.user.institutionId) {
      return res.status(403).json({ error: 'Cannot invite students from another institution' });
    }

    if (role.project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only project owners can send invitations' });
    }

    if (role.filledSeats >= role.seats) {
      return res.status(400).json({ error: 'This role has no open seats left' });
    }

    const existingPending = await prisma.invitation.findFirst({
      where: { roleId, recipientId, status: 'pending' },
    });
    if (existingPending) {
      return res.status(400).json({ error: 'An invitation is already pending for this student' });
    }

    const invitation = await prisma.invitation.create({
      data: {
        roleId,
        recipientId,
        senderId: req.user.id,
        message: message || '',
        status: 'pending',
      },
    });

    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'invitation',
        title: '📨 Team Invitation',
        message: `${req.user.fullName} invited you to join "${role.project.title}" as ${role.title}`,
        link: `/projects/${role.projectId}?invitationId=${invitation.id}`,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('notification', {
        type: 'invitation',
        message: `Invitation from ${req.user.fullName} to join "${role.project.title}"`,
        invitationId: invitation.id,
      });
    }

    res.status(201).json({ invitation });
  } catch (err) {
    next(err);
  }
});

// Respond to invitation (accept or reject)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body; // accepted | rejected
    const inv = await prisma.invitation.findUnique({
      where: { id: req.params.id },
      include: {
        role: {
          include: { project: true },
        },
      },
    });

    if (!inv) return res.status(404).json({ error: 'Invitation not found' });
    if (inv.recipientId !== req.user.id) {
      return res.status(403).json({ error: 'Not your invitation' });
    }

    if (status === 'accepted') {
      if (inv.role.filledSeats >= inv.role.seats) {
        return res.status(400).json({ error: 'This role has already been filled' });
      }

      await prisma.teamMember.upsert({
        where: { projectId_userId: { projectId: inv.role.projectId, userId: req.user.id } },
        update: { roleId: inv.roleId },
        create: { projectId: inv.role.projectId, userId: req.user.id, roleId: inv.roleId },
      });

      await prisma.projectRole.update({
        where: { id: inv.roleId },
        data: { filledSeats: { increment: 1 } },
      });

      // Award XP
      await prisma.studentProfile.update({
        where: { userId: req.user.id },
        data: { xp: { increment: 100 } },
      });

      // Notify owner that student accepted
      await prisma.notification.create({
        data: {
          userId: inv.role.project.ownerId,
          type: 'invitation_accepted',
          title: '🎉 Invitation Accepted!',
          message: `${req.user.fullName} accepted your invitation for ${inv.role.title}!`,
          link: `/projects/${inv.role.projectId}`,
        },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${inv.role.project.ownerId}`).emit('notification', {
          type: 'invitation_accepted',
          message: `${req.user.fullName} accepted your invitation for ${inv.role.title}!`,
        });
      }
    } else if (status === 'rejected') {
      // Notify owner that student declined
      await prisma.notification.create({
        data: {
          userId: inv.role.project.ownerId,
          type: 'invitation_declined',
          title: 'Invitation Declined',
          message: `${req.user.fullName} declined your invitation for ${inv.role.title}.`,
          link: `/projects/${inv.role.projectId}`,
        },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${inv.role.project.ownerId}`).emit('notification', {
          type: 'invitation_declined',
          message: `${req.user.fullName} declined the invitation for ${inv.role.title}`,
        });
      }
    }

    const updated = await prisma.invitation.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ message: `Invitation ${status}`, invitation: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
