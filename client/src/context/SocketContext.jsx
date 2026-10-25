import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { api } from '../lib/api';
import { triggerConfetti } from '../lib/confetti';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(
          typeof res.unreadCount === 'number'
            ? res.unreadCount
            : res.notifications.filter((n) => !n.isRead).length
        );
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Connect socket when user is logged in
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    fetchNotifications();

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
    });

    // Real-time notification handler
    newSocket.on('notification', (payload) => {
      addToast(payload.message || 'You have a new notification', 'info');
      if (payload.confetti) {
        triggerConfetti();
      }
      // Re-fetch notifications to keep dropdown in sync
      fetchNotifications();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  // Mark single notification read
  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  // Mark all notifications read
  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  // Respond to invitation directly from notification
  const respondToNotificationInvite = async (invitationId, status) => {
    try {
      await api.respondToInvitation(invitationId, status);
      if (status === 'accepted') {
        triggerConfetti();
        addToast('Invitation accepted! You have joined the team.', 'success');
      } else {
        addToast('Invitation declined.', 'info');
      }
      await fetchNotifications();
    } catch (err) {
      addToast(err.message || 'Failed to respond to invitation', 'error');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        respondToNotificationInvite,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
