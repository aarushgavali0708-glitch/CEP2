import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
  Bell,
  Check,
  X,
  Mail,
  Send,
  Sparkles,
  Megaphone,
  CheckSquare,
  Award,
  ChevronRight,
  Inbox,
  Trash2,
  CheckCheck,
  Filter
} from 'lucide-react';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    respondToNotificationInvite,
  } = useSocket();

  const [filterType, setFilterType] = useState('all');

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'invitation':
      case 'invitation_accepted':
      case 'invitation_declined':
        return <Mail className="w-4 h-4 text-secondary" />;
      case 'application_received':
      case 'application_accepted':
      case 'application_rejected':
        return <Send className="w-4 h-4 text-secondary" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-secondary" />;
      case 'task_assigned':
        return <CheckSquare className="w-4 h-4 text-secondary" />;
      case 'badge':
        return <Award className="w-4 h-4 text-secondary" />;
      default:
        return <Sparkles className="w-4 h-4 text-secondary" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'unread') return !n.isRead;
    if (filterType === 'invitations') return n.type.startsWith('invitation');
    if (filterType === 'applications') return n.type.startsWith('application');
    if (filterType === 'announcements') return n.type === 'announcement';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2/10 text-secondary text-xs font-semibold border border-border/20">
              <Bell className="w-3.5 h-3.5 text-secondary" />
              <span>Notification Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory tracking-tight">
              Notifications & Activity
            </h1>
            <p className="text-xs sm:text-sm text-secondary">
              Stay updated on applications, team invitations, task assignments and project announcements.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold text-ivory glow-btn-primary flex items-center gap-1.5 shadow-lg"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-4">
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'invitations', label: 'Invitations' },
          { key: 'applications', label: 'Applications' },
          { key: 'announcements', label: 'Announcements' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === tab.key
                ? 'bg-surface-2 text-ivory shadow-md shadow-none'
                : 'bg-surface-2 text-secondary hover:text-ivory border border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-border text-center space-y-2">
            <Inbox className="w-8 h-8 text-secondary mx-auto" />
            <h3 className="text-sm font-semibold text-secondary">No notifications found</h3>
            <p className="text-xs text-secondary">
              There are no notifications matching your selected filter.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) markAsRead(n.id);
                if (n.link) navigate(n.link);
              }}
              className={`glass-card p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer hover:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !n.isRead
                  ? 'border-border/30 bg-surface-2/15'
                  : 'border-border bg-surface-2/40'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="p-2.5 rounded-xl bg-surface-2 border border-border flex-shrink-0 mt-0.5">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-sm text-ivory truncate">
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span className="px-2 py-0.2 rounded-full text-xs font-semibold bg-surface-2/20 text-secondary border border-border/30">
                        NEW
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-secondary leading-relaxed">
                    {n.message}
                  </p>

                  <span className="text-xs text-secondary block pt-0.5">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {/* Direct action buttons for invitations */}
                  {n.type === 'invitation' && n.invitation?.status === 'pending' && (
                    <div
                      className="flex items-center gap-2 pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          respondToNotificationInvite(n.invitation.id, 'accepted')
                        }
                        className="px-3 py-1 rounded-xl bg-surface-2 hover:bg-surface-2 text-ivory text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Check className="w-3 h-3" />
                        <span>Accept Invitation</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          respondToNotificationInvite(n.invitation.id, 'rejected')
                        }
                        className="px-3 py-1 rounded-xl border border-border text-secondary hover:text-secondary text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <X className="w-3 h-3" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Trailing actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(n.id);
                    }}
                    className="p-1.5 rounded-lg text-secondary hover:text-secondary hover:bg-surface-2/50 transition-colors"
                    title="Mark as read"
                    aria-label="Mark notification as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                {n.link && (
                  <ChevronRight className="w-4 h-4 text-secondary" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
