import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  User,
  Building2,
  GraduationCap,
  Award,
  Zap,
  Clock,
  Github,
  Linkedin,
  Globe,
  CheckCircle2,
  Star,
  ShieldCheck,
  Calendar,
  Lock,
  Share2,
  Eye,
  Sliders,
  FolderGit2,
  FileText
} from 'lucide-react';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const targetId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === targetId;

  useEffect(() => {
    async function loadProfile() {
      if (!targetId) return;
      setLoading(false);
      try {
        const res = await api.getProfile(targetId);
        if (res.user) {
          setProfileData(res.user);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [targetId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-heading font-semibold text-ivory mb-2">Student Not Found</h2>
        <p className="text-xs text-secondary">This profile might be private or from another institution.</p>
      </div>
    );
  }

  const profile = profileData.studentProfile || {};
  const userSkills = profileData.userSkills || profile.userSkills || [];
  const badges = profileData.userBadges || [];
  const projects = profileData.teamMemberships || [];
  const peerReviews = profileData.peerReviews || [];
  const recommendations = profileData.recommendations || [];
  const interests = JSON.parse(profile.interests || '[]');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* ── PROFILE HEADER BANNER ───────────────────────── */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-surface-2/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-surface-2/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-accent via-accent to-accent p-[2px] shadow-xl shadow-none flex-shrink-0">
              <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center font-heading font-semibold text-3xl sm:text-2xl text-ivory">
                {profileData.fullName?.charAt(0) || 'U'}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory">
                  {profileData.fullName}
                </h1>
                <span className="text-xs uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-surface-2/10 text-secondary border border-border/20">
                  Level {profile.level || 1}
                </span>
                <span className="text-xs uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-surface-2/10 text-secondary border border-border/20">
                  {profile.xp || 100} XP
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-secondary flex-wrap">
                <div className="flex items-center gap-1.5 text-secondary">
                  <Building2 className="w-3.5 h-3.5 text-secondary" />
                  <span>{profileData.institution?.name}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-secondary" />
                  <span>{profile.department || 'Computer Science'} (Year {profile.year || 1})</span>
                </div>
                {profile.weeklyHours && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      <span>{profile.weeklyHours} hrs/wk</span>
                    </div>
                  </>
                )}
              </div>

              {profile.bio && (
                <p className="text-xs text-secondary max-w-xl pt-1 leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl glass-panel text-xs font-semibold text-secondary hover:text-ivory flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedShareLink ? 'Link Copied!' : 'Share Record'}</span>
            </button>

            {isOwnProfile && (
              <button
                onClick={() => setPrivacyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl glass-panel text-xs font-semibold text-secondary hover:text-secondary border border-border/30 flex items-center gap-1.5 transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Privacy</span>
              </button>
            )}
          </div>
        </div>

        {/* Links row */}
        <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border text-xs text-secondary flex-wrap">
          {profile.githubUrl && (
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-secondary hover:text-secondary transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          )}
          {profile.linkedinUrl && (
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-secondary hover:text-secondary transition-colors"
            >
              <Linkedin className="w-3.5 h-3.5" />
              <span>LinkedIn</span>
            </a>
          )}
          {profile.portfolioUrl && (
            <a
              href={profile.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-secondary hover:text-secondary transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Portfolio</span>
            </a>
          )}
        </div>
      </div>

      {/* ── STATS ROW ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-border">
          <div className="text-secondary text-xs font-medium">Projects Done</div>
          <div className="text-2xl font-semibold font-heading text-ivory mt-1">
            {projects.filter((p) => p.project?.status === 'completed').length}
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-border">
          <div className="text-secondary text-xs font-medium">Indexed Skills</div>
          <div className="text-2xl font-semibold font-heading text-secondary mt-1">
            {userSkills.length}
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-border">
          <div className="text-secondary text-xs font-medium">Badges Unlocked</div>
          <div className="text-2xl font-semibold font-heading text-secondary mt-1">
            {badges.length}
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-border">
          <div className="text-secondary text-xs font-medium">Collab Rating</div>
          <div className="text-2xl font-semibold font-heading text-secondary mt-1 flex items-center gap-1">
            <span>{profile.collaborationRating || '5.0'}</span>
            <Star className="w-4 h-4 fill-secondary text-secondary" />
          </div>
        </div>
      </div>

      {/* ── TAB NAV ─────────────────────────────────────── */}
      <div className="flex border-b border-border gap-6">
        {[
          { id: 'overview', label: 'Skills & Endorsements' },
          { id: 'timeline', label: 'Contributions Timeline' },
          { id: 'badges', label: 'Badges & XP' },
          { id: 'reviews', label: 'Peer Reviews & Faculty' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs sm:text-sm font-heading font-semibold transition-all relative ${
              activeTab === tab.id ? 'text-ivory' : 'text-secondary hover:text-secondary'
            }`}
          >
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent" />
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: SKILLS ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-border">
            <h3 className="text-base font-heading font-semibold text-ivory mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-secondary" />
              <span>Skills Matrix & Verified Endorsements</span>
            </h3>

            {userSkills.length === 0 ? (
              <p className="text-xs text-secondary">No skills added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {userSkills.map((us) => {
                  const endorsementsCount = us.endorsements?.length || 0;
                  return (
                    <div
                      key={us.id}
                      className="p-3.5 rounded-xl bg-surface-2/80 border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm text-ivory flex items-center gap-1.5">
                          <span>{us.skill?.name || us.skillName}</span>
                          {endorsementsCount > 0 && (
                            <span title="Verified by faculty or project owner">
                              <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-secondary">
                          {us.level || 'Beginner'}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          us.level === 'Advanced'
                            ? 'bg-surface-2/20 text-secondary border border-border/30'
                            : us.level === 'Intermediate'
                            ? 'bg-surface-2/20 text-secondary border border-border/30'
                            : 'bg-surface-2 text-secondary'
                        }`}
                      >
                        {us.level}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interests */}
          {interests.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-border">
              <h3 className="text-base font-heading font-semibold text-ivory mb-3">
                Focus Domains
              </h3>
              <div className="flex flex-wrap gap-2">
                {interests.map((domain, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-surface-2/10 text-secondary border border-border/20 text-xs font-medium"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: VERTICAL TIMELINE ───────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border space-y-6">
          <h3 className="text-base font-heading font-semibold text-ivory mb-6 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-secondary" />
            <span>Vertical Contributions Timeline</span>
          </h3>

          {projects.length === 0 ? (
            <div className="p-8 text-center text-xs text-secondary border border-dashed border-border rounded-2xl">
              No project contributions recorded yet. Discover open projects to join teams.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border/30 space-y-8">
              {projects.map((membership, idx) => {
                const proj = membership.project;
                return (
                  <div key={idx} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-surface-2 border-2 border-bg shadow-md shadow-none" />

                    <div className="glass-panel p-4 rounded-xl border border-border group-hover:border-border/30 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <Link
                          to={`/projects/${proj?.id}`}
                          className="font-heading font-semibold text-sm text-ivory hover:text-secondary transition-colors"
                        >
                          {proj?.title}
                        </Link>
                        <span className="text-xs text-secondary">
                          {new Date(membership.joinedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-secondary mb-2">
                        <span className="text-secondary font-medium">
                          {membership.role?.title || 'Team Member'}
                        </span>
                        <span>•</span>
                        <span className="capitalize text-secondary">{proj?.domain}</span>
                        <span>•</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            proj?.status === 'completed'
                              ? 'bg-surface-2/10 text-secondary'
                              : 'bg-surface-2/10 text-secondary'
                          }`}
                        >
                          {proj?.status}
                        </span>
                      </div>

                      {membership.contributionNote && (
                        <p className="text-xs text-secondary bg-surface-2/60 p-2.5 rounded-lg border border-border">
                          "{membership.contributionNote}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: BADGES & XP ───────────────────────────── */}
      {activeTab === 'badges' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border space-y-6">
          <h3 className="text-base font-heading font-semibold text-ivory mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-secondary" />
            <span>Badges & Accomplishments</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {badges.map((ub) => {
              const b = ub.badge;
              return (
                <div
                  key={ub.id}
                  className="p-4 rounded-2xl bg-surface-2/70 border border-border/20 flex items-start gap-3.5 shadow-lg "
                >
                  <div className="w-10 h-10 rounded-xl bg-surface-2/10 border border-border/30 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-ivory">{b?.name}</h4>
                    <p className="text-xs text-secondary leading-snug mt-0.5">
                      {b?.description}
                    </p>
                    <span className="inline-block mt-2 text-xs text-secondary font-mono">
                      +{b?.xpValue || 50} XP Awarded
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: REVIEWS & FACULTY RECOMMENDATIONS ───────── */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Faculty recommendations */}
          <div className="glass-card p-6 rounded-2xl border border-border">
            <h3 className="text-base font-heading font-semibold text-ivory mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              <span>Faculty Recommendations</span>
            </h3>

            {recommendations.length === 0 ? (
              <p className="text-xs text-secondary">No approved teacher recommendations yet.</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl bg-surface-2/60 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-ivory">{rec.teacherName}</div>
                        <div className="text-xs text-secondary">
                          {rec.teacherDesignation} • {rec.teacherDepartment}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-secondary text-xs font-semibold">
                        <Star className="w-3.5 h-3.5 fill-secondary" />
                        <span>{rec.ratingTechnical || 5}/5 Technical</span>
                      </div>
                    </div>
                    <p className="text-xs text-secondary italic">"{rec.text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Peer Reviews */}
          <div className="glass-card p-6 rounded-2xl border border-border">
            <h3 className="text-base font-heading font-semibold text-ivory mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-secondary" />
              <span>Peer Reviews Received</span>
            </h3>

            {peerReviews.length === 0 ? (
              <p className="text-xs text-secondary">No peer reviews received yet. Reviews are collected after project completion.</p>
            ) : (
              <div className="space-y-3">
                {peerReviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-surface-2/60 border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-ivory">
                        From {rev.reviewer?.fullName || 'Teammate'}
                      </span>
                      <div className="flex gap-2 text-xs text-secondary">
                        <span>Reliability: {rev.ratingReliability}/5</span>
                        <span>Comm: {rev.ratingCommunication}/5</span>
                        <span>Skill: {rev.ratingSkill}/5</span>
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-secondary italic">"{rev.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRIVACY CONTROLS MODAL ───────────────────────── */}
      {privacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl border border-border max-w-md w-full space-y-4">
            <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
              <Lock className="w-4 h-4 text-secondary" />
              <span>Section Privacy Settings</span>
            </h3>
            <p className="text-xs text-secondary">
              Control who can see specific sections of your student record.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { label: 'Projects & Roles', key: 'privacyProjects' },
                { label: 'Skills & Levels', key: 'privacySkills' },
                { label: 'Peer Reviews', key: 'privacyReviews' },
                { label: 'Faculty Recommendations', key: 'privacyRecommendations' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/80 border border-border">
                  <span className="text-xs font-medium text-secondary">{item.label}</span>
                  <select
                    defaultValue="public"
                    className="bg-surface-2 text-xs text-secondary rounded-lg px-2.5 py-1 border border-border outline-none"
                  >
                    <option value="public">Public</option>
                    <option value="institution">Campus Only</option>
                    <option value="private">Only Me</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                onClick={() => setPrivacyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-ivory glass-panel"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPrivacyModalOpen(false);
                  alert('Privacy settings saved!');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-ivory glow-btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
