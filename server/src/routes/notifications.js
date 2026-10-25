const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// Get my notifications with unread count & invitation metadata
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    // Find pending invitations for this recipient to enable direct actions in notifications
    const pendingInvitations = await prisma.invitation.findMany({
      where: { recipientId: req.user.id, status: 'pending' },
      include: {
        role: {
          select: { id: true, title: true, projectId: true },
        },
        sender: {
          select: { id: true, fullName: true },
        },
      },
    });

    const pendingMap = new Map(pendingInvitations.map((inv) => [inv.id, inv]));

    const enriched = notifications.map((n) => {
      let invitation = null;
      if (n.type === 'invitation') {
        const match = n.link?.match(/invitationId=([^&]+)/);
        if (match && pendingMap.has(match[1])) {
          invitation = pendingMap.get(match[1]);
        } else if (pendingInvitations.length > 0) {
          // If only 1 pending invitation, match it
          invitation = pendingInvitations[0];
        }
      }
      return {
        ...n,
        invitation,
      };
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ notifications: enriched, unreadCount });
  } catch (err) {
    next(err);
  }
});

// Mark all as read
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (err) {
    next(err);
  }
});

// Mark one as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ message: 'Notification read', notification, unreadCount });
  } catch (err) {
    next(err);
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
