import { Link } from 'react-router-dom';
import {
  GraduationCap, FileSearch, Target, Map, Code2, Video, Bell, Zap, ArrowRight, CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  { icon: FileSearch, title: 'AI Resume Analysis', desc: 'Upload your resume — a background AI worker extracts skills, scores placement readiness and gives actionable feedback.' },
  { icon: Target, title: 'Transparent Skill Gap', desc: 'Paste any job description. See exactly which required skills you have and which you need — no mystery AI scores.' },
  { icon: Map, title: 'Personalized Roadmap', desc: 'A prioritized, week-by-week preparation plan generated from your gaps, target role and DSA weak areas.' },
  { icon: Code2, title: 'DSA Progress Tracking', desc: 'Log problems you solve, get per-topic strength scores and let the platform point you at your weakest topics.' },
  { icon: Video, title: 'Live AI Mock Interviews', desc: 'Realtime interviewer over WebSockets — resume, OOP, DSA, SQL, backend, LLD and system-design rounds with follow-ups.' },
  { icon: Bell, title: 'Event-Driven Notifications', desc: 'Analysis completions, interview reports and task milestones arrive instantly through a queue-backed notification service.' },
];

const ARCH = [
  ['React frontend', 'Modern SPA with live WebSocket interview room'],
  ['Express API', 'JWT auth, validation, rate limiting, pagination'],
  ['MongoDB', 'Indexed schemas for profiles, jobs, plans, transcripts'],
  ['Redis', 'Cache for reusable AI answers + BullMQ job queues'],
  ['AI Worker', 'Separate process: resumes, gaps, roadmaps, reports'],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <GraduationCap size={20} />
          </div>
          <span className="text-lg font-bold">CareerPilot AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">Sign in</Link>
          <Link to="/register" className="btn-primary">Get started <ArrowRight size={16} /></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-brand-300">
          <Zap size={14} /> Built for 3rd & 4th year CS/IT students
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Your personal copilot for{' '}
          <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">placements & interviews</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Not another LeetCode clone. CareerPilot analyzes your resume and target jobs, finds your real skill gaps,
          builds a personalized roadmap, tracks your DSA progress and runs live AI mock interviews.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary !px-6 !py-3 !text-base">Start preparing free <ArrowRight size={18} /></Link>
          <a href="#how" className="btn-secondary !border-white/20 !bg-transparent !text-slate-200 !px-6 !py-3 !text-base hover:!bg-white/10">See how it works</a>
        </div>

        {/* Flow strip */}
        <div id="how" className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {['Upload resume', 'Pick target job', 'Get gap + roadmap', 'Mock interview & report'].map((step, i) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold">{i + 1}</div>
              <div className="font-medium text-slate-200">{step}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 bg-slate-900/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold">Everything placement season throws at you</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">
            One platform that knows your profile, understands the job, and tells you exactly what to do next.
          </p>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-brand-500/40">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300">
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold">Real system design, not decoration</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
            Every component exists for a reason — queues for slow LLM work, cache for reusable answers,
            WebSockets for live interviews, events for decoupled notifications.
          </p>
          <div className="mt-12 space-y-3">
            {ARCH.map(([name, why]) => (
              <div key={name} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <CheckCircle2 className="shrink-0 text-emerald-400" size={20} />
                <div>
                  <span className="font-semibold">{name}</span>
                  <span className="ml-2 text-sm text-slate-400">{why}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20 text-center">
        <h2 className="text-3xl font-bold">Placement season waits for nobody.</h2>
        <p className="mt-3 text-slate-400">Create your profile, upload your resume, and get your first roadmap in minutes.</p>
        <Link to="/register" className="btn-primary mt-8 inline-flex !px-8 !py-3.5 !text-base">Create free account <ArrowRight size={18} /></Link>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        CareerPilot AI — a MERN + GenAI major project. React · Node · MongoDB · Redis · WebSockets · LLM.
      </footer>
    </div>
  );
}
