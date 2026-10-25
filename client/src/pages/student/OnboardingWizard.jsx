import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Check,
  Search,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Github,
  Linkedin,
  Globe,
  Award,
  Zap,
  BookOpen
} from 'lucide-react';

export default function OnboardingWizard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [allSkills, setAllSkills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [interests, setInterests] = useState([]);
  const [bio, setBio] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(12);
  const [saving, setSaving] = useState(false);

  const availableDomains = [
    'Web Dev',
    'ML/AI',
    'Mobile',
    'Design',
    'DevOps',
    'Backend',
    'Data Science',
    'Blockchain',
    'Cybersecurity',
    'IoT / Hardware',
    'Game Dev',
    'Sustainability'
  ];

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

  // Compute live profile strength
  const calculateStrength = () => {
    let score = 15; // base
    if (selectedSkills.length >= 3) score += 30;
    else if (selectedSkills.length > 0) score += selectedSkills.length * 10;

    if (interests.length >= 2) score += 20;
    else if (interests.length === 1) score += 10;

    if (bio.trim().length > 25) score += 15;
    if (githubUrl || linkedinUrl || portfolioUrl) score += 10;
    if (weeklyHours > 0) score += 10;

    return Math.min(score, 100);
  };

  const strength = calculateStrength();

  const handleAddSkill = (skill) => {
    if (!selectedSkills.find((s) => s.id === skill.id)) {
      setSelectedSkills([...selectedSkills, { ...skill, level: 'Intermediate' }]);
    }
  };

  const handleRemoveSkill = (skillId) => {
    setSelectedSkills(selectedSkills.filter((s) => s.id !== skillId));
  };

  const handleSkillLevelChange = (skillId, level) => {
    setSelectedSkills(
      selectedSkills.map((s) => (s.id === skillId ? { ...s, level } : s))
    );
  };

  const toggleInterest = (domain) => {
    if (interests.includes(domain)) {
      setInterests(interests.filter((i) => i !== domain));
    } else {
      setInterests([...interests, domain]);
    }
  };

  const filteredSkills = allSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedSkills.some((sel) => sel.id === s.id)
  );

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.completeOnboarding({
        skills: selectedSkills.map((s) => ({ name: s.name, level: s.level, category: s.category })),
        interests,
        bio,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        weeklyHours,
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      await refreshUser();
      setTimeout(() => {
        navigate('/discover');
      }, 800);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      alert(err.message || 'Error saving onboarding profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[88vh] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header with Profile Strength */}
      <div className="glass-card p-6 rounded-2xl border border-border mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2/10 text-secondary text-xs font-semibold mb-1 border border-border/20">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>Welcome to {user?.institution?.name || 'TeamConnect'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-semibold text-ivory">
              Complete Your Student Profile
            </h1>
            <p className="text-xs text-secondary">
              This powers the 4-factor matching engine so you find the best project roles.
            </p>
          </div>

          <div className="sm:text-right min-w-[140px]">
            <div className="text-xs font-medium text-secondary flex items-center sm:justify-end gap-1.5">
              <span>Profile Strength</span>
              <span className="font-semibold text-secondary font-heading">{strength}%</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2 mt-1.5 border border-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent via-accent to-accent transition-all duration-500 rounded-full"
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          {[
            { num: 1, title: 'Your Skills & Levels' },
            { num: 2, title: 'Project Domains' },
            { num: 3, title: 'Bio & Availability' },
          ].map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => setStep(st.num)}
              className={`p-2 rounded-xl text-left transition-all ${
                step === st.num
                  ? 'bg-surface-2/15 border border-border/40 text-secondary'
                  : 'bg-surface-2/40 border border-transparent text-secondary hover:text-secondary'
              }`}
            >
              <div className="text-xs uppercase font-semibold tracking-wider">Step {st.num}</div>
              <div className="text-xs font-medium truncate">{st.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── STEP 1: SKILLS ──────────────────────────────────── */}
      {step === 1 && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border shadow-2xl space-y-6">
          <div>
            <h2 className="text-lg font-heading font-semibold text-ivory flex items-center gap-2">
              <Zap className="w-5 h-5 text-secondary" />
              <span>What skills do you bring to a project?</span>
            </h2>
            <p className="text-xs text-secondary mt-1">
              Select your skills and specify your proficiency. The matching engine compares these with project requirements.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills (e.g. React, Python, Figma, Docker, ML)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none"
            />
          </div>

          {/* Suggested skills pills */}
          <div>
            <div className="text-xs font-medium text-secondary mb-2">Available Skills:</div>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
              {filteredSkills.slice(0, 24).map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => handleAddSkill(skill)}
                  className="px-3 py-1.5 rounded-lg bg-surface-2/90 border border-border hover:border-border hover:bg-surface-2/20 text-xs text-secondary flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3 h-3 text-secondary" />
                  <span>{skill.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected skills list with proficiency level */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
              Selected Skills ({selectedSkills.length})
            </h3>

            {selectedSkills.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-secondary">
                No skills selected yet. Click any skill above to add it.
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedSkills.map((sk) => (
                  <div
                    key={sk.id}
                    className="p-3 rounded-xl bg-surface-2/80 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-surface-2" />
                      <span className="text-sm font-medium text-ivory">{sk.name}</span>
                      <span className="text-xs text-secondary px-1.5 py-0.5 rounded bg-surface-2">
                        {sk.category || 'General'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => handleSkillLevelChange(sk.id, lvl)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            sk.level === lvl
                              ? 'bg-gradient-to-r from-accent to-accent text-ivory shadow-sm'
                              : 'bg-surface-2 text-secondary hover:text-ivory border border-border'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk.id)}
                        className="p-1.5 rounded-lg text-secondary hover:text-secondary hover:bg-surface-2/10 transition-colors ml-1"
                        title="Remove skill"
                        aria-label={`Remove ${sk.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl font-heading font-semibold text-sm text-ivory glow-btn-primary flex items-center gap-2 shadow-lg"
            >
              <span>Next: Project Domains</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: INTERESTS / DOMAINS ─────────────────────── */}
      {step === 2 && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border shadow-2xl space-y-6">
          <div>
            <h2 className="text-lg font-heading font-semibold text-ivory flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-secondary" />
              <span>Which project domains excite you most?</span>
            </h2>
            <p className="text-xs text-secondary mt-1">
              Select one or more domains. Projects in these areas get a 15% interest bonus in match score.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableDomains.map((domain) => {
              const isSelected = interests.includes(domain);
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => toggleInterest(domain)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-surface-2/30 border-border/60 shadow-lg  text-ivory'
                      : 'bg-surface-2/60 border-border text-secondary hover:text-secondary hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading font-semibold text-sm">{domain}</span>
                    {isSelected && <Check className="w-4 h-4 text-secondary" />}
                  </div>
                  <span className="text-xs text-secondary">
                    {isSelected ? 'Selected' : 'Click to select'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-ivory glass-panel flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl font-heading font-semibold text-sm text-ivory glow-btn-primary flex items-center gap-2 shadow-lg"
            >
              <span>Next: Bio & Availability</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: BIO, LINKS, AVAILABILITY ────────────────── */}
      {step === 3 && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border shadow-2xl space-y-6">
          <div>
            <h2 className="text-lg font-heading font-semibold text-ivory flex items-center gap-2">
              <Award className="w-5 h-5 text-secondary" />
              <span>Final Details & Availability</span>
            </h2>
            <p className="text-xs text-secondary mt-1">
              Add links to your portfolio/GitHub, a short bio, and how many hours you can commit weekly.
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">
              Short Bio / About You
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Junior CS student passionate about full-stack web and cloud architectures. Looking to join impactful team projects..."
              className="w-full p-3.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none resize-none"
            />
          </div>

          {/* External Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-secondary" />
                <span>GitHub URL</span>
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-3 py-2 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs text-ivory placeholder:text-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-secondary" />
                <span>LinkedIn URL</span>
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-2 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs text-ivory placeholder:text-secondary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-secondary" />
                <span>Portfolio / Website</span>
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://myportfolio.dev"
                className="w-full px-3 py-2 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-xs text-ivory placeholder:text-secondary outline-none"
              />
            </div>
          </div>

          {/* Weekly Hours Availability Slider */}
          <div className="p-4 rounded-xl bg-surface-2/80 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary" />
                <span className="text-xs font-medium text-secondary">
                  Weekly Project Availability
                </span>
              </div>
              <span className="font-heading font-semibold text-sm text-secondary">
                {weeklyHours} hrs / week
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={35}
              step={1}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-xs text-secondary">
              <span>Light (2-5h)</span>
              <span>Standard (10-15h)</span>
              <span>Intensive (20h+)</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-ivory glass-panel flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="px-8 py-3 rounded-xl font-heading font-semibold text-sm text-ivory glow-btn-primary flex items-center gap-2 shadow-xl shadow-none disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Launch My Profile & Discover Projects</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
