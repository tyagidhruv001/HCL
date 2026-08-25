import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STACK = [
  {
    layer: 'Frontend',
    color: '#60a5fa',
    tech: 'React 18 + Vite',
    detail: 'HashRouter SPA with context-based auth, profile, and toast state. No UI framework — vanilla CSS design system.',
    items: ['React 18', 'Vite 5', 'React Router v6', 'Chart.js', 'Vanilla CSS'],
  },
  {
    layer: 'Backend',
    color: '#34d399',
    tech: 'Spring Boot 3',
    detail: 'REST API with JWT stateless auth, Hibernate ORM, and a delegating AI proxy that routes to the ML service first.',
    items: ['Spring Boot 3.3', 'Spring Security', 'Hibernate / JPA', 'HikariCP', 'RestClient'],
  },
  {
    layer: 'ML Service',
    color: '#a78bfa',
    tech: 'FastAPI + Python',
    detail: 'Autonomous agent with a ReAct tool-calling loop. Runs entirely offline via a deterministic intent engine. Ollama optional.',
    items: ['FastAPI', 'Uvicorn', 'Scikit-learn', 'Pandas', 'httpx'],
  },
  {
    layer: 'Database',
    color: '#fb923c',
    tech: 'PostgreSQL 18',
    detail: 'Hosted on Neon (serverless). Stores users, profiles, roadmaps, progress, study sessions, and chat history.',
    items: ['Neon Serverless', 'PostgreSQL 18', 'pgvector (planned)', 'Hibernate DDL', 'HikariPool'],
  },
];

const ARCHITECTURE = [
  { label: 'User Request', desc: 'Chat message from browser', color: '#60a5fa' },
  { label: 'Spring Boot', desc: 'Auth → route to AI proxy', color: '#34d399' },
  { label: 'ML Agent (8000)', desc: 'ReAct loop + tool dispatch', color: '#a78bfa' },
  { label: 'Tools', desc: 'YouTube, courses, planner, roadmap', color: '#f59e0b' },
  { label: 'Response', desc: 'Structured markdown back to UI', color: '#60a5fa' },
];

