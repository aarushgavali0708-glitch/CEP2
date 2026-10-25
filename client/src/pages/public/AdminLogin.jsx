import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Building2, KeyRound } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminLogin(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@dpu.edu.in');
    setPassword('admin1234');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-surface-2/15 blur-[140px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-accent p-[1.5px] mb-3 shadow-lg ">
            <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center">
              <Shield className="w-6 h-6 text-secondary" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory tracking-tight">
            Institution Admin Portal
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Institutional Administrators & Project Coordinators
          </p>
        </div>

        {/* Demo Quick Fill */}
        <div className="mb-6 p-3.5 rounded-xl glass-panel border border-border/30 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-secondary" />
            <div>
              <div className="font-semibold text-secondary">Demo Admin (DYP DPU)</div>
              <div className="text-xs text-secondary">admin@dpu.edu.in / admin1234</div>
            </div>
          </div>
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="px-3 py-1.5 rounded-lg bg-surface-2/20 hover:bg-surface-2/30 border border-border/40 text-secondary text-xs font-medium transition-all"
          >
            Auto Fill
          </button>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-border/20 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-surface-2/10 border border-border/30 flex items-center gap-2.5 text-xs text-secondary">
              <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@institution.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/80 border border-border focus:border-accent focus:ring-1 focus:ring-accent focus:ring-1 focus:ring-accent text-sm text-ivory placeholder:text-secondary outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Admin Password
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
              className="w-full py-3 rounded-xl font-heading font-semibold text-sm text-ivory glow-btn-primary shadow-lg shadow-none flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Admin Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-secondary">
            <span>Are you a student? </span>
            <Link to="/login" className="text-secondary hover:text-secondary font-medium">
              Student Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
