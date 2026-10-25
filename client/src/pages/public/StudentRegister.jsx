import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  User,
  Mail,
  Lock,
  Building2,
  GraduationCap,
  Calendar,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function StudentRegister() {
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    institutionId: '',
    department: 'Computer Science',
    year: 1,
  });
  const [selectedInst, setSelectedInst] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchInstitutions() {
      try {
        const res = await api.getInstitutions();
        if (res.institutions && res.institutions.length > 0) {
          setInstitutions(res.institutions);
          setFormData((prev) => ({ ...prev, institutionId: res.institutions[0].id }));
          setSelectedInst(res.institutions[0]);
        }
      } catch (err) {
        console.error('Failed to load institutions:', err);
      }
    }
    fetchInstitutions();
  }, []);

  const handleInstitutionChange = (instId) => {
    const inst = institutions.find((i) => i.id === instId);
    setSelectedInst(inst);
    setFormData((prev) => ({ ...prev, institutionId: instId }));
  };

  const emailDomain = formData.email.includes('@') ? formData.email.split('@')[1]?.toLowerCase() : '';
  const domainMatches = selectedInst ? emailDomain === selectedInst.domain.toLowerCase() : false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (selectedInst && !domainMatches) {
      setError(`Your email must end with @${selectedInst.domain} for ${selectedInst.name}`);
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        institutionId: formData.institutionId,
        department: formData.department,
        year: parseInt(formData.year),
      });

      // Redirect directly to the onboarding wizard
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] bg-surface-2/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent via-accent to-accent p-[1.5px] mb-3 shadow-lg ">
            <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-secondary" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory tracking-tight">
            Create Student Profile
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Find projects that match your skills. Build teams that make things happen.
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-surface-2/10 border border-border/30 flex items-center gap-2.5 text-xs text-secondary">
              <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Institution Selection */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5 flex items-center justify-between">
                <span>Select Your Institution</span>
                {selectedInst && (
                  <span className="text-xs text-secondary font-mono">
                    Required domain: @{selectedInst.domain}
                  </span>
                )}
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={formData.institutionId}
                  onChange={(e) => handleInstitutionChange(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent focus:ring-1 focus:ring-accent text-sm text-ivory outline-none transition-all appearance-none cursor-pointer"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id} className="bg-surface-2 text-ivory">
                      {inst.name} ({inst.domain})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none transition-all"
                />
              </div>
            </div>

            {/* Email with Domain Verification */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-secondary">
                  College Email
                </label>
                {formData.email && (
                  <span className={`text-xs flex items-center gap-1 ${domainMatches ? 'text-secondary' : 'text-secondary'}`}>
                    {domainMatches ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Domain verified (@{selectedInst?.domain})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Must end with @{selectedInst?.domain}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={`yourname@${selectedInst?.domain || 'institution.edu'}`}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border text-sm text-ivory placeholder:text-secondary outline-none transition-all ${
                    formData.email
                      ? domainMatches
                        ? 'border-border/50 focus:border-accent focus:ring-1 focus:ring-accent'
                        : 'border-border/50 focus:border-accent focus:ring-1 focus:ring-accent'
                      : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
                  }`}
                />
              </div>
            </div>

            {/* Department & Year Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  Department
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ivory outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Computer Science" className="bg-surface-2">Computer Science</option>
                    <option value="Electrical Engineering" className="bg-surface-2">Electrical Engineering</option>
                    <option value="Data Science" className="bg-surface-2">Data Science</option>
                    <option value="Design & HCI" className="bg-surface-2">Design & HCI</option>
                    <option value="Information Systems" className="bg-surface-2">Information Systems</option>
                    <option value="Mechanical Engineering" className="bg-surface-2">Mechanical Engineering</option>
                    <option value="Other" className="bg-surface-2">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  Academic Year
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ivory outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value={1} className="bg-surface-2">1st Year (Freshman)</option>
                    <option value={2} className="bg-surface-2">2nd Year (Sophomore)</option>
                    <option value={3} className="bg-surface-2">3rd Year (Junior)</option>
                    <option value={4} className="bg-surface-2">4th Year (Senior)</option>
                    <option value={5} className="bg-surface-2">5th Year / Graduate</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !domainMatches}
              className="w-full py-3 rounded-xl font-heading font-semibold text-sm text-ivory glow-btn-primary shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account & Start Onboarding</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-secondary">
            <span>Already registered? </span>
            <Link to="/login" className="text-secondary hover:text-secondary font-medium">
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
