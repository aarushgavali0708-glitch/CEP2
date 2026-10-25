import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { triggerConfetti } from '../../lib/confetti';
import MatchScoreBadge from '../../components/matching/MatchScoreBadge';
import {
  FolderKanban,
  Users,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronRight,
  CheckCircle2,
  Clock4,
  Inbox,
  Send,
  XCircle,
  Check,
  X,
  Mail,
  LayoutDashboard
} from 'lucide-react';

export default function MyProjects() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('owned');
  const [ownedProjects, setOwnedProjects] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [respondingInviteId, setRespondingInviteId] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [projRes, appRes, invRes] = await Promise.all([
        api.getMyProjects().catch(() => ({ owned: [], joined: [] })),
        api.getMyApplications().catch(() => ({ applications: [] })),
        api.getMyInvitations().catch(() => ({ invitations: [] })),
      ]);

      if (projRes.owned) setOwnedProjects(projRes.owned);
      if (projRes.joined) setJoinedProjects(projRes.joined);
      if (appRes.applications) setApplications(appRes.applications);
      if (invRes.invitations) setInvitations(invRes.invitations);
    } catch (err) {
      console.error('Failed to load my projects/applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle Withdraw
  const handleWithdraw = async (applicationId) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    setWithdrawingId(applicationId);
    try {
      await api.withdrawApplication(applicationId);
      addToast('Application withdrawn successfully', 'info');
      await fetchAllData();
    } catch (err) {
      addToast(err.message || 'Failed to withdraw application', 'error');
    } finally {
      setWithdrawingId(null);
    }
  };

  // Handle Respond to Invitation
  const handleRespondInvitation = async (invitationId, status) => {
    setRespondingInviteId(invitationId);
    try {
      await api.respondToInvitation(invitationId, status);
      if (status === 'accepted') {
        triggerConfetti();
        addToast('Invitation accepted! You have joined the team.', 'success');
      } else {
        addToast('Invitation declined.', 'info');
      }
      await fetchAllData();
    } catch (err) {
      addToast(err.message || 'Failed to respond to invitation', 'error');
    } finally {
      setRespondingInviteId(null);
    }
  };

  const pendingApps = applications.filter((a) => a.status === 'pending');
  const pendingInvites = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2/10 text-secondary text-xs font-semibold border border-border/20">
              <FolderKanban className="w-3.5 h-3.5 text-secondary" />
              <span>Project Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory tracking-tight">
              My Projects & Teams
            </h1>
            <p className="text-xs sm:text-sm text-secondary">
              Track projects you lead, team workspaces you belong to, and pending role applications.
            </p>
          </div>

          <Link
            to="/projects/create"
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl font-heading font-semibold text-xs text-ivory glow-btn-primary shadow-lg flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </Link>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-border gap-8">
        <button
          type="button"
          onClick={() => setActiveTab('owned')}
          className={`pb-3 text-xs sm:text-sm font-heading font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'owned' ? 'text-ivory' : 'text-secondary hover:text-secondary'
          }`}
        >
          <span>Owned Projects</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-surface-2 text-secondary">
            {ownedProjects.length}
          </span>
          {activeTab === 'owned' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('joined')}
          className={`pb-3 text-xs sm:text-sm font-heading font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'joined' ? 'text-ivory' : 'text-secondary hover:text-secondary'
          }`}
        >
          <span>Joined Teams</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-surface-2 text-secondary">
            {joinedProjects.length}
          </span>
          {activeTab === 'joined' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`pb-3 text-xs sm:text-sm font-heading font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'applications' ? 'text-ivory' : 'text-secondary hover:text-secondary'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5 text-secondary" />
            <span>Pending Applications</span>
          </div>
          {(pendingApps.length > 0 || pendingInvites.length > 0) && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-surface-2 text-secondary font-semibold">
              {pendingApps.length + pendingInvites.length}
            </span>
          )}
          {activeTab === 'applications' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent" />
          )}
        </button>
      </div>

      {/* ── TAB 1: OWNED PROJECTS ─────────────────────────── */}
      {activeTab === 'owned' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="glass-card p-6 rounded-2xl border border-border h-28 animate-pulse" />
              ))}
            </div>
          ) : ownedProjects.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl border border-border text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-2/10 border border-border/20 flex items-center justify-center mx-auto text-secondary">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-base font-heading font-semibold text-ivory">No Owned Projects Yet</h3>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                Have a community project idea? Post it to recruit skilled teammates from your university!
              </p>
              <Link
                to="/projects/create"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-ivory glow-btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span>Post Your First Project</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {ownedProjects.map((p) => {
                const totalSeats = p.roles?.reduce((sum, r) => sum + r.seats, 0) || 0;
                const filledSeats = p.roles?.reduce((sum, r) => sum + r.filledSeats, 0) || 0;
                const openRoles = p.roles?.filter((r) => r.filledSeats < r.seats) || [];

                return (
                  <div
                    key={p.id}
                    className="glass-card p-6 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-border/30 transition-all"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-surface-2/15 border border-border/30 text-xs font-semibold text-secondary">
                          {p.domain}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.status === 'active'
                              ? 'bg-surface-2/15 text-secondary border border-border/30'
                              : p.status === 'pending'
                              ? 'bg-surface-2/15 text-secondary border border-border/30'
                              : 'bg-surface-2 text-secondary'
                          }`}
                        >
                          {p.status === 'pending' ? 'Pending Admin Approval' : p.status}
                        </span>
                        {p.duration && (
                          <span className="text-xs text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3 text-secondary" />
                            <span>{p.duration}</span>
                          </span>
                        )}
                      </div>

                      <Link to={`/projects/${p.id}`}>
                        <h3 className="font-heading font-semibold text-base text-ivory hover:text-secondary transition-colors">
                          {p.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-secondary line-clamp-1">
                        {p.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-secondary pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-secondary" />
                          <span>{p._count?.members || p.members?.length || 1} Team Member(s)</span>
                        </span>
                        <span>•</span>
                        <span>{openRoles.length} Open Role(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <Link
                        to={`/projects/${p.id}/workspace`}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-ivory glow-btn-primary flex items-center gap-1.5"
                      >
                        <LayoutDashboard className="w-4 h-4" />Workspace
                      </Link>
                      <Link
                        to={`/projects/${p.id}`}
                        className="px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-secondary hover:text-ivory flex items-center gap-1.5 transition-all"
                      >
                        <span>Manage / View</span>
                        <ChevronRight className="w-4 h-4 text-secondary" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: JOINED TEAMS ───────────────────────────── */}
      {activeTab === 'joined' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="glass-card p-6 rounded-2xl border border-border h-28 animate-pulse" />
              ))}
            </div>
          ) : joinedProjects.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl border border-border text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-2/10 border border-border/20 flex items-center justify-center mx-auto text-secondary">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-heading font-semibold text-ivory">No Joined Projects Yet</h3>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                You haven't joined any project teams yet. Discover open projects matching your skills and apply!
              </p>
              <Link
                to="/discover"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-ivory glow-btn-primary"
              >
                <span>Discover Open Roles</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {joinedProjects.map((p) => (
                <div
                  key={p.id}
                  className="glass-card p-6 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-surface-2/15 border border-border/30 text-xs font-semibold text-secondary">
                        {p.domain}
                      </span>
                      <span className="text-xs text-secondary font-medium">
                        Your Role: {p.myRole}
                      </span>
                    </div>

                    <Link to={`/projects/${p.id}`}>
                      <h3 className="font-heading font-semibold text-base text-ivory hover:text-secondary transition-colors">
                        {p.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-secondary line-clamp-1">{p.description}</p>
                  </div>

                  <Link
                    to={`/projects/${p.id}/workspace`}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-ivory glow-btn-primary flex items-center gap-1.5"
                  >
                    <LayoutDashboard className="w-4 h-4" /><span>Workspace</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: APPLICATIONS & INVITATIONS ─────────────── */}
      {activeTab === 'applications' && (
        <div className="space-y-8">
          {/* Section: Pending Invitations from Owners */}
          {invitations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>Team Invitations Received</span>
                </h3>
                <span className="text-xs text-secondary">
                  {pendingInvites.length} pending
                </span>
              </div>

              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="glass-card p-5 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-surface-2/10 text-secondary border border-border/20">
                          Invitation
                        </span>
                        <Link
                          to={`/projects/${inv.role?.project?.id}`}
                          className="font-heading font-semibold text-sm text-ivory hover:text-secondary transition-colors"
                        >
                          {inv.role?.project?.title}
                        </Link>
                      </div>

                      <div className="text-xs text-secondary">
                        Invited to join as <strong className="text-secondary">{inv.role?.title}</strong> by {inv.sender?.fullName}
                      </div>

                      {inv.message && (
                        <p className="text-xs text-secondary italic pt-0.5">
                          "{inv.message}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      {inv.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={respondingInviteId === inv.id}
                            onClick={() => handleRespondInvitation(inv.id, 'rejected')}
                            className="px-3 py-1.5 rounded-xl border border-border text-secondary hover:text-secondary text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>

                          <button
                            type="button"
                            disabled={respondingInviteId === inv.id}
                            onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                            className="px-4 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-2 text-ivory text-xs font-semibold flex items-center gap-1 shadow-md transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept & Join</span>
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            inv.status === 'accepted'
                              ? 'bg-surface-2/15 text-secondary border border-border/30'
                              : 'bg-surface-2 text-secondary'
                          }`}
                        >
                          {inv.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Applications Submitted */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
                <Send className="w-4 h-4 text-secondary" />
                <span>Your Role Applications</span>
              </h3>
              <span className="text-xs text-secondary">
                {applications.length} total
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="glass-card p-6 rounded-2xl border border-border h-24 animate-pulse" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl border border-border text-center space-y-3">
                <Inbox className="w-8 h-8 text-secondary mx-auto" />
                <h4 className="text-base font-heading font-semibold text-ivory">No Applications Submitted</h4>
                <p className="text-xs text-secondary max-w-sm mx-auto">
                  Browse open community projects matching your skill set and submit an application!
                </p>
                <Link
                  to="/discover"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-ivory glow-btn-primary"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Discover Projects</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const proj = app.role?.project;
                  const score = Math.round(app.matchScore || 0);

                  return (
                    <div
                      key={app.id}
                      className="glass-card p-5 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-border transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/projects/${proj?.id}`}
                            className="font-heading font-semibold text-sm text-ivory hover:text-secondary transition-colors"
                          >
                            {proj?.title || 'Project'}
                          </Link>
                          <span>•</span>
                          <span className="text-xs text-secondary font-semibold">
                            {app.role?.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-secondary flex-wrap">
                          <span>Project Lead: {proj?.owner?.fullName}</span>
                          <span>•</span>
                          <span>Submitted {new Date(app.createdAt).toLocaleDateString()}</span>
                          {score > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-secondary font-medium">Fit Score: {score}%</span>
                            </>
                          )}
                        </div>

                        {app.message && (
                          <p className="text-xs text-secondary italic">
                            "{app.message}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-start md:self-auto">
                        {/* Status Badge */}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            app.status === 'accepted'
                              ? 'bg-surface-2/15 text-secondary border border-border/30'
                              : app.status === 'rejected'
                              ? 'bg-surface-2/15 text-secondary border border-border/30'
                              : app.status === 'withdrawn'
                              ? 'bg-surface-2 text-secondary'
                              : 'bg-surface-2/15 text-secondary border border-border/30'
                          }`}
                        >
                          {app.status === 'pending'
                            ? 'Pending Review'
                            : app.status === 'accepted'
                            ? '🎉 Accepted!'
                            : app.status === 'withdrawn'
                            ? 'Withdrawn'
                            : 'Not Selected'}
                        </span>

                        {/* Actions */}
                        {app.status === 'pending' && (
                          <button
                            type="button"
                            disabled={withdrawingId === app.id}
                            onClick={() => handleWithdraw(app.id)}
                            className="text-xs text-secondary hover:text-secondary transition-colors"
                          >
                            {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw'}
                          </button>
                        )}

                        {app.status === 'accepted' && (
                          <Link
                            to={`/projects/${proj?.id}`}
                            className="px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-secondary hover:text-ivory flex items-center gap-1"
                          >
                            <span>Open Project</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
