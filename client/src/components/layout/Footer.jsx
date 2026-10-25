import React from 'react';
import { Sparkles, Heart, Shield, Code, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-bg pt-12 pb-8 mt-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent p-[1px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-bg" />
              </div>
              <span className="font-heading font-semibold text-base text-ivory">
                TeamConnect
              </span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Find projects that match your skills. Build teams that make things happen.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-ivory mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-secondary">
              <li>
                <Link to="/discover" className="hover:text-accent transition-colors">
                  Discover Projects
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-accent transition-colors">
                  Student Registration
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-ivory mb-3">
              Institutions
            </h4>
            <div className="space-y-2 text-xs text-secondary">
              <div className="flex items-center gap-1.5 text-secondary">
                <Building2 className="w-3.5 h-3.5 text-accent" />
                <span>DYP DPU (@dpu.edu.in)</span>
              </div>
              <div className="flex items-center gap-1.5 text-secondary">
                <Building2 className="w-3.5 h-3.5 text-secondary" />
                <span>Stanford University (@stanford.edu)</span>
              </div>
              <p className="text-xs text-secondary pt-1">
                Institution-isolated multi-tenant security architecture.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-ivory mb-3">
              Admin & Faculty
            </h4>
            <ul className="space-y-2 text-xs text-secondary">
              <li>
                <Link to="/admin/login" className="flex items-center gap-1.5 hover:text-accent transition-colors">
                  <Shield className="w-3.5 h-3.5 text-accent" />
                  Institution Admin Login
                </Link>
              </li>
              <li className="text-xs text-secondary">
                Demo Admin: <code className="text-secondary font-mono">admin@dpu.edu.in</code> / <code className="text-secondary font-mono">admin1234</code>
              </li>
              <li className="text-xs text-secondary">
                Demo Student: <code className="text-secondary font-mono">alice@dpu.edu.in</code> / <code className="text-secondary font-mono">demo1234</code>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-secondary">
          <p>© {new Date().getFullYear()} TeamConnect. Built with React, Tailwind & Node.js.</p>
          <div className="flex items-center gap-1 text-secondary">
            <span>Engineered for campus innovation</span>
            <Heart className="w-3 h-3 text-accent fill-accent inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
