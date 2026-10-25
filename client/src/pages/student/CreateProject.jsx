import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Layers,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function CreateProject() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goals: '',
    domain: 'Web Dev',
    duration: '3 months',
  });

  const [roles, setRoles] = useState([
    {
      id: 1,
      title: 'Frontend Developer',
      description: 'Build user interfaces with responsive design and modern state management.',
      seats: 1,
      hoursPerWeek: 10,
      skills: [],
    },
  ]);

  const [activeRoleSkillInput, setActiveRoleSkillInput] = useState('');

  const domains = ['Web Dev', 'ML/AI', 'Mobile', 'Design', 'DevOps', 'Backend', 'Data Science', 'Blockchain'];

  useEffect(() => {
    async function fetchSkills() {
      try {
        const res = await api.getSkills();
        if (res.skills) setAllSkills(res.skills);
      } catch (err) {
        console.error('Failed to load skills:', err);
      }
    }
    fetchSkills();
  }, []);

  const handleAddRole = () => {
    setRoles([
      ...roles,
      {
        id: Date.now(),
        title: '',
        description: '',
        seats: 1,
        hoursPerWeek: 10,
        skills: [],
      },
    ]);
  };

  const handleRemoveRole = (roleId) => {
    if (roles.length <= 1) {
      addToast('A project must have at least one role', 'error');
      return;
    }
    setRoles(roles.filter((r) => r.id !== roleId));
  };

  const handleRoleChange = (roleId, field, value) => {
    setRoles(
      roles.map((r) => (r.id === roleId ? { ...r, [field]: value } : r))
    );
  };

  const handleAddSkillToRole = (roleId, skill) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    if (role.skills.some((s) => s.skillId === skill.id)) return;

    const newSkill = {
      skillId: skill.id,
      name: skill.name,
      requiredLevel: 'Intermediate',
      importance: 'must-have',
    };

    setRoles(
      roles.map((r) =>
        r.id === roleId ? { ...r, skills: [...r.skills, newSkill] } : r
      )
    );
  };

  const handleRemoveSkillFromRole = (roleId, skillId) => {
    setRoles(
      roles.map((r) =>
        r.id === roleId
          ? { ...r, skills: r.skills.filter((s) => s.skillId !== skillId) }
          : r
      )
    );
  };

  const handleSkillSettingChange = (roleId, skillId, field, value) => {
    setRoles(
      roles.map((r) =>
        r.id === roleId
          ? {
              ...r,
              skills: r.skills.map((s) =>
                s.skillId === skillId ? { ...s, [field]: value } : s
              ),
            }
          : r
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.title.trim() || formData.title.length < 5) {
      setError('Project title must be at least 5 characters');
      return;
    }

    if (!formData.description.trim() || formData.description.length < 20) {
      setError('Please provide a descriptive project overview (at least 20 characters)');
      return;
    }

    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      if (!r.title.trim()) {
        setError(`Role #${i + 1} requires a title (e.g. Frontend Developer)`);
        return;
      }
      if (r.skills.length === 0) {
        setError(`Role "${r.title || `#${i + 1}`}" needs at least one required skill`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        goals: formData.goals.trim(),
        domain: formData.domain,
        duration: formData.duration,
        roles: roles.map((r) => ({
          title: r.title.trim(),
          description: r.description.trim(),
          seats: parseInt(r.seats) || 1,
          hoursPerWeek: parseInt(r.hoursPerWeek) || 10,
          skills: r.skills.map((s) => ({
            skillId: s.skillId,
            requiredLevel: s.requiredLevel,
            importance: s.importance,
          })),
        })),
      };

      const res = await api.createProject(payload);
      addToast('Project submitted! It is now pending lab admin review.', 'success');
      navigate('/my-projects');
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discover Projects</span>
        </Link>
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border relative overflow-hidden shadow-2xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2/10 text-secondary text-xs font-semibold border border-border/20">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span>Community Project Creator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory tracking-tight">
            Propose a New Project
          </h1>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed">
            Specify the project problem, timeline, and the exact roles/skills you need.
            New projects start in <strong className="text-secondary">pending</strong> status until reviewed by your institution admin.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-surface-2/10 border border-border/30 flex items-center gap-3 text-xs text-secondary">
          <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Project Core Details */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border space-y-5">
          <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
            <Layers className="w-4 h-4 text-secondary" />
            <span>Project Overview</span>
          </h3>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. EcoRoute — Campus Carbon Tracker"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Primary Domain *
              </label>
              <select
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-xs sm:text-sm text-ivory outline-none cursor-pointer"
              >
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Expected Duration
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-xs sm:text-sm text-ivory outline-none cursor-pointer"
              >
                <option value="2 months">2 months</option>
                <option value="3 months">3 months</option>
                <option value="4 months">4 months</option>
                <option value="6 months">6 months</option>
                <option value="Academic Year">Full Academic Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">
              Description / Problem Statement *
            </label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What community problem does this project solve? What will the team build?"
              className="w-full p-3.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs sm:text-sm text-ivory placeholder:text-secondary outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">
              Project Goals & Key Milestones
            </label>
            <textarea
              rows={2}
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              placeholder="e.g. Deploy MVP on campus by week 8; achieve 100 test student users; present at project showcase."
              className="w-full p-3.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs sm:text-sm text-ivory placeholder:text-secondary outline-none resize-none"
            />
          </div>
        </div>

        {/* Role Builder Section */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                <span>Role Builder ({roles.length} role{roles.length > 1 ? 's' : ''})</span>
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Define the roles you need. Specify required skills, levels, and seats.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddRole}
              className="px-3 py-1.5 rounded-xl bg-surface-2/20 border border-border/40 text-secondary text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-2/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Role</span>
            </button>
          </div>

          {/* Roles List */}
          <div className="space-y-6">
            {roles.map((role, idx) => (
              <div
                key={role.id}
                className="p-5 rounded-2xl bg-surface-2/80 border border-border space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="font-heading font-semibold text-sm text-secondary">
                    Role #{idx + 1}
                  </span>
                  {roles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role.id)}
                      className="text-xs text-secondary hover:text-secondary flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Role</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Role Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={role.title}
                      onChange={(e) => handleRoleChange(role.id, 'title', e.target.value)}
                      placeholder="e.g. Backend Developer"
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs text-ivory outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Number of Seats
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={role.seats}
                      onChange={(e) => handleRoleChange(role.id, 'seats', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs text-ivory outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Hours / Week
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={40}
                      value={role.hoursPerWeek}
                      onChange={(e) => handleRoleChange(role.id, 'hoursPerWeek', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs text-ivory outline-none"
                    />
                  </div>
                </div>

                {/* Skills Selector for this role */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-medium text-secondary">
                    Required Skills for {role.title || 'this role'}:
                  </label>

                  {/* Add skill pills */}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-surface-2/60 rounded-xl border border-border">
                    {allSkills
                      .filter((sk) => !role.skills.some((s) => s.skillId === sk.id))
                      .slice(0, 16)
                      .map((sk) => (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() => handleAddSkillToRole(role.id, sk)}
                          className="px-2 py-1 rounded-lg bg-surface-2 border border-border hover:border-border text-xs text-secondary flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3 text-secondary" />
                          <span>{sk.name}</span>
                        </button>
                      ))}
                  </div>

                  {/* Configured skills list */}
                  <div className="space-y-2 pt-2">
                    {role.skills.map((sk) => (
                      <div
                        key={sk.skillId}
                        className="p-2.5 rounded-xl bg-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-ivory">{sk.name}</span>

                        <div className="flex items-center gap-2">
                          {/* Level selector */}
                          <select
                            value={sk.requiredLevel}
                            onChange={(e) =>
                              handleSkillSettingChange(
                                role.id,
                                sk.skillId,
                                'requiredLevel',
                                e.target.value
                              )
                            }
                            className="bg-surface-2 text-xs text-secondary px-2 py-1 rounded-lg border border-border outline-none"
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>

                          {/* Importance selector */}
                          <select
                            value={sk.importance}
                            onChange={(e) =>
                              handleSkillSettingChange(
                                role.id,
                                sk.skillId,
                                'importance',
                                e.target.value
                              )
                            }
                            className="bg-surface-2 text-xs text-secondary px-2 py-1 rounded-lg border border-border outline-none"
                          >
                            <option value="must-have">Must-have (2x weight)</option>
                            <option value="nice-to-have">Nice-to-have (1x)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveSkillFromRole(role.id, sk.skillId)}
                            className="text-secondary hover:text-secondary p-1"
                            aria-label={`Remove ${sk.name} from role`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/discover"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-ivory glass-panel"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl font-heading font-semibold text-sm text-ivory glow-btn-primary shadow-xl shadow-none flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Submit Project for Approval</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
