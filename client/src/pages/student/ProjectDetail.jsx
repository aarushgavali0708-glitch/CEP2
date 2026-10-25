import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { triggerConfetti } from '../../lib/confetti';
import MatchScoreBadge from '../../components/matching/MatchScoreBadge';
import {
  Users,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Building2,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Info,
  Send,
  UserCheck,
  UserX,
  UserPlus,
  Mail,
  X,
  Inbox,
  Award,
  LayoutDashboard
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [project, setProject] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  // Tab for owner view: 'overview' | 'inbox' | 'suggestions'
  const [activeTab, setActiveTab] = useState('overview');

  // Application Modal state
  const [applyModalRole, setApplyModalRole] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);

  // User's own applications (to detect if already applied to a role)
  const [myApplications, setMyApplications] = useState([]);

  // Owner inbox applications
  const [projectApplications, setProjectApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Suggested candidates state
  const [selectedRoleForSuggestions, setSelectedRoleForSuggestions] = useState(null);
  const [suggestedCandidates, setSuggestedCandidates] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [invitingId, setInvitingId] = useState(null);

  const isOwner = project && user && project.ownerId === user.id;

  // Load project details
  const loadProject = async () => {
    try {
      const res = await api.getProject(id);
      if (res.project) {
        setProject(res.project);
        if (res.matchResult) {
          setMatchResult(res.matchResult);
          if (!selectedRole && res.matchResult.roleScores?.length > 0) {
            setSelectedRole(res.matchResult.roleScores[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  };

  // Load user's own applications
  const loadMyApplications = async () => {
    try {
      const res = await api.getMyApplications();
      if (res.applications) {
        setMyApplications(res.applications);
      }
    } catch (err) {
      console.error('Failed to load my applications:', err);
    }
  };

  // Load applications for project owner
  const loadProjectApplications = async () => {
    if (!id) return;
    setLoadingApps(true);
    try {
      const res = await api.getProjectApplications(id);
      if (res.applications) {
        setProjectApplications(res.applications);
      }
    } catch (err) {
      console.error('Failed to load project applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadProject(), loadMyApplications()]);
      setLoading(false);
    }
    init();
  }, [id]);

  // Load owner applications when tab changes to inbox or when owner loads
  useEffect(() => {
    if (isOwner) {
      loadProjectApplications();
    }
  }, [isOwner, id]);

  // Load suggestions when suggestion role is selected
  useEffect(() => {
    async function fetchSuggestions() {
      if (!selectedRoleForSuggestions) return;
      setLoadingSuggestions(true);
      try {
        const res = await api.getSuggestedStudents(selectedRoleForSuggestions);
        if (res.suggestions) {
          setSuggestedCandidates(res.suggestions);
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }
    fetchSuggestions();
  }, [selectedRoleForSuggestions]);

  // Initialize selected role for suggestions if open
  useEffect(() => {
    if (project?.roles?.length > 0 && !selectedRoleForSuggestions) {
      const openRole = project.roles.find((r) => r.filledSeats < r.seats);
      if (openRole) {
        setSelectedRoleForSuggestions(openRole.id);
      } else {
        setSelectedRoleForSuggestions(project.roles[0].id);
      }
    }
  }, [project, selectedRoleForSuggestions]);

  // Handle Apply Submission
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyModalRole) return;

    setSubmittingApply(true);
    try {
      await api.applyToRole(applyModalRole.id, applyMessage);
      addToast(
        `Application for "${applyModalRole.title}" submitted successfully!`,
        'success'
      );
      setApplyModalRole(null);
      setApplyMessage('');
      await Promise.all([loadProject(), loadMyApplications()]);
    } catch (err) {
      addToast(err.message || 'Failed to submit application', 'error');
    } finally {
      setSubmittingApply(false);
    }
  };

  // Handle Withdraw Application
  const handleWithdraw = async (applicationId) => {
    if (!window.confirm('Are you sure you want to withdraw your application?')) return;
    try {
      await api.withdrawApplication(applicationId);
      addToast('Application withdrawn successfully', 'info');
      await Promise.all([loadProject(), loadMyApplications()]);
    } catch (err) {
      addToast(err.message || 'Failed to withdraw application', 'error');
    }
  };

  // Handle Owner Application Decision (Accept/Reject)
  const handleApplicationDecision = async (applicationId, status) => {
    setActionInProgress(applicationId);
    try {
      await api.updateApplicationStatus(applicationId, status);
      if (status === 'accepted') {
        triggerConfetti();
        addToast('Applicant accepted! Team member added.', 'success');
      } else {
        addToast('Application marked as not selected.', 'info');
      }
      await Promise.all([loadProject(), loadProjectApplications()]);
    } catch (err) {
      addToast(err.message || 'Failed to update application', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Invite Candidate
  const handleInviteCandidate = async (candidateId) => {
    if (!selectedRoleForSuggestions) return;
    setInvitingId(candidateId);
    try {
      await api.sendInvitation({
        roleId: selectedRoleForSuggestions,
        recipientId: candidateId,
        message: `I'd love for you to join "${project.title}"! Your skills are a great match for our open role.`,
      });
      addToast('Invitation sent successfully!', 'success');
      // Update local state to show invited
      setSuggestedCandidates((prev) =>
        prev.map((c) =>
          c.student.id === candidateId
            ? { ...c, invitation: { status: 'pending' } }
            : c
        )
      );
    } catch (err) {
      addToast(err.message || 'Failed to send invitation', 'error');
    } finally {
      setInvitingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="text-2xl font-heading font-semibold text-ivory">Project Not Found</h2>
        <p className="text-xs text-secondary">
          This project may have been removed or belongs to a different university.
        </p>
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-ivory glow-btn-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover Projects</span>
        </Link>
      </div>
    );
  }

  const roles = project.roles || [];
  const openRoles = roles.filter((r) => r.filledSeats < r.seats);
  const members = project.members || [];
  const canOpenWorkspace = isOwner || members.some((member) => member.userId === user?.id || member.user?.id === user?.id);
  const pendingAppsCount = projectApplications.filter((a) => a.status === 'pending').length;

  // Team Gap Analysis Data for Radar Chart
  const skillsMap = {};
  roles.forEach((r) => {
    r.roleSkills?.forEach((rs) => {
      const name = rs.skill?.name;
      if (name) {
        skillsMap[name] = (skillsMap[name] || 0) + 1;
      }
    });
  });

  const radarData = Object.keys(skillsMap).slice(0, 6).map((skillName) => {
    const userSkill = user?.studentProfile?.userSkills?.find(
      (us) => us.skill?.name?.toLowerCase() === skillName.toLowerCase()
    );
    const userLevel = userSkill
      ? userSkill.level === 'Advanced' ? 100 : userSkill.level === 'Intermediate' ? 66 : 33
      : 0;

    return {
      skill: skillName,
      needed: 80,
      studentFit: userLevel,
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discover Projects</span>
        </Link>
      </div>

      {/* ── PROJECT HEADER ───────────────────────────────── */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-surface-2/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-surface-2/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-lg bg-surface-2/15 border border-border/30 text-xs font-semibold text-secondary">
                {project.domain}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  project.status === 'active'
                    ? 'bg-surface-2/15 text-secondary border border-border/30'
                    : 'bg-surface-2/15 text-secondary border border-border/30'
                }`}
              >
                {project.status === 'pending' ? 'Pending Approval' : project.status}
              </span>
              {project.duration && (
                <span className="text-xs text-secondary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-secondary" />
                  <span>{project.duration}</span>
                </span>
              )}
              {isOwner && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-2/15 text-secondary border border-border/30 font-semibold">
                  You are the Project Lead
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-2xl font-heading font-semibold text-ivory tracking-tight">
              {project.title}
            </h1>

            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              {project.description}
            </p>

            {/* Owner info */}
            <div className="flex items-center gap-2.5 pt-2 text-xs text-secondary">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent to-accent flex items-center justify-center font-semibold text-xs text-ivory">
                {project.owner?.fullName?.charAt(0) || 'O'}
              </div>
              <span className="text-secondary font-medium">Project Lead: {project.owner?.fullName}</span>
              <span>•</span>
              <span>{members.length} member(s) joined</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {canOpenWorkspace && (
              <Link to={`/projects/${project.id}/workspace`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-ivory glow-btn-primary">
                <LayoutDashboard className="w-4 h-4" />Workspace
              </Link>
            )}
            {matchResult && !isOwner && (
              <div className="glass-panel p-4 rounded-2xl border border-border flex flex-col items-center">
                <span className="text-xs uppercase font-semibold tracking-wider text-secondary mb-2">Your Overall Fit</span>
                <MatchScoreBadge score={matchResult.bestScore} size="lg" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── OWNER NAVIGATION TABS ────────────────────────── */}
      {isOwner && (
        <div className="flex border-b border-border gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs sm:text-sm font-heading font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === 'overview' ? 'text-ivory' : 'text-secondary hover:text-secondary'
            }`}
          >
            <span>Project Overview</span>
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`pb-3 text-xs sm:text-sm font-heading font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === 'inbox' ? 'text-ivory' : 'text-secondary hover:text-secondary'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-secondary" />
              <span>Applications Inbox</span>
            </div>
            {pendingAppsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-2 text-secondary font-semibold">
                {pendingAppsCount}
              </span>
            )}
            {activeTab === 'inbox' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suggestions')}
            className={`pb-3 text-xs sm:text-sm font-heading font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === 'suggestions' ? 'text-ivory' : 'text-secondary hover:text-secondary'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span>Suggested Candidates</span>
            </div>
            {activeTab === 'suggestions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent" />
            )}
          </button>
        </div>
      )}

      {/* ── TAB 1: OVERVIEW ──────────────────────────────── */}
      {(!isOwner || activeTab === 'overview') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Goals, Milestones, Team Gap Analysis */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Goals */}
            {project.goals && (
              <div className="glass-card p-6 rounded-2xl border border-border space-y-3">
                <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span>Project Goals & Objectives</span>
                </h3>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  {project.goals}
                </p>
              </div>
            )}

            {/* Team Members */}
            {members.length > 0 && (
              <div className="glass-card p-6 rounded-2xl border border-border space-y-4">
                <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  <span>Team Members ({members.length})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-surface-2/60 border border-border flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-surface-2/15 border border-border/30 flex items-center justify-center font-semibold text-sm text-secondary">
                        {m.user?.fullName?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-ivory">{m.user?.fullName}</div>
                        <div className="text-xs text-secondary">
                          {m.role?.title || (m.userId === project.ownerId ? 'Project Owner' : 'Contributor')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Roles & Interactive Match Breakdown */}
            <div className="glass-card p-6 rounded-2xl border border-border space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  <span>Available Roles & Skills Required</span>
                </h3>
                <span className="text-xs font-mono text-secondary">
                  {openRoles.length} role(s) open
                </span>
              </div>

              {/* Role Cards List */}
              <div className="space-y-4">
                {roles.map((r) => {
                  const isOpen = r.filledSeats < r.seats;
                  const roleScoreObj = matchResult?.roleScores?.find((rs) => rs.role.id === r.id);
                  const isSelected = selectedRole?.role?.id === r.id;

                  // Check if current user has an application for this role
                  const userApp = myApplications.find((a) => a.roleId === r.id);

                  return (
                    <div
                      key={r.id}
                      onClick={() => roleScoreObj && setSelectedRole(roleScoreObj)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-surface-2/40 border-border/50 shadow-lg '
                          : 'bg-surface-2/60 border-border hover:border-border'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading font-semibold text-sm text-ivory">
                              {r.title}
                            </h4>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                isOpen
                                  ? 'bg-surface-2/15 text-secondary border border-border/30'
                                  : 'bg-surface-2 text-secondary'
                              }`}
                            >
                              {isOpen ? `${r.seats - r.filledSeats} seat(s) open` : 'Filled'}
                            </span>
                          </div>
                          <span className="text-xs text-secondary">
                            Expected commitment: {r.hoursPerWeek} hrs / week
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {roleScoreObj && !isOwner && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-secondary">Fit:</span>
                              <span
                                className={`font-heading font-semibold text-sm ${
                                  roleScoreObj.score >= 75
                                    ? 'text-secondary'
                                    : roleScoreObj.score >= 50
                                    ? 'text-secondary'
                                    : 'text-secondary'
                                }`}
                              >
                                {roleScoreObj.score}%
                              </span>
                            </div>
                          )}

                          {/* Role Action Button */}
                          {isOwner ? (
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-surface-2 text-secondary border border-border">
                              Owner
                            </span>
                          ) : userApp?.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-surface-2/15 text-secondary border border-border/30">
                                Applied (Pending)
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWithdraw(userApp.id);
                                }}
                                className="text-xs text-secondary hover:text-secondary transition-colors"
                              >
                                Withdraw
                              </button>
                            </div>
                          ) : userApp?.status === 'accepted' ? (
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-surface-2/15 text-secondary border border-border/30">
                              🎉 Joined Team
                            </span>
                          ) : !isOpen ? (
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-surface-2 text-secondary">
                              Role Filled
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setApplyModalRole(r);
                              }}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-ivory glow-btn-primary shadow-sm hover:brightness-110 active:scale-95 transition-all"
                            >
                              Apply to Role
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Required Skills chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {r.roleSkills?.map((rs) => (
                          <span
                            key={rs.id}
                            className="px-2 py-0.5 rounded-md bg-surface-2 border border-border text-xs text-secondary flex items-center gap-1"
                          >
                            <span>{rs.skill?.name}</span>
                            <span className="text-xs text-secondary">({rs.requiredLevel})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Gap Analysis Radar Chart */}
            {radarData.length > 2 && (
              <div className="glass-card p-6 rounded-2xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    <span>Team Skill Fit & Gap Analysis</span>
                  </h3>
                  <span className="text-xs text-secondary">Your Fit vs Project Need</span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="skill" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--color-border)" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                      <Radar
                        name="Project Level Needed"
                        dataKey="needed"
                        stroke="var(--color-accent)"
                        fill="var(--color-accent)"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="Your Skill Level"
                        dataKey="studentFit"
                        stroke="var(--color-text-secondary)"
                        fill="var(--color-text-secondary)"
                        fillOpacity={0.4}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: 'var(--color-text)',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Selected Role Explanation & "Close the Gap" */}
          <div className="space-y-6">
            {selectedRole ? (
              <div className="glass-card p-6 rounded-2xl border border-border/20 space-y-5 sticky top-20 shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs uppercase font-semibold tracking-wider text-secondary">
                      Role Match Breakdown
                    </span>
                    {!isOwner && (
                      <span className="font-heading font-semibold text-lg text-secondary">
                        {selectedRole.score}%
                      </span>
                    )}
                  </div>
                  <h4 className="font-heading font-semibold text-base text-ivory">
                    {selectedRole.role?.title}
                  </h4>
                </div>

                {/* 4-Factor Breakdown Bars */}
                {!isOwner && (
                  <div className="space-y-2.5 pt-2 border-t border-border">
                    {[
                      { label: 'Skill Coverage (60%)', value: selectedRole.breakdown?.skill },
                      { label: 'Domain Interest (15%)', value: selectedRole.breakdown?.interest },
                      { label: 'Credibility (15%)', value: selectedRole.breakdown?.credibility },
                      { label: 'Availability Fit (10%)', value: selectedRole.breakdown?.availability },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-secondary">{item.label}</span>
                          <span className="text-secondary font-medium">{item.value}%</span>
                        </div>
                        <div className="w-full bg-surface-2 rounded-full h-1.5 border border-border">
                          <div
                            className="h-full bg-gradient-to-r from-accent to-accent rounded-full"
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* "Why You Match" */}
                {!isOwner && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Why you match</span>
                    </div>
                    {selectedRole.explanation?.matched?.length > 0 ? (
                      <ul className="text-xs text-secondary space-y-1 pl-4 list-disc">
                        {selectedRole.explanation.matched.map((s, idx) => (
                          <li key={idx}>Direct skill match: <strong className="text-ivory">{s}</strong></li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-secondary">No exact skill matches yet.</p>
                    )}

                    {/* Similar / partial matches */}
                    {selectedRole.explanation?.partial?.length > 0 && (
                      <div className="pt-1">
                        <span className="text-xs text-secondary">Related skills detected:</span>
                        <ul className="text-xs text-secondary space-y-1 pl-4 list-disc pt-0.5">
                          {selectedRole.explanation.partial.map((p, idx) => (
                            <li key={idx}>
                              {p.have ? `${p.have} relates to ${p.required}` : p.required}
                              {p.levelGap && ` (${p.levelGap})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* "Skills You're Missing" & Free Learning Resources */}
                {!isOwner && (
                  <div className="pt-2 border-t border-border space-y-3">
                    <div className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>Close the Gap (Free Learning)</span>
                    </div>

                    {selectedRole.missingWithResources?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedRole.missingWithResources.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-surface-2 border border-border space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-ivory">{item.skill}</span>
                              <span className="text-xs text-secondary">Recommended</span>
                            </div>
                            <div className="space-y-1">
                              {item.resources?.map((res, ridx) => (
                                <a
                                  key={ridx}
                                  href={res.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between text-xs text-secondary hover:text-secondary hover:underline py-0.5"
                                >
                                  <span className="truncate">{res.title}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-secondary">
                        You have all required skills for this role!
                      </p>
                    )}
                  </div>
                )}

                {/* Action Button */}
                {!isOwner && (
                  <button
                    type="button"
                    onClick={() => setApplyModalRole(selectedRole.role)}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-ivory glow-btn-primary shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <span>Apply for {selectedRole.role?.title}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="glass-card p-6 rounded-2xl border border-border text-center text-xs text-secondary">
                Select any role on the left to inspect your detailed match fit and learning recommendations.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: OWNER'S APPLICATIONS INBOX ────────────── */}
      {isOwner && activeTab === 'inbox' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-heading font-semibold text-ivory flex items-center gap-2">
                <Inbox className="w-5 h-5 text-secondary" />
                <span>Applications Inbox</span>
              </h3>
              <p className="text-xs text-secondary">
                Review student applicants ranked by their algorithmic match score. Accept candidates to fill roles.
              </p>
            </div>
            <span className="text-xs text-secondary">
              Total Applicants: <strong className="text-ivory">{projectApplications.length}</strong>
            </span>
          </div>

          {loadingApps ? (
            <div className="p-12 text-center text-xs text-secondary">Loading applications...</div>
          ) : projectApplications.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl border border-border text-center space-y-3">
              <Inbox className="w-8 h-8 text-secondary mx-auto" />
              <h4 className="text-base font-heading font-semibold text-ivory">No Applications Received Yet</h4>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                Students will discover your project and submit role applications. You can also proactively invite suggested candidates!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('suggestions')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-ivory glow-btn-primary"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>View Suggested Students</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {projectApplications.map((app) => {
                const match = app.matchResult || {};
                const score = Math.round(app.matchScore || match.score || 0);

                return (
                  <div
                    key={app.id}
                    className="glass-card p-6 rounded-2xl border border-border space-y-4 hover:border-border transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border">
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-accent to-accent p-[2px] flex-shrink-0">
                          <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center font-semibold text-ivory">
                            {app.student?.fullName?.charAt(0) || 'S'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${app.student?.id}`}
                              className="font-heading font-semibold text-sm text-ivory hover:text-secondary transition-colors"
                            >
                              {app.student?.fullName}
                            </Link>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-secondary">
                              {app.student?.studentProfile?.department || 'Student'}
                            </span>
                          </div>
                          <span className="text-xs text-secondary">
                            Applying for: <strong className="text-secondary">{app.role?.title}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Match Badge & Status */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-secondary">Match:</span>
                          <span
                            className={`font-heading font-semibold text-base px-2.5 py-0.5 rounded-lg border ${
                              score >= 75
                                ? 'bg-surface-2/15 text-secondary border-border/30'
                                : score >= 50
                                ? 'bg-surface-2/15 text-secondary border-border/30'
                                : 'bg-surface-2/15 text-secondary border-border/30'
                            }`}
                          >
                            {score}%
                          </span>
                        </div>

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
                          {app.status === 'pending' ? 'Pending Review' : app.status}
                        </span>
                      </div>
                    </div>

                    {/* Applicant's Message */}
                    {app.message && (
                      <div className="p-3 rounded-xl bg-surface-2/60 border border-border text-xs text-secondary">
                        <span className="text-secondary font-medium">Message: </span>
                        "{app.message}"
                      </div>
                    )}

                    {/* Match Explanation breakdown: Matched, Partial, Missing */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Matched Skills */}
                      <div className="p-3 rounded-xl bg-surface-2/5 border border-border/20 space-y-1">
                        <div className="font-semibold text-secondary flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Matched Skills</span>
                        </div>
                        <div className="text-secondary">
                          {match.explanation?.matched?.length > 0 ? (
                            match.explanation.matched.join(', ')
                          ) : (
                            <span className="text-secondary">None</span>
                          )}
                        </div>
                      </div>

                      {/* Related / Partial Skills */}
                      <div className="p-3 rounded-xl bg-surface-2/5 border border-border/20 space-y-1">
                        <div className="font-semibold text-secondary flex items-center gap-1 text-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Partial / Related Skills</span>
                        </div>
                        <div className="text-secondary">
                          {match.explanation?.partial?.length > 0 ? (
                            match.explanation.partial.map((p) => p.have || p.required).join(', ')
                          ) : (
                            <span className="text-secondary">None</span>
                          )}
                        </div>
                      </div>

                      {/* Missing Skills */}
                      <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                        <div className="font-semibold text-secondary flex items-center gap-1 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-secondary" />
                          <span>Skills Missing</span>
                        </div>
                        <div className="text-secondary">
                          {match.explanation?.missing?.length > 0 ? (
                            match.explanation.missing.join(', ')
                          ) : (
                            <span className="text-secondary">All skills covered!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Accept / Reject */}
                    {app.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          disabled={actionInProgress === app.id}
                          onClick={() => handleApplicationDecision(app.id, 'rejected')}
                          className="px-3.5 py-1.5 rounded-xl border border-border/30 text-secondary hover:bg-surface-2/10 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          disabled={actionInProgress === app.id}
                          onClick={() => handleApplicationDecision(app.id, 'accepted')}
                          className="px-4 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-2 text-ivory text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-none transition-all disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Accept to Team</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SUGGESTED CANDIDATES ──────────────────── */}
      {isOwner && activeTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-heading font-semibold text-ivory flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span>Suggested Students by Role</span>
              </h3>
              <p className="text-xs text-secondary">
                Top students in your institution evaluated by skill coverage, availability and interests.
              </p>
            </div>

            {/* Role selector filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary">Target Role:</span>
              <select
                value={selectedRoleForSuggestions || ''}
                onChange={(e) => setSelectedRoleForSuggestions(e.target.value)}
                className="bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-xs text-secondary outline-none"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.seats - r.filledSeats} open)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingSuggestions ? (
            <div className="p-12 text-center text-xs text-secondary">Finding best matching candidates...</div>
          ) : suggestedCandidates.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl border border-border text-center space-y-2">
              <Users className="w-8 h-8 text-secondary mx-auto" />
              <div className="text-sm font-semibold text-secondary">No candidate suggestions found</div>
              <p className="text-xs text-secondary">
                All qualified students from your institution may already be on the team or have active applications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedCandidates.map((cand) => {
                const score = Math.round(cand.score || 0);
                const hasInvite = cand.invitation && cand.invitation.status === 'pending';

                return (
                  <div
                    key={cand.student.id}
                    className="glass-card p-5 rounded-2xl border border-border space-y-3.5 hover:border-border transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-surface-2/15 border border-border/30 flex items-center justify-center font-semibold text-sm text-secondary flex-shrink-0">
                            {cand.student.fullName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <Link
                              to={`/profile/${cand.student.id}`}
                              className="font-heading font-semibold text-sm text-ivory hover:text-secondary transition-colors"
                            >
                              {cand.student.fullName}
                            </Link>
                            <div className="text-xs text-secondary">
                              {cand.student.studentProfile?.department || 'Student'} • {cand.student.studentProfile?.weeklyHours || 10} hrs/wk
                            </div>
                          </div>
                        </div>

                        {/* Match pill */}
                        <span
                          className={`font-heading font-semibold text-xs px-2.5 py-1 rounded-lg border ${
                            score >= 75
                              ? 'bg-surface-2/15 text-secondary border-border/30'
                              : score >= 50
                              ? 'bg-surface-2/15 text-secondary border-border/30'
                              : 'bg-surface-2/15 text-secondary border-border/30'
                          }`}
                        >
                          {score}% Match
                        </span>
                      </div>

                      {/* Matching Skills */}
                      <div className="space-y-1">
                        <span className="text-xs text-secondary uppercase tracking-wider font-semibold">
                          Matching Skills:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {cand.explanation?.matched?.length > 0 ? (
                            cand.explanation.matched.map((sk, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-surface-2/10 text-secondary border border-border/20 text-xs"
                              >
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-secondary">Related background</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Invite Button */}
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <Link
                        to={`/profile/${cand.student.id}`}
                        className="text-xs text-secondary hover:text-secondary flex items-center gap-1 transition-colors"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      {hasInvite ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-surface-2/15 text-secondary border border-border/30">
                          Invitation Pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={invitingId === cand.student.id}
                          onClick={() => handleInviteCandidate(cand.student.id)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-ivory glow-btn-primary flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>{invitingId === cand.student.id ? 'Inviting...' : 'Invite to Role'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── APPLY TO ROLE MODAL ───────────────────────────── */}
      {applyModalRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full p-6 sm:p-8 rounded-2xl border border-border shadow-2xl space-y-6 relative">
            <button
              type="button"
              onClick={() => setApplyModalRole(null)}
              className="absolute top-5 right-5 text-secondary hover:text-ivory p-1"
              aria-label="Close application form"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2/10 text-secondary text-xs font-semibold mb-2 border border-border/20">
                <Send className="w-3 h-3 text-secondary" />
                <span>Submit Role Application</span>
              </div>
              <h3 className="text-xl font-heading font-semibold text-ivory">
                Apply for {applyModalRole.title}
              </h3>
              <p className="text-xs text-secondary mt-1">
                in <strong className="text-ivory">{project.title}</strong>
              </p>
            </div>

            {/* Match Score Preview in Modal */}
            {matchResult?.roleScores?.find((rs) => rs.role.id === applyModalRole.id) && (
              <div className="p-4 rounded-2xl bg-surface-2/80 border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-secondary">Your Calculated Fit</span>
                  <div className="text-xs text-secondary pt-0.5">
                    {matchResult.roleScores.find((rs) => rs.role.id === applyModalRole.id).score >= 75
                      ? '🌟 Strong technical & domain fit'
                      : '💡 Great learning & contribution opportunity'}
                  </div>
                </div>
                <MatchScoreBadge
                  score={matchResult.roleScores.find((rs) => rs.role.id === applyModalRole.id).score}
                  size="md"
                />
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  Message to Project Lead (Optional)
                </label>
                <textarea
                  rows={4}
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Share why you're interested, your availability, or relevant experience..."
                  className="w-full p-3.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs sm:text-sm text-ivory placeholder:text-secondary outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalRole(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-ivory glass-panel"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-ivory glow-btn-primary flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  {submittingApply ? (
                    <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
