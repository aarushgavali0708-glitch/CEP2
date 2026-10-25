import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Bell, Cpu, Layers, Lightbulb, Search, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import TeamNodesCanvas from '../../components/layout/TeamNodesCanvas';

const stats = [
  { label: 'Active projects', value: '10+', icon: Layers },
  { label: 'Students matched', value: '13+', icon: Users },
  { label: 'Skills indexed', value: '53', icon: Cpu },
  { label: 'Average match', value: '88%', icon: Target },
];

const steps = [
  { number: '01', title: 'Build your profile', description: 'Share your skills, interests, and availability so teams can see what you bring.' },
  { number: '02', title: 'Find your project', description: 'Explore campus projects ranked by how well your strengths match each open role.' },
  { number: '03', title: 'Make it together', description: 'Join a team workspace, coordinate the work, and bring a real idea to life.' },
];

const features = [
  { icon: Search, title: 'Relevant discovery', description: 'Find active projects and open roles that fit your skills and interests.' },
  { icon: Target, title: 'Clear match scores', description: 'Understand how skills, interests, credibility, and time shape your fit.' },
  { icon: Users, title: 'Teams with purpose', description: 'Bring students with complementary strengths into the same project.' },
  { icon: Layers, title: 'A shared workspace', description: 'Track tasks, milestones, announcements, and team conversations together.' },
  { icon: Bell, title: 'Useful updates', description: 'Keep applications, invitations, and project activity in one place.' },
  { icon: Award, title: 'Visible contribution', description: 'Build a record of the work you complete with your campus teams.' },
];

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <section className="relative min-h-[78vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <TeamNodesCanvas />
        <div aria-hidden="true" className="absolute left-1/2 top-[42%] -z-10 h-[440px] w-[min(80vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[150px]" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="relative z-10 mx-auto max-w-4xl space-y-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-2 text-xs font-medium text-secondary">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Campus projects, built together</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-ivory sm:text-3xl lg:text-3xl lg:leading-[1.08]">
            Find your people.<br className="hidden sm:block" /> Build what matters.
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-secondary sm:text-lg">
            Find projects that match your skills. Build teams that make things happen.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Link to="/register" className="glow-btn-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm sm:w-auto">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="ui-button-secondary inline-flex w-full items-center justify-center px-6 py-3 text-sm sm:w-auto">
              Sign in
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 pt-2 text-xs text-secondary"><ShieldCheck className="h-4 w-4 text-accent" />Campus email verification and institution-scoped teams</div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8" aria-label="TeamConnect at a glance">
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }, index) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="flex items-center gap-3 border-border p-5 sm:p-6 [&:nth-child(odd)]:border-r [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0 sm:[&:not(:last-child)]:border-r">
              <Icon className="h-4 w-4 shrink-0 text-accent" />
              <div><div className="font-heading text-xl font-semibold text-ivory">{value}</div><div className="text-xs text-secondary">{label}</div></div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 sm:py-28">
        <div className="mb-12 max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">How it works</p>
          <h2 className="font-heading text-3xl font-semibold text-ivory sm:text-2xl">From skills to shared progress.</h2>
          <p className="text-sm leading-relaxed text-secondary">A clear path from finding a team to finishing work you can be proud of.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => <article key={step.number} className="glass-card space-y-8">
            <span className="text-xs font-semibold tracking-widest text-accent">{step.number}</span>
            <div className="space-y-2"><h3 className="font-heading text-lg font-semibold text-ivory">{step.title}</h3><p className="text-sm leading-relaxed text-secondary">{step.description}</p></div>
          </article>)}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 sm:py-28">
        <div className="mb-12 max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Made for campus teams</p>
          <h2 className="font-heading text-3xl font-semibold text-ivory sm:text-2xl">Everything you need to move forward.</h2>
          <p className="text-sm leading-relaxed text-secondary">Find the right collaborators, stay aligned, and make each contribution visible.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, index) => <motion.article key={title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (index % 3) * 0.06 }} className="glass-card space-y-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2"><Icon className="h-5 w-5 text-accent" /></div>
            <div className="space-y-2"><h3 className="font-heading text-base font-semibold text-ivory">{title}</h3><p className="text-sm leading-relaxed text-secondary">{description}</p></div>
          </motion.article>)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 sm:pb-32">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="space-y-2"><h2 className="font-heading text-2xl font-semibold text-ivory">Your next project starts here.</h2><p className="text-sm text-secondary">Bring your skills to a team that needs them.</p></div>
          <Link to="/register" className="glow-btn-primary inline-flex shrink-0 items-center gap-2 px-5 py-3 text-sm">Create your account <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  );
}
