import React, { useState, useRef, useEffect } from 'react';
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
  Inbox
} from 'lucide-react';

export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    respondToNotificationInvite,
  } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'invitation':
      case 'invitation_accepted':
      case 'invitation_declined':
        return <Mail className="w-4 h-4 text-accent" />;
      case 'application_received':
      case 'application_accepted':
      case 'application_rejected':
        return <Send className="w-4 h-4 text-secondary" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-accent" />;
      case 'task_assigned':
        return <CheckSquare className="w-4 h-4 text-secondary" />;
      case 'badge':
        return <Award className="w-4 h-4 text-accent" />;
      default:
        return <Sparkles className="w-4 h-4 text-accent" />;
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const recentNotifications = notifications.slice(0, 6);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-secondary hover:text-ivory hover:bg-surface-2 transition-all outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-bg font-semibold text-xs flex items-center justify-center border-2 border-bg shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-card p-0 rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm text-ivory">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-surface-2 text-secondary font-semibold border border-border">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-secondary space-y-1.5">
                <Inbox className="w-7 h-7 text-secondary mx-auto" />
                <div>No notifications yet</div>
              </div>
            ) : (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition-colors cursor-pointer hover:bg-surface-2 ${
                    !n.isRead ? 'bg-surface-2/60' : ''
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-surface-2 border border-border flex-shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-semibold text-xs text-ivory truncate">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <span className="text-xs text-secondary block">
                        {new Date(n.createdAt).toLocaleTimeString([], {
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
                            className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-ivory text-xs font-semibold flex items-center gap-1 transition-all hover:border-accent/60"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              respondToNotificationInvite(n.invitation.id, 'rejected')
                            }
                            className="px-2.5 py-1 rounded-lg border border-border text-secondary hover:text-ivory text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <X className="w-3 h-3" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border text-center bg-surface">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-secondary hover:text-accent font-semibold inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