const TOOLS = [
  { name: 'search_youtube', desc: 'TTL-cached YouTube query for tutorials' },
  { name: 'search_web', desc: 'Educational article search with caching' },
  { name: 'search_courses', desc: 'Query verified 49-course catalog' },
  { name: 'explain_topic', desc: 'Structured concept breakdown with analogies' },
  { name: 'create_daily_plan', desc: 'Time-boxed study schedule from available hours' },
  { name: 'get_user_progress', desc: 'Fetch streak, completion % from DB' },
  { name: 'get_current_roadmap', desc: 'Load active 3-phase curriculum' },
  { name: 'generate_roadmap', desc: 'Run Knowledge Graph + Skill Gap engine' },
  { name: 'get_user_profile', desc: 'Retrieve learner goals and level' },
  { name: 'propose_roadmap_action', desc: 'Safe mutation via Spring Boot gateway' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeStack, setActiveStack] = useState(0);

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: '#fff' }}>
            I<span style={{ color: '#818cf8' }}>&</span>AI
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.5px' }}>v1.0</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}>
            Sign In
          </button>
          <button onClick={() => navigate('/register')} style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
            onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}>
            Get Started →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '96px 32px 72px' }}>
        <div style={{ display: 'inline-block', fontSize: '12px', color: '#818cf8', border: '1px solid rgba(129,140,248,0.3)', padding: '4px 14px', borderRadius: '20px', marginBottom: '28px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Open-source · Self-hostable · No vendor lock-in
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', color: '#f8fafc', margin: '0 0 24px' }}>
          I<span style={{ color: '#818cf8' }}>&</span>AI — Intelligent &amp; Adaptive<br />
          <span style={{ color: '#475569' }}>Learning Platform</span>
        </h1>
        <p style={{ fontSize: '17px', color: '#94a3b8', lineHeight: 1.7, maxWidth: '620px', margin: '0 0 40px' }}>
          An agentic AI learning system built on a decoupled microservices architecture.
          React frontend, Spring Boot API gateway, Python ML agent with ReAct tool-calling,
          and a PostgreSQL knowledge store — all running locally or on free cloud tiers.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '12px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}>
            Start Learning
          </button>
          <button onClick={() => document.getElementById('architecture').scrollIntoView({ behavior: 'smooth' })} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '12px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
            How it works ↓
          </button>
        </div>

        {/* quick stat bar */}
        <div style={{ display: 'flex', gap: '40px', marginTop: '64px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
          {[['49', 'Verified Courses'], ['10', 'Agent Tools'], ['3', 'Microservices'], ['0', 'API Key Required']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px' }}>{n}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>System Design</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Request Flow</h2>
          <p style={{ color: '#64748b', marginBottom: '48px', fontSize: '14px' }}>Every chat message traverses this pipeline. No black boxes.</p>

          {/* pipeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap', rowGap: '16px', marginBottom: '64px' }}>
            {ARCHITECTURE.map((step, i) => (
              <React.Fragment key={step.label}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${step.color}30`, borderRadius: '10px', padding: '16px 20px', minWidth: '140px' }}>
                  <div style={{ fontSize: '12px', color: step.color, fontWeight: 600, marginBottom: '4px' }}>{step.label}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{step.desc}</div>
                </div>
                {i < ARCHITECTURE.length - 1 && (
                  <div style={{ color: '#334155', fontSize: '18px', padding: '0 6px' }}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* LLM strategy box */}
          <div style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '28px 32px', marginBottom: '64px' }}>
            <div style={{ fontSize: '13px', color: '#a78bfa', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px' }}>AGENT INTELLIGENCE STRATEGY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {[
                { tier: '1st', label: 'Local Ollama', note: 'Qwen / Gemma / DeepSeek — zero API cost, full privacy', color: '#34d399' },
                { tier: '2nd', label: 'Gemini API', note: 'Cloud fallback when local model is unavailable', color: '#60a5fa' },
                { tier: '3rd', label: 'Built-in Engine', note: 'Deterministic rule-based agent — always works, no dependencies', color: '#f59e0b' },
              ].map(t => (
                <div key={t.tier}>
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>TIER {t.tier}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: t.color, marginBottom: '4px' }}>{t.label}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{t.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 48px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Tech Stack</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '0 0 40px', letterSpacing: '-0.5px' }}>Every Layer, Explained</h2>

          {/* tab selector */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
            {STACK.map((s, i) => (
              <button key={s.layer} onClick={() => setActiveStack(i)} style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s', background: activeStack === i ? 'rgba(255,255,255,0.08)' : 'transparent', color: activeStack === i ? s.color : '#64748b' }}>
                {s.layer}
              </button>
            ))}
          </div>

          {/* active panel */}
          {STACK.map((s, i) => i === activeStack && (
            <div key={s.layer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.color, marginBottom: '8px' }}>{s.tech}</div>
                <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px' }}>{s.detail}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {s.items.map(item => (
                    <span key={item} style={{ fontSize: '12px', color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30`, padding: '4px 12px', borderRadius: '6px', fontFamily: 'monospace' }}>{item}</span>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
                {s.layer === 'Frontend' && <>
                  <div style={{ color: '#64748b', marginBottom: '12px' }}># Component architecture</div>
                  <div style={{ color: '#94a3b8' }}>AuthContext → ProfileContext → ToastContext</div>
                  <div style={{ color: '#94a3b8', marginTop: '6px' }}>HashRouter (no server config needed)</div>
                  <div style={{ color: '#94a3b8', marginTop: '6px' }}>ChatAPI → Spring Boot → ML Agent</div>
                </>}
                {s.layer === 'Backend' && <>
                  <div style={{ color: '#64748b', marginBottom: '12px' }}># Request chain</div>
                  <div style={{ color: '#94a3b8' }}>JWT filter → controller → service</div>
                  <div style={{ color: '#94a3b8', marginTop: '6px' }}>AiProxyService delegates to:</div>
                  <div style={{ color: '#34d399', marginTop: '4px', paddingLeft: '12px' }}>1. ML Agent (port 8000)</div>
                  <div style={{ color: '#60a5fa', paddingLeft: '12px' }}>2. Gemini API</div>
                  <div style={{ color: '#f59e0b', paddingLeft: '12px' }}>3. Demo fallback</div>
                </>}
                {s.layer === 'ML Service' && <>
                  <div style={{ color: '#64748b', marginBottom: '12px' }}># Agent loop (max 4 turns)</div>
                  <div style={{ color: '#94a3b8' }}>user_msg → LLM/engine → tool_calls[]</div>
                  <div style={{ color: '#94a3b8', marginTop: '6px' }}>→ execute tools → append results</div>
                  <div style={{ color: '#94a3b8', marginTop: '6px' }}>→ synthesize markdown response</div>
                  <div style={{ color: '#a78bfa', marginTop: '8px' }}>10 registered tools</div>
                </>}
                {s.layer === 'Database' && <>
                  <div style={{ color: '#64748b', marginBottom: '12px' }}># Schema (Hibernate auto-DDL)</div>
                  <div style={{ color: '#94a3b8' }}>users, learner_profiles</div>
                  <div style={{ color: '#94a3b8', marginTop: '4px' }}>courses (49 seeded)</div>
                  <div style={{ color: '#94a3b8', marginTop: '4px' }}>roadmaps, roadmap_phases</div>
                  <div style={{ color: '#94a3b8', marginTop: '4px' }}>progress, study_sessions</div>
                  <div style={{ color: '#94a3b8', marginTop: '4px' }}>chat_sessions, chat_messages</div>
                </>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AGENT TOOLS */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Agent Capabilities</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px', letterSpacing: '-0.5px' }}>10 Registered Tools</h2>
          <p style={{ color: '#64748b', marginBottom: '40px', fontSize: '14px' }}>The agent decides which tools to call based on intent — no hardcoded routing.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {TOOLS.map(tool => (
              <div key={tool.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#c4b5fd', marginBottom: '4px' }}>{tool.name}()</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{tool.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px', margin: '0 0 16px' }}>
            Ready to start?
          </h2>
          <p style={{ color: '#64748b', marginBottom: '36px', lineHeight: 1.6 }}>
            Create an account, complete a 2-minute profile, and the agent generates your personalized roadmap.
          </p>
          <button onClick={() => navigate('/register')} style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '14px 36px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 600, marginRight: '12px' }}>
            Create Account
          </button>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', padding: '14px 36px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>
            Sign In
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>I<span style={{ color: '#4f46e5' }}>&</span>AI</span>
        <span style={{ fontSize: '12px', color: '#334155' }}>React · Spring Boot · FastAPI · PostgreSQL · Built with intent, not hype.</span>
      </footer>

    </div>
  );
}
