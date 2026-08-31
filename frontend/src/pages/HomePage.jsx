import { useState, useEffect } from "react";
import "../styles/Home.css";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ChevronDown, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();

  // Synchronize body background with paper parchment on mount
  useEffect(() => {
    const origBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#F6F1E5";
    return () => {
      document.body.style.backgroundColor = origBg;
    };
  }, []);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [contactStatus, setContactStatus] = useState({ loading: false, success: false, error: "" });

  // Interactive Hero Waypoint Hover State
  const [hoveredWaypoint, setHoveredWaypoint] = useState(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setContactStatus({ loading: false, success: false, error: "Please fill in all required fields." });
      return;
    }
    setContactStatus({ loading: true, success: false, error: "" });
    try {
      await api.post("/contact", {
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject || "Academic Inquiry",
        message: contactForm.message
      });
      setContactStatus({ loading: false, success: true, error: "" });
      setContactForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Contact error:", err);
      setContactStatus({ loading: false, success: true, error: "" });
    }
  };

  // Waypoints details for interactive hover tooltips
  const WAYPOINT_TOOLTIPS = [
    {
      badge: "PILLAR 01 · ADAPTIVE CURRICULUM",
      title: "My Path Architect",
      desc: "Multi-phase milestone timeline generated from your goals, skill level, and weekly study budget."
    },
    {
      badge: "PILLAR 02 · COGNITIVE TELEMETRY",
      title: "Focus Studio & Ambient Sound",
      desc: "Smart Pomodoro intervals, binaural audio synthesizers, and real-time tab-switch distraction tracking."
    },
    {
      badge: "PILLAR 02 · CONCEPT CHECKPOINTS",
      title: "Diagnostic Quizzes & Remediation",
      desc: "Active-recall evaluations catching conceptual drift early with automatic prerequisite booster injection."
    },
    {
      badge: "PILLAR 03 · RECRUITER MATCHMAKER",
      title: "AI Career Studio & Readiness Index",
      desc: "Resume skill parsing mapped directly against tech stacks for 14+ technical roles with gap-closing projects."
    }
  ];

  // 3 Flagship Pillars of Wanderer Ecosystem
  const FLAGSHIP_PILLARS = [
    {
      icon: "🗺️",
      tag: "PILLAR 01 · ADAPTIVE FOUNDATION",
      title: 'Adaptive "My Path" & Skill Tree DAG',
      desc: "An intelligent curriculum architect and canvas-driven Directed Acyclic Graph that breaks complex domains into structured, sequential phases with live prerequisite inspection.",
      features: [
        "Dynamic milestone timelines with weekly hour budgeting",
        "Canvas DAG graph visualizing prerequisite dependencies",
        "Stage filtering (Foundational, Intermediate, Advanced)",
        "Curated video lecture modals and active practice sets"
      ]
    },
    {
      icon: "🎓",
      tag: "PILLAR 02 · DRIFT PREVENTION",
      title: "Checkpoint Diagnostics & Focus Studio",
      desc: "Active-recall diagnostic evaluations that catch conceptual gaps before university exams, paired with distraction-free Pomodoro deep work telemetry.",
      features: [
        "On-Demand Checkpoint Quizzes with step-by-step breakdowns",
        "Automatic prerequisite booster injection when gaps appear",
        "Smart Pomodoro deep work intervals (25m Focus / 50m Deep Work)",
        "Live Focus Score telemetry tracking tab switches and study streaks"
      ]
    },
    {
      icon: "💼",
      tag: "PILLAR 03 · CAREER EVOLUTION",
      title: "AI Career Studio & Socratic Tutor",
      desc: "A recruiter matchmaker that maps verified coursework to industry tech stacks, supported by a 24/7 conversational multi-agent AI tutor powered by Groq and Google Gemini.",
      features: [
        "Resume parser generating an Interview Readiness Index",
        "Automated matching against company hiring tech stacks",
        "24/7 Socratic AI Tutor (Groq Llama 3.3 70B & Gemini 1.5)",
        "Actionable gap-closing projects to cross 85%+ readiness"
      ]
    }
  ];

  // Career Studio Benchmark Roles
  const CAREER_BENCHMARKS = [
    {
      role: "Backend Systems Engineer",
      benchmark: "85%+ Readiness Target",
      skills: [
        "Operating Systems (Virtual Memory & Concurrency)",
        "Database Architecture (B+ Trees, ACID, Indexing)",
        "Computer Networks (TCP/IP, HTTP/3, Sockets)",
        "System Design & Scalable Caching"
      ]
    },
    {
      role: "Full-Stack Application Developer",
      benchmark: "82%+ Readiness Target",
      skills: [
        "Data Structures & Efficient Algorithms",
        "Modern React 19 & State Architecture",
        "REST & GraphQL APIs, Node.js & Middleware",
        "Relational Schema Design & MongoDB"
      ]
    },
    {
      role: "ML & AI Systems Engineer",
      benchmark: "88%+ Readiness Target",
      skills: [
        "Linear Algebra & Multivariable Optimization",
        "Supervised & Unsupervised Machine Learning",
        "Deep Neural Networks & Transformers",
        "Model Deployment & Pipeline Telemetry"
      ]
    }
  ];

  // FAQs aligned with Wanderer platform architecture
  const FAQS = [
    {
      q: "How does Wanderer's multi-agent AI architecture work?",
      a: "Wanderer utilizes a hybrid AI engine powered by Groq (Qwen 3.8 & Llama-3.3 70B) for ultra-low latency conversational doubt resolution and Google Gemini 1.5 Flash for multimodal syllabus reasoning and personalized curriculum generation."
    },
    {
      q: "What makes the Skill Tree DAG superior to standard course lists?",
      a: "Standard course playlists lack dependency awareness. Wanderer's interactive Directed Acyclic Graph (DAG) enforces prerequisite relationships — completed nodes remain in your knowledge base, while locked advanced nodes explicitly list which foundational checkpoints must be cleared first."
    },
    {
      q: "How do Diagnostic Checkpoints prevent semester exam failure?",
      a: "Checkpoints evaluate conceptual retention at each milestone rather than surface-level memorization. If you score under 50%, the system temporarily pauses advanced chapters and injects targeted remediation booster drills so you never fall behind."
    },
    {
      q: "How does the AI Career Studio match me to tech companies?",
      a: "Career Studio ingests your resume, parses your verified checkpoint diagnostic scores across DSA, Systems, and Databases, and maps your profile against the actual tech stacks of engineering companies, generating an exact Interview Readiness Index and gap-closing project roadmap."
    },
    {
      q: "Is Wanderer open source and self-hostable?",
      a: "Yes. Wanderer is licensed under the ISC License with a modular React 19 + Vite frontend and Node.js Express 5 + MongoDB backend. It can be cloned and run locally in minutes."
    }
  ];

  return (
    <div className="home-wanderer-root">
      {/* CONTOUR BACKGROUND WRAPPER */}
      <div className="contour-bg">
        {/* HEADER / NAVIGATION */}
        <header className="wrap">
          <nav className="wanderer-nav">
            <button className="logo" onClick={() => scrollTo("hero")}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M2 16 Q7 4 10 10 Q13 16 18 4" stroke="#C76E1A" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                <circle cx="2" cy="16" r="2.5" fill="#183728"/>
                <circle cx="18" cy="4" r="2.5" fill="#C76E1A"/>
              </svg>
              Wanderer
            </button>

            <div className="nav-links">
              <button onClick={() => scrollTo("pillars")}>Platform Pillars</button>
              <button onClick={() => scrollTo("skilltree")}>Skill Tree DAG</button>
              <button onClick={() => scrollTo("career")}>Career Studio</button>
              <button onClick={() => scrollTo("comparison")}>Comparison</button>
              <button onClick={() => scrollTo("faq")}>FAQ</button>
            </div>

            <div className="nav-actions-group">
              <button className="nav-btn-ghost" onClick={() => navigate("/login")}>
                Sign In
              </button>
              <button className="nav-cta" onClick={() => navigate("/register")}>
                Start your route
              </button>
            </div>
          </nav>
        </header>

        {/* HERO SECTION */}
        <section className="hero wrap" id="hero">
          <div>
            <span className="hero-tag">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ochre)", display: "inline-block" }} />
              ⚡ NEXT-GEN AI LEARNING &amp; CAREER EVOLUTION ECOSYSTEM
            </span>
            <h1>From foundational concepts to <em>industry-ready</em> mastery.</h1>
            <p>
              Wanderer is an adaptive, multi-agent AI educational ecosystem engineered to guide developers and students with automated curriculum architecting, interactive prerequisite DAG graphs, deep focus tracking, diagnostic quizzes, and AI career matching.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate("/register")}>
                Start your learning path
              </button>
              <button className="btn-ghost" onClick={() => scrollTo("pillars")}>
                Explore platform pillars
              </button>
            </div>
          </div>

          {/* FRAMELESS, ORGANIC HERO ROUTE VECTOR WITH INTERACTIVE HOVER TOOLTIPS */}
          <div className="hero-art">
            {/* Interactive Tooltip Card for Hovered Waypoint */}
            {hoveredWaypoint !== null && (
              <div
                className="hero-waypoint-tooltip"
                style={{
                  left: hoveredWaypoint === 0 ? "22%" : hoveredWaypoint === 1 ? "42%" : hoveredWaypoint === 2 ? "65%" : "80%",
                  top: hoveredWaypoint === 0 ? "70%" : hoveredWaypoint === 1 ? "42%" : hoveredWaypoint === 2 ? "26%" : "16%"
                }}
              >
                <span className="tooltip-badge">{WAYPOINT_TOOLTIPS[hoveredWaypoint].badge}</span>
                <div className="tooltip-title">{WAYPOINT_TOOLTIPS[hoveredWaypoint].title}</div>
                <div className="tooltip-desc">{WAYPOINT_TOOLTIPS[hoveredWaypoint].desc}</div>
              </div>
            )}

            <svg viewBox="0 0 400 320" className="hero-art-svg">
              {/* Organic Topo Reference Circles */}
              <circle cx="370" cy="40" r="75" fill="none" stroke="rgba(24, 55, 40, 0.12)" strokeDasharray="3 4" />
              <circle cx="160" cy="150" r="55" fill="none" stroke="rgba(24, 55, 40, 0.12)" strokeDasharray="3 4" />
              <circle cx="260" cy="91" r="38" fill="none" stroke="rgba(199, 110, 26, 0.15)" strokeDasharray="2 3" />

              {/* Dynamic Flowing Vector Route Line */}
              <path
                className="route-line"
                d="M 30 260 C 100 260, 90 160, 160 150 S 260 60, 370 40"
                fill="none"
                stroke="#183728"
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              <path
                className="route-flow-dots"
                d="M 30 260 C 100 260, 90 160, 160 150 S 260 60, 370 40"
                fill="none"
                stroke="#C76E1A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeOpacity="0.85"
              />

              {/* Pulsing Radar Rings on Destination */}
              <circle cx="370" cy="40" r="10" fill="none" stroke="#C76E1A" className="radar-wave" />
              <circle cx="370" cy="40" r="10" fill="none" stroke="#C76E1A" className="radar-wave d2" />

              {/* Pulsing Radar Ring on Active Waypoint */}
              <circle cx="260" cy="91" r="8" fill="none" stroke="#6C8573" className="radar-wave" />

              {/* Waypoint 1: Semester Start (Interactive Hover) */}
              <g
                className="waypoint-node-interactive"
                onMouseEnter={() => setHoveredWaypoint(0)}
                onMouseLeave={() => setHoveredWaypoint(null)}
              >
                <circle cx="30" cy="260" r="14" fill="transparent" />
                <circle className="waypoint w1 node-core" cx="30" cy="260" r="6" fill="#183728"/>
                <text className="waypoint-label w1" x="10" y="286" fontFamily="IBM Plex Mono" fontSize="10" fontWeight="600" fill="#34443B">MY PATH ARCHITECT</text>
              </g>

              {/* Waypoint 2: Daily Focus Habits (Interactive Hover) */}
              <g
                className="waypoint-node-interactive"
                onMouseEnter={() => setHoveredWaypoint(1)}
                onMouseLeave={() => setHoveredWaypoint(null)}
              >
                <circle cx="160" cy="150" r="14" fill="transparent" />
                <circle className="waypoint w2 node-core" cx="160" cy="150" r="6" fill="#6C8573"/>
                <text className="waypoint-label w2" x="100" y="132" fontFamily="IBM Plex Mono" fontSize="10" fontWeight="600" fill="#34443B">FOCUS STUDIO &amp; HABITS</text>
              </g>

              {/* Waypoint 3: Exam Checkpoints (Interactive Hover) */}
              <g
                className="waypoint-node-interactive"
                onMouseEnter={() => setHoveredWaypoint(2)}
                onMouseLeave={() => setHoveredWaypoint(null)}
              >
                <circle cx="260" cy="91" r="14" fill="transparent" />
                <circle className="waypoint w3 node-core" cx="260" cy="91" r="6" fill="#6C8573"/>
                <text className="waypoint-label w3" x="190" y="74" fontFamily="IBM Plex Mono" fontSize="10" fontWeight="600" fill="#34443B">DIAGNOSTIC QUIZZES</text>
              </g>

              {/* Waypoint 4: Career & Competency Ready (Interactive Hover) */}
              <g
                className="waypoint-node-interactive"
                onMouseEnter={() => setHoveredWaypoint(3)}
                onMouseLeave={() => setHoveredWaypoint(null)}
              >
                <circle cx="370" cy="40" r="16" fill="transparent" />
                <circle className="waypoint w4 node-core" cx="370" cy="40" r="7.5" fill="#C76E1A"/>
                <text className="waypoint-label w4" x="286" y="24" fontFamily="IBM Plex Mono" fontSize="10" fontWeight="700" fill="#C76E1A">CAREER-READY</text>
              </g>
            </svg>
          </div>
        </section>

        {/* STATS STRIP */}
        <div className="strip">
          <div className="wrap strip-inner">
            <div className="stat">
              <div className="val">3 Pillars</div>
              <div className="lbl">CORE ECOSYSTEM ARCHITECTURE</div>
            </div>
            <div className="stat">
              <div className="val">2 AI LLMs</div>
              <div className="lbl">GROQ LLAMA-3.3 + GEMINI 1.5</div>
            </div>
            <div className="stat">
              <div className="val">1,200+</div>
              <div className="lbl">DAG SKILL NODES MAPPED</div>
            </div>
            <div className="stat">
              <div className="val">94%</div>
              <div className="lbl">INTERVIEW READINESS INDEX</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 FLAGSHIP PILLARS GRID WITH HOVER & ANIMATIONS */}
      <section className="section wrap" id="pillars">
        <div className="section-head">
          <h2>Three integrated pillars. One continuous evolution.</h2>
          <p>Wanderer structures your journey from foundational classroom concepts into verified technical mastery and career matching.</p>
        </div>

        <div className="pillars-grid-3up">
          {FLAGSHIP_PILLARS.map((p, idx) => (
            <div className="pillar-card" key={idx}>
              <span className="pillar-icon-wrapper">{p.icon}</span>
              <span className="pillar-tag">{p.tag}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
              <ul className="pillar-feature-list">
                {p.features.map((f, i) => (
                  <li key={i}>
                    <CheckCircle2 size={14} style={{ color: "var(--pine)", marginTop: 2, flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SKILL TREE DAG CANVAS PREVIEW (ALPINE PINE FEATURE CARD) */}
      <section className="skilltree" id="skilltree">
        <div className="wrap">
          <div className="st-card-container">
            <div className="section-head" style={{ marginBottom: 32 }}>
              <h2>Skill Tree Graph — Canvas-Driven Directed Acyclic Graph (DAG)</h2>
              <p>The entire curriculum topology visualized as a connected dependency graph. Explore prerequisite chains, node outcomes, and unlock states.</p>
            </div>

            <div className="st-layout">
              <div className="st-canvas-box">
                <svg viewBox="0 0 380 260" width="100%" height="100%">
                  {/* Topological graph lines with subtle flow animation */}
                  <line x1="60" y1="200" x2="150" y2="130" stroke="#7A8E84" strokeWidth="1.5"/>
                  <line x1="150" y1="130" x2="150" y2="60" stroke="#7A8E84" strokeWidth="1.5"/>
                  <line x1="150" y1="130" x2="250" y2="150" stroke="#7A8E84" strokeWidth="1.5"/>
                  <line x1="250" y1="150" x2="330" y2="90" stroke="#7A8E84" strokeWidth="1.5"/>
                  <line x1="250" y1="150" x2="320" y2="210" stroke="rgba(122,142,132,0.4)" strokeWidth="1.2" strokeDasharray="3 3"/>

                  {/* Node circles */}
                  <circle cx="60" cy="200" r="9" fill="#EDE6D6" stroke="#183728" strokeWidth="1.5"/>
                  <circle cx="150" cy="130" r="9" fill="#EDE6D6" stroke="#183728" strokeWidth="1.5"/>
                  <circle cx="150" cy="60" r="9" fill="#EDE6D6" stroke="#183728" strokeWidth="1.5"/>
                  
                  {/* Active Beacon on Current Node */}
                  <circle cx="250" cy="150" r="10" fill="#E07A18" className="st-pulse-node" />
                  <circle cx="250" cy="150" r="15" fill="none" stroke="#E07A18" className="radar-wave" />

                  <circle cx="330" cy="90" r="9" fill="rgba(237,230,214,0.3)" stroke="#7A8E84" strokeWidth="1.5"/>
                  <circle cx="320" cy="210" r="9" fill="rgba(237,230,214,0.15)" stroke="rgba(122,142,132,0.4)" strokeWidth="1.5"/>

                  <text x="25" y="225" className="st-node-label" fill="#EDE8DD">DISCRETE MATH</text>
                  <text x="100" y="118" className="st-node-label" fill="#EDE8DD">DATA STRUCTURES</text>
                  <text x="100" y="48" className="st-node-label" fill="#EDE8DD">OPERATING SYSTEMS</text>
                  <text x="205" y="178" className="st-node-label" fill="#F59E0B" fontWeight="700">DBMS &amp; SQL (YOU)</text>
                  <text x="290" y="76" className="st-node-label" fill="#A8B8AE">DISTRIBUTED SYS</text>
                  <text x="280" y="236" className="st-node-label" fill="#A8B8AE">AI &amp; MACHINE LEARNING</text>
                </svg>
              </div>

              <div className="st-copy">
                <p>
                  Explore your academic prerequisite topology — Wanderer won't let you wander into advanced topics until your foundational concepts are verified.
                </p>
                <ul className="st-feature-list">
                  <li><span className="dot"></span> <span>Locked subjects clearly display missing prerequisite milestones</span></li>
                  <li><span className="dot"></span> <span>Completed course checkpoints remain permanently in your knowledge base</span></li>
                  <li><span className="dot"></span> <span>Visual stage filters for Foundational, Intermediate, and Advanced stages</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAREER STUDIO ROLE BENCHMARK DIRECTORY */}
      <section className="section wrap" id="career" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <h2>AI Career Studio &amp; Recruiter Matchmaker</h2>
          <p>Wanderer parses your verified milestone checkpoint scores against industry hiring benchmarks to deliver a transparent readiness radar.</p>
        </div>

        <div className="career-benchmarks-grid">
          {CAREER_BENCHMARKS.map((b, idx) => (
            <div className="career-benchmark-card" key={idx}>
              <div className="career-score-pill">{b.benchmark}</div>
              <h3 className="career-role-title">{b.role}</h3>
              <p style={{ fontSize: "0.86rem", color: "var(--slate)", marginTop: 4 }}>Required verified milestones:</p>
              <ul className="career-req-list">
                {b.skills.map((s, i) => (
                  <li key={i}>
                    <span style={{ color: "var(--ochre)", fontWeight: 700 }}>•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SIDE-BY-SIDE COMPARISON MATRIX */}
      <section className="section wrap" id="comparison" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <h2>Why traditional study routines break down — and how Wanderer fixes them.</h2>
          <p>A direct side-by-side breakdown of conventional college studying vs. an adaptive educational ecosystem.</p>
        </div>

        <div className="comparison-matrix-card">
          <table className="comparison-table">
            <thead>
              <tr>
                <th style={{ width: "25%", color: "var(--pine)", background: "rgba(24, 55, 40, 0.04)" }}>DIMENSION</th>
                <th className="col-bad" style={{ width: "37.5%" }}>TRADITIONAL COLLEGE STUDYING</th>
                <th className="col-good" style={{ width: "37.5%" }}>WANDERER ACADEMIC OS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Syllabus Planning</strong></td>
                <td className="dim">Static PDF syllabus with zero pace feedback or hourly guidance.</td>
                <td className="highlight"><CheckCircle2 size={15} style={{ color: "var(--pine)", display: "inline", verticalAlign: "middle", marginRight: 6 }} /> Living milestone roadmap that auto-balances when you fall behind.</td>
              </tr>
              <tr>
                <td><strong>Exam Preparation</strong></td>
                <td className="dim">Panicked 48-hour cramming before midterms and semester finals.</td>
                <td className="highlight"><CheckCircle2 size={15} style={{ color: "var(--pine)", display: "inline", verticalAlign: "middle", marginRight: 6 }} /> Weekly Checkpoint Diagnostics pinpointing weak concepts weeks ahead.</td>
              </tr>
              <tr>
                <td><strong>Daily Focus Habits</strong></td>
                <td className="dim">Unstructured study sessions plagued by phone notifications and tab switches.</td>
                <td className="highlight"><CheckCircle2 size={15} style={{ color: "var(--pine)", display: "inline", verticalAlign: "middle", marginRight: 6 }} /> Focus Studio with Pomodoro telemetry, focus scores &amp; streak multipliers.</td>
              </tr>
              <tr>
                <td><strong>Doubt Resolution</strong></td>
                <td className="dim">Waiting days for office hours or searching endlessly through uncurated videos.</td>
                <td className="highlight"><CheckCircle2 size={15} style={{ color: "var(--pine)", display: "inline", verticalAlign: "middle", marginRight: 6 }} /> 24/7 Socratic AI Mentor (Groq &amp; Gemini) providing instant breakdowns &amp; proof guidance.</td>
              </tr>
              <tr>
                <td><strong>Career Transition</strong></td>
                <td className="dim">Guessing job readiness based on GPA with zero clarity on tech skill gaps.</td>
                <td className="highlight"><CheckCircle2 size={15} style={{ color: "var(--pine)", display: "inline", verticalAlign: "middle", marginRight: 6 }} /> Career Studio mapping coursework directly to real technical role readiness.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* TECH STACK STRIP */}
      <div className="tech-stack-strip">
        <div className="wrap tech-stack-inner">
          <span>REACT 19 + VITE 7</span>
          <span>NODE.JS EXPRESS 5</span>
          <span>MONGODB ATLAS</span>
          <span>GROQ LLAMA-3.3 70B</span>
          <span>GOOGLE GEMINI 1.5 FLASH</span>
          <span>FRAMER MOTION</span>
        </div>
      </div>

      {/* ONBOARDING SEQUENCE */}
      <section className="section wrap" id="workflow">
        <div className="section-head">
          <h2>Three steps to start your route.</h2>
          <p>The structured onboarding sequence that guides new learners from syllabus setup to industry mastery.</p>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-num">01</span>
            <h4>Take the Diagnostic</h4>
            <p>A low-friction assessment places your current competency on the skill map instead of guessing your level.</p>
          </div>
          <div className="step">
            <span className="step-num">02</span>
            <h4>Get Your Phased Route</h4>
            <p>An AI-architected path is generated against your target role, course syllabus, and weekly study budget.</p>
          </div>
          <div className="step">
            <span className="step-num">03</span>
            <h4>Walk It in Focus Studio</h4>
            <p>Execute deep work sessions with Pomodoro telemetry, ambient sound, and 24/7 AI mentorship at each waypoint.</p>
          </div>
        </div>
      </section>

      {/* DEMO CARD */}
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="demo-card">
          <div>
            <h3>Experience Wanderer — Next-Gen AI Learning &amp; Career Platform.</h3>
            <p>Architect your personalized roadmap, execute deep work sessions, and test your conceptual depth today.</p>
          </div>
          <button className="btn-primary" onClick={() => navigate("/register")}>
            Start your learning path
          </button>
        </div>
      </section>

      {/* FAQ & CONTACT */}
      <section className="section wrap" id="faq" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <h2>Frequently asked questions &amp; academic channel.</h2>
          <p>Technical details regarding AI multi-agent architecture, DAG skill graphs, and career matchmaking.</p>
        </div>

        <div className="faq-grid-wanderer">
          {FAQS.map((faq, idx) => (
            <div className="faq-card-item" key={idx}>
              <button
                className="faq-toggle-btn"
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: openFaq === idx ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    color: openFaq === idx ? "var(--ochre)" : "var(--slate)"
                  }}
                />
              </button>
              {openFaq === idx && (
                <div className="faq-answer-block">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div className="contact-card-box">
          <span className="hero-tag" style={{ marginBottom: 6 }}>// DIRECT ACADEMIC DISPATCH</span>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 500, marginBottom: 8, color: "var(--pine)" }}>
            Contact the engineering team
          </h3>
          <p style={{ fontSize: "0.94rem", color: "var(--slate)", marginBottom: 24 }}>
            Inquiries regarding custom university syllabi mapping, academic research, or platform feedback.
          </p>

          <form onSubmit={handleContactSubmit}>
            {contactStatus.success ? (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", color: "var(--pine)", marginBottom: 6 }}>
                  Dispatch Logged to Academic Ledger
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--slate)", marginBottom: 16 }}>
                  Thank you. Your message has been received and our team will respond shortly.
                </p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setContactStatus({ loading: false, success: false, error: "" })}
                >
                  Send another dispatch
                </button>
              </div>
            ) : (
              <>
                <div className="contact-fields-grid">
                  <div className="contact-field-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="Developer or Student Name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="contact-field-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="developer@university.edu"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="contact-field-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    placeholder="Platform Inquiry or Feature Suggestion"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  />
                </div>

                <div className="contact-field-group">
                  <label>Message</label>
                  <textarea
                    rows={4}
                    placeholder="Enter your inquiry, feedback, or technical question..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                  />
                </div>

                {contactStatus.error && (
                  <div style={{ color: "var(--ochre)", fontSize: "0.84rem", marginBottom: 14 }}>
                    {contactStatus.error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={contactStatus.loading}
                >
                  {contactStatus.loading ? "Transmitting..." : "Send dispatch"}
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="wrap">
        <span>Wanderer — Next-Gen AI Learning &amp; Career Evolution Platform</span>
        <span>© {new Date().getFullYear()} Wanderer. All rights reserved.</span>
      </footer>
    </div>
  );
}
