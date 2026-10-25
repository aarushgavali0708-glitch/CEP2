import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import ProjectCard from '../../components/projects/ProjectCard';
import NotificationBell from '../../components/notifications/NotificationBell';
import { Compass, Search, Plus, Flame, Layers, LayoutDashboard, FolderKanban, UserRound, Bell, CircleUserRound } from 'lucide-react';

export default function DiscoverProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [sortBy, setSortBy] = useState('match');
  const domains = ['All Domains', 'Web Dev', 'ML/AI', 'Mobile', 'DevOps', 'Design', 'Blockchain'];

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      try {
        const res = await api.getProjects({ search: search.trim() || undefined, domain: domainFilter && domainFilter !== 'All Domains' ? domainFilter : undefined, sort: sortBy });
        if (res.projects) setProjects(res.projects);
      } catch (err) { console.error('Failed to load projects:', err); }
      finally { setLoading(false); }
    }
    const timer = setTimeout(fetchProjects, 250);
    return () => clearTimeout(timer);
  }, [search, domainFilter, sortBy]);

  const filteredProjects = projects.filter((project) => minScoreFilter <= 0 || (project.matchScore || 0) >= minScoreFilter);
  const recommendedProjects = [...projects].filter((project) => project.status === 'active' || project.status === 'pending').sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 5);
  const navigation = [
    { label: 'Discover', to: '/discover', icon: Compass, active: true },
    { label: 'My projects', to: '/my-projects', icon: FolderKanban },
    { label: 'Create project', to: '/projects/create', icon: Plus },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Profile', to: `/profile/${user?.id || ''}`, icon: UserRound },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] bg-bg">
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col border-r border-border bg-bg px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2"><LayoutDashboard className="h-4 w-4 text-accent" /></span><span className="font-heading text-sm font-semibold text-ivory">Workspace</span></div>
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-secondary">Menu</p>
        <nav className="space-y-1" aria-label="Student navigation">
          {navigation.map(({ label, to, icon: Icon, active }) => <Link key={label} to={to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? 'border-l-2 border-accent text-accent' : 'text-secondary hover:bg-surface-2 hover:text-ivory'}`}><Icon className="h-4 w-4" />{label}</Link>)}
        </nav>
        <div className="mt-auto rounded-xl border border-border bg-surface p-3"><p className="text-xs font-medium text-ivory">{user?.institution?.name || 'Your campus'}</p><p className="mt-1 text-xs text-secondary">Private student community</p></div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 lg:hidden" aria-label="Student navigation">
          {navigation.map(({ label, to, icon: Icon, active }) => <Link key={label} to={to} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs ${active ? 'text-accent' : 'text-secondary hover:text-ivory'}`}><Icon className="h-3.5 w-3.5" />{label}</Link>)}
        </nav>

        <header className="sticky top-16 z-20 mb-8 flex items-center gap-3 border-b border-border bg-bg/95 py-3 backdrop-blur lg:top-16">
          <label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects and skills" className="ui-input h-10 pl-10 pr-4 text-sm" /></label>
          <NotificationBell />
          <Link to={`/profile/${user?.id || ''}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-secondary" aria-label="Open profile"><CircleUserRound className="h-5 w-5" /></Link>
        </header>

        <div className="space-y-10">
          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{user?.institution?.name || 'Campus'} marketplace</p><h1 className="font-heading text-3xl font-semibold tracking-tight text-ivory sm:text-2xl">Discover projects</h1><p className="max-w-2xl text-sm leading-relaxed text-secondary">Explore open roles and find a team where your skills can make a difference.</p></div>
            <Link to="/projects/create" className="glow-btn-primary inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-sm"><Plus className="h-4 w-4" />Post a project</Link>
          </section>

          {!loading && recommendedProjects.length > 0 && !search && !domainFilter && <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent"><Flame className="h-4 w-4" />Curated matches</p><h2 className="font-heading text-xl font-semibold text-ivory">Recommended for you</h2></div><span className="text-xs text-secondary">Ranked by your project fit</span></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recommendedProjects.slice(0, 3).map((project) => <ProjectCard key={project.id} project={project} />)}</div>
          </section>}

          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary">Explore</p><h2 className="font-heading text-xl font-semibold text-ivory">All projects</h2></div><span className="text-xs text-secondary">{filteredProjects.length} projects</span></div>
            <div className="flex flex-wrap gap-2">
              <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} className="ui-select h-10 w-auto px-3 text-xs">{domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select>
              <select value={minScoreFilter} onChange={(event) => setMinScoreFilter(parseInt(event.target.value, 10))} className="ui-select h-10 w-auto px-3 text-xs"><option value={0}>All match scores</option><option value={75}>Strong match (75%+)</option><option value={50}>Good match (50%+)</option></select>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="ui-select h-10 w-auto px-3 text-xs"><option value="match">Best match</option><option value="latest">Newest</option></select>
            </div>
            {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="glass-card animate-pulse space-y-4"><div className="ui-skeleton h-4 w-24" /><div className="ui-skeleton h-6 w-3/4" /><div className="ui-skeleton h-12 w-full" /></div>)}</div> : filteredProjects.length === 0 ? <div className="glass-card space-y-3 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-surface-2"><Layers className="h-5 w-5 text-secondary" /></div><h3 className="font-heading text-lg font-semibold text-ivory">No projects match your search</h3><p className="mx-auto max-w-sm text-sm text-secondary">Try another keyword or clear the filters to see more projects.</p><Link to="/projects/create" className="glow-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"><Plus className="h-4 w-4" />Create a project</Link></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
