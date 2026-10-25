import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, ArrowRight, Sparkles, AlertCircle, Building2, UserCheck } from 'lucide-react';

export default function StudentLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (!user.onboardingDone && !user.studentProfile?.onboardingDone) {
        navigate('/onboarding');
      } else {
        navigate('/discover');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('demo1234');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative">
      {/* Background glow in Blue */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-surface-2/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent via-accent to-accent p-[1.5px] mb-3 shadow-lg ">
            <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-secondary" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory tracking-tight">
            Student Sign In
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Find projects that match your skills. Build teams that make things happen.
          </p>
        </div>

        {/* Demo Quick-Fill Bar */}
        <div className="mb-6 p-3.5 rounded-xl glass-panel border border-border/20 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-secondary mb-2">
            <UserCheck className="w-4 h-4 text-secondary" />
            <span>Instant Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('alice@dpu.edu.in')}
              className="px-2 py-1.5 rounded-lg bg-surface-2/90 border border-border/30 hover:border-border text-secondary text-left transition-all"
            >
              <div className="font-medium text-xs text-secondary truncate">Alice (Dev)</div>
              <div className="text-xs text-secondary truncate">alice@dpu.edu.in</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('sam@dpu.edu.in')}
              className="px-2 py-1.5 rounded-lg bg-surface-2/90 border border-border/30 hover:border-border text-secondary text-left transition-all"
            >
              <div className="font-medium text-xs text-secondary truncate">Sam (Design)</div>
              <div className="text-xs text-secondary truncate">sam@dpu.edu.in</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('henry@stanford.edu')}
              className="px-2 py-1.5 rounded-lg bg-surface-2/90 border border-border/30 hover:border-border text-secondary text-left transition-all"
            >
              <div className="font-medium text-xs text-secondary truncate">Henry (AI/ML)</div>
              <div className="text-xs text-secondary truncate">henry@stanford.edu</div>
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-surface-2/10 border border-border/30 flex items-center gap-2.5 text-xs text-secondary">
              <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@institution.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-heading font-semibold text-sm text-ivory glow-btn-primary shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-secondary">
            <span>New student? </span>
            <Link to="/register" className="text-secondary hover:text-secondary font-medium">
              Create an account
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/admin/login"
            className="text-xs text-secondary hover:text-secondary transition-colors inline-flex items-center gap-1"
          >
            <span>Institution Admin or Lab Coordinator?</span>
            <span className="underline">Admin Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
