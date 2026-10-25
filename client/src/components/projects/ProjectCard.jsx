import React from 'react';
import { Link } from 'react-router-dom';
import MatchScoreBadge from '../matching/MatchScoreBadge';
import { Users, Clock, ArrowRight, Sparkles, Building2, ChevronRight } from 'lucide-react';

export default function ProjectCard({ project, compact = false }) {
  const roles = project.roles || [];
  const openRoles = roles.filter((r) => r.filledSeats < r.seats);
  const totalSeats = roles.reduce((sum, r) => sum + r.seats, 0);
  const filledSeats = roles.reduce((sum, r) => sum + r.filledSeats, 0);
  const membersCount = project._count?.members || project.members?.length || 0;

  const matchScore = project.matchScore !== undefined ? project.matchScore : 0;
  const bestRole = project.bestRole;

  return (
    <div className="glass-card flex flex-col justify-between group">
      <div>
        {/* Top Header: Domain Badge, Status, Match Score Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs font-semibold text-secondary">
              {project.domain}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                project.status === 'active'
                  ? 'bg-surface-2 text-secondary border border-border'
                  : project.status === 'pending'
                  ? 'bg-surface text-secondary border border-border'
                  : 'bg-surface text-secondary border border-border'
              }`}
            >
              {project.status === 'pending' ? 'Pending Approval' : project.status}
            </span>
          </div>

          <MatchScoreBadge score={matchScore} size={compact ? 'sm' : 'md'} showLabel={!compact} />
        </div>

        {/* Project Title & Short Description */}
        <Link to={`/projects/${project.id}`}>
          <h3 className="font-heading font-semibold text-base sm:text-lg text-ivory group-hover:text-accent-hover transition-colors line-clamp-1 mb-1.5">
            {project.title}
          </h3>
        </Link>
        <p className="text-xs text-secondary line-clamp-2 leading-relaxed mb-4">
          {project.description}
        </p>

        {/* Best Match Role Highlight */}
        {bestRole && (
          <div className="mb-4 p-2.5 rounded-xl bg-surface-2 border border-border text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <span className="text-secondary">Best fit:</span>
              <span className="font-semibold text-ivory truncate">{bestRole.title}</span>
            </div>
            <span className="text-xs text-secondary font-mono flex-shrink-0">
              {bestRole.hoursPerWeek}h/wk
            </span>
          </div>
        )}

        {/* Open Roles Pill List with Required Skills */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Open Roles ({openRoles.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {openRoles.slice(0, 3).map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-secondary"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>{r.title}</span>
              </span>
            ))}
            {openRoles.length > 3 && (
              <span className="text-xs text-secondary self-center">
                +{openRoles.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Owner, Team Size, View Details CTA */}
      <div className="pt-3.5 border-t border-border flex items-center justify-between text-xs text-secondary">
        <div className="flex items-center gap-2 truncate">
          <div className="w-6 h-6 rounded-lg bg-surface-2 flex items-center justify-center font-semibold text-xs text-ivory flex-shrink-0">
            {project.owner?.fullName?.charAt(0) || 'O'}
          </div>
          <span className="truncate text-secondary">{project.owner?.fullName}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-secondary">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span>{membersCount} team</span>
          </span>

          <Link
            to={`/projects/${project.id}`}
            className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface hover:text-accent transition-colors"
            title="View Project"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
