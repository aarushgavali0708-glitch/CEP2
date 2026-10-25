import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';
import {
  Sparkles,
  Compass,
  Lightbulb,
  FolderKanban,
  Bell,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Building2,
  ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-border bg-bg/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-accent p-[1.5px] transition-all duration-200">
            <div className="w-full h-full bg-bg rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent group-hover:rotate-12 transition-transform duration-200" />
            </div>
          </div>
          <div>
            <span className="font-heading font-semibold text-lg tracking-tight text-ivory">
              Team<span className="text-ivory">Connect</span>
            </span>
          </div>
        </Link>

        {/* Institution Badge if logged in */}
        {user?.institution && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border text-xs text-secondary">
            <Building2 className="w-3.5 h-3.5 text-accent" />
            <span className="font-medium text-ivory">{user.institution.name}</span>
          </div>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              {isAdmin ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/dashboard')
                        ? 'text-accent border-b border-accent'
                        : 'text-secondary hover:text-ivory hover:bg-surface-2/60'
                    }`}
                  >
                    Admin Dashboard
                  </Link>
                  <Link
                    to="/admin/projects"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/projects')
                        ? 'text-accent border-b border-accent'
                        : 'text-secondary hover:text-ivory hover:bg-surface-2/60'
                    }`}
                  >
                    Moderate Projects
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/discover"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/discover')
                        ? 'text-accent border-b border-accent'
                        : 'text-secondary hover:text-ivory hover:bg-surface-2/60'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-accent" />
                    Discover Projects
                  </Link>
                  <Link
                    to="/my-projects"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/my-projects')
                        ? 'text-accent border-b border-accent'
                        : 'text-secondary hover:text-ivory hover:bg-surface-2/60'
                    }`}
                  >
                    <FolderKanban className="w-4 h-4 text-secondary" />
                    My Projects
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/" className="px-3 py-1.5 text-sm text-secondary hover:text-ivory transition-colors">
                Home
              </Link>
              <a href="#how-it-works" className="px-3 py-1.5 text-sm text-secondary hover:text-ivory transition-colors">
                How It Works
              </a>
              <a href="#features" className="px-3 py-1.5 text-sm text-secondary hover:text-ivory transition-colors">
                Features
              </a>
            </>
          )}
        </nav>

        {/* Right CTA / User controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative flex items-center gap-2">
              {location.pathname !== '/discover' && <NotificationBell />}

              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface border border-border hover:border-accent/60 transition-all duration-200"
                >
                  <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-xs font-semibold text-ivory">
                    {user.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline-block text-xs font-medium text-ivory max-w-[100px] truncate">
                    {user.fullName}
                  </span>
                    <ChevronDown className="w-3.5 h-3.5 text-secondary" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-card rounded-2xl py-2 shadow-2xl border border-border animate-in fade-in zoom-in-95 z-50">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-ivory">{user.fullName}</p>
                      <p className="text-xs text-secondary truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-xs uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-secondary border border-border">
                        {user.role}
                      </span>
                    </div>

                    {!isAdmin && (
                      <Link
                        to={`/profile/${user.id}`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-secondary hover:text-ivory hover:bg-surface-2 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-accent" />
                        Student Profile & Record
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-secondary hover:text-ivory hover:bg-surface-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-secondary hover:text-ivory hover:bg-surface-2 transition-all"
              >
                Student Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-xl text-xs font-semibold glow-btn-primary shadow-md"
              >
                Join Platform
              </Link>
              <Link
                to="/admin/login"
                className="p-1.5 rounded-lg border border-border text-secondary hover:text-accent hover:border-accent/60 transition-all duration-200"
                title="Admin Portal"
                aria-label="Admin portal"
              >
                <Shield className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-secondary hover:text-ivory hover:bg-surface-2"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-border px-4 py-3 space-y-2">
          {user ? (
            <>
              {!isAdmin && (
                <>
                  <Link
                    to="/discover"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-ivory hover:bg-surface-2"
                  >
                    Discover Projects
                  </Link>
                  <Link
                    to="/my-projects"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-ivory hover:bg-surface-2"
                  >
                    My Projects
                  </Link>
                  <Link
                    to={`/profile/${user.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-ivory hover:bg-surface-2"
                  >
                    My Profile
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-ivory hover:bg-surface-2"
                >
                  Admin Dashboard
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate('/');
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-secondary hover:bg-surface-2"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-ivory hover:bg-surface-2"
              >
                Student Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-accent hover:bg-surface-2"
              >
                Create Student Account
              </Link>
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-secondary hover:text-ivory hover:bg-surface-2"
              >
                Institution Admin Login
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
