import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Archive,
  Search,
  Filter,
  Clock,
  Layers,
  Building2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManageProjects() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetProject, setTargetProject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminProjects({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res.projects) setProjects(res.projects);
    } catch (err) {
      console.error('Failed to load admin projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const handleApprove = async (id, title) => {
    try {
      await api.approveProject(id);
      addToast(`"${title}" has been approved and is now active!`, 'success');
      fetchProjects();
    } catch (err) {
      addToast(err.message || 'Failed to approve project', 'error');
    }
  };

  const handleOpenReject = (project) => {
    setTargetProject(project);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!targetProject) return;
    try {
      await api.rejectProject(targetProject.id, rejectReason);
      addToast(`"${targetProject.title}" was rejected.`, 'info');
      setRejectModalOpen(false);
      fetchProjects();
    } catch (err) {
      addToast(err.message || 'Failed to reject project', 'error');
    }
  };

  const handleArchive = async (id, title) => {
    if (!confirm(`Are you sure you want to archive "${title}"?`)) return;
    try {
      await api.archiveProject(id);
      addToast(`"${title}" has been archived.`, 'info');
      fetchProjects();
    } catch (err) {
      addToast(err.message || 'Failed to archive project', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="glass-card relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2/10 text-secondary text-xs font-semibold border border-border/20">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span>{user?.institution?.name} • Lab Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-ivory tracking-tight">
              Manage & Moderate Projects
            </h1>
            <p className="text-xs sm:text-sm text-secondary">
              Review pending student proposals, approve ongoing lab initiatives, or archive inactive projects.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Projects in view', value: projects.length },
          { label: 'Pending in view', value: projects.filter((project) => project.status === 'pending').length },
          { label: 'Active in view', value: projects.filter((project) => project.status === 'active').length },
        ].map((stat) => (
          <div key={stat.label} className="ui-card flex items-center justify-between !p-4">
            <span className="text-sm text-secondary">{stat.label}</span>
            <span className="text-xl font-semibold text-accent">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-4">
        {[ 
          { key: 'all', label: 'All Projects' },
          { key: 'pending', label: 'Pending Review' },
          { key: 'active', label: 'Active Projects' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'archived', label: 'Archived' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === tab.key
                ? 'border-b-2 border-accent text-accent'
                : 'border-b-2 border-transparent text-secondary hover:text-ivory'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Table / Card List */}
      <div className="glass-card p-0 rounded-2xl border border-border overflow-hidden shadow-xl">
        {loading ? (
          <div className="space-y-3 p-6" aria-label="Loading projects">
            {[0, 1, 2, 3].map((row) => <div key={row} className="h-10 animate-pulse rounded-lg bg-surface-2" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Layers className="w-8 h-8 text-secondary mx-auto" />
            <div className="text-sm font-semibold text-secondary">No projects found</div>
            <p className="text-xs text-secondary">There are no projects with status: {statusFilter}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-xs font-semibold text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Lead / Owner</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs text-secondary">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-ivory max-w-xs">
                      <Link to={`/projects/${p.id}`} className="hover:text-accent-hover transition-colors">
                        {p.title}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-secondary">{p.owner?.fullName}</div>
                      <div className="text-xs text-secondary">{p.owner?.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-surface-2 border border-border text-xs text-secondary">
                        {p.domain}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'active'
                            ? 'bg-surface-2/15 text-secondary border border-border/30'
                            : p.status === 'pending'
                            ? 'bg-surface-2/15 text-secondary border border-border/30'
                            : p.status === 'rejected'
                            ? 'bg-surface-2/15 text-secondary border border-border/30'
                            : 'bg-surface-2 text-secondary'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-secondary text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id, p.title)}
                              className="glow-btn-primary px-3 py-1.5 text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(p)}
                              className="rounded-xl border border-error/70 bg-transparent px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {p.status === 'active' && (
                          <button
                            onClick={() => handleArchive(p.id, p.title)}
                            className="rounded-xl border border-error/70 bg-transparent px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10"
                          >
                            Archive
                          </button>
                        )}

                        <Link
                          to={`/projects/${p.id}`}
                          className="rounded-lg p-1 text-secondary hover:text-accent-hover"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl border border-border max-w-md w-full space-y-4">
            <h3 className="text-base font-heading font-semibold text-ivory flex items-center gap-2">
              <XCircle className="w-5 h-5 text-error" />
              <span>Reject Project: {targetProject?.title}</span>
            </h3>

            <p className="text-xs text-secondary">
              Provide feedback to the student owner explaining why this proposal requires changes or cannot be accepted.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Scope too broad, missing required safety protocol..."
              className="w-full p-3 rounded-xl bg-surface-2 border border-border text-xs text-ivory outline-none resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary glass-panel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="rounded-xl border border-error/70 px-4 py-2 text-xs font-semibold text-error transition-colors hover:bg-error/10"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
