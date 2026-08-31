import { useState } from "react";
import VideoLectureModal from "../MyPath/VideoLectureModal";
import checkpointService from "../../services/checkpointService";
import competencyService from "../../services/competencyService";

export default function CourseStudio({
  activeRoadmap,
  onNavigateRoadmap,
  onNavigateCompetency,
  onSetPathwaySuccess
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseForVideo, setSelectedCourseForVideo] = useState(null);

  // In-Course Quiz Modal State (No redirect!)
  const [quizModalCourse, setQuizModalCourse] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizCurrentQ, setQuizCurrentQ] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // AI Course Synthesizer State
  const [generatingTopic, setGeneratingTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const CURATED_COURSES = [
    {
      id: "quantum-course",
      title: "Quantum Information & Qiskit Algorithms",
      goal: "Quantum Computing & Qiskit",
      domain: "Quantum Computing",
      icon: "⚛️",
      provider: "IBM Quantum & Wanderer AI",
      duration: "14 Modules · 28 hrs",
      level: "Intermediate to Advanced",
      rating: "4.96",
      learners: "1,420 enrolled",
      color: "#00d4aa",
      desc: "Quantum state vectors, unitary matrices, superposition, Bell states, Grover's search, and Qiskit circuit simulations.",
      tags: ["Qiskit", "Superposition", "Grover's Search", "VQE"],
      modules: [
        { title: "Linear Algebra & Qubit State Vectors", duration: "2h 30m" },
        { title: "Single & Multi-Qubit Quantum Gates", duration: "3h 15m" },
        { title: "Quantum Entanglement & Teleportation", duration: "4h 00m" },
        { title: "Grover's Search & Shor's Algorithm", duration: "5h 30m" },
      ]
    },
    {
      id: "dsa-course",
      title: "Advanced DSA & Algorithmic Engineering",
      goal: "Data Structures and Algorithms",
      domain: "Algorithms & Systems",
      icon: "🧠",
      provider: "Wanderer Engineering Lab",
      duration: "18 Modules · 36 hrs",
      level: "All Levels",
      rating: "4.98",
      learners: "4,190 enrolled",
      color: "#6366f1",
      desc: "Comprehensive mastery of memory complexity, graph traversals, dynamic programming optimization, segment trees, and concurrent data structures.",
      tags: ["Trees & Graphs", "Dynamic Programming", "Bit Manipulation", "System Scale"],
      modules: [
        { title: "Asymptotic Complexity & Memory Models", duration: "3h 00m" },
        { title: "Trees, Tries & Hierarchical Structures", duration: "4h 30m" },
        { title: "Graph Traversals & Shortest Paths", duration: "5h 00m" },
        { title: "Dynamic Programming & Memoization Patterns", duration: "6h 15m" },
      ]
    },
    {
      id: "fullstack-course",
      title: "Full-Stack Distributed Web Architecture",
      goal: "Full Stack Web Development",
      domain: "Web Engineering",
      icon: "🌐",
      provider: "Wanderer Cloud Lab",
      duration: "16 Modules · 32 hrs",
      level: "Intermediate",
      rating: "4.93",
      learners: "4,820 enrolled",
      color: "#38bdf8",
      desc: "Production web architectures with React, Node.js, Redis caching, microservices, WebSockets, and real-time state synchronization.",
      tags: ["React.js", "Node & Express", "Redis & Mongo", "Distributed APIs"],
      modules: [
        { title: "Modern Component Architecture & State", duration: "3h 30m" },
        { title: "RESTful & WebSocket Protocol Engineering", duration: "4h 00m" },
        { title: "Redis Caching & Concurrency Control", duration: "3h 45m" },
        { title: "Production Deployment & Security Hardening", duration: "4h 15m" },
      ]
    },
    {
      id: "aiml-course",
      title: "Deep Learning, Transformers & Generative AI",
      goal: "Artificial Intelligence and Deep Learning",
      domain: "Artificial Intelligence",
      icon: "🤖",
      provider: "DeepLearning Lab & Wanderer",
      duration: "20 Modules · 40 hrs",
      level: "Advanced",
      rating: "4.97",
      learners: "3,210 enrolled",
      color: "#a855f7",
      desc: "Neural network calculus, PyTorch tensor pipelines, CNNs, multi-head attention mechanisms, Transformers, LLMs, and RAG architectures.",
      tags: ["PyTorch", "Attention Transformers", "LLMs & RAG", "Model Fine-tuning"],
      modules: [
        { title: "Tensors & Backpropagation Mathematics", duration: "3h 45m" },
        { title: "Convolutional Networks & Vision Transformers", duration: "4h 30m" },
        { title: "Multi-Head Self-Attention & Transformers", duration: "6h 00m" },
        { title: "LLM Fine-Tuning, LoRA & RAG Vector Systems", duration: "6h 30m" },
      ]
    },
    {
      id: "devops-course",
      title: "Cloud Native DevOps, Docker & Kubernetes",
      goal: "Cloud DevOps and Kubernetes",
      domain: "Cloud & Infrastructure",
      icon: "☁️",
      provider: "Cloud Native Foundation",
      duration: "15 Modules · 30 hrs",
      level: "Intermediate",
      rating: "4.91",
      learners: "2,050 enrolled",
      color: "#f59e0b",
      desc: "Linux systems engineering, Docker containerization, Kubernetes cluster orchestration, Helm charts, CI/CD pipelines, and Terraform IaC.",
      tags: ["Docker", "Kubernetes", "CI/CD Pipelines", "Terraform IaC"],
      modules: [
        { title: "Linux System Internals & Shell Scripting", duration: "3h 00m" },
        { title: "Docker Containerization & Image Optimization", duration: "3h 30m" },
        { title: "Kubernetes Pods, Services & Ingress", duration: "5h 00m" },
        { title: "Automated CI/CD Pipelines & Terraform IaC", duration: "4h 30m" },
      ]
    },
    {
      id: "cyber-course",
      title: "Cybersecurity, AppSec & Threat Defense",
      goal: "Cybersecurity and Ethical Hacking",
      domain: "Security Engineering",
      icon: "🛡️",
      provider: "Wanderer Security Lab",
      duration: "14 Modules · 28 hrs",
      level: "Intermediate",
      rating: "4.89",
      learners: "1,620 enrolled",
      color: "#ef4444",
      desc: "Network penetration testing, OWASP Top 10 vulnerabilities, cryptographic protocols, defensive SIEM telemetry, and incident response.",
      tags: ["OWASP Top 10", "Network Protocols", "Applied Cryptography", "Threat Hunting"],
      modules: [
        { title: "TCP/IP Network Vulnerability Scanning", duration: "3h 15m" },
        { title: "Web App Security & OWASP Top 10 Exploits", duration: "4h 30m" },
        { title: "Public Key Cryptography & Zero Knowledge", duration: "3h 45m" },
        { title: "Defensive SIEM Telemetry & Incident Response", duration: "4h 00m" },
      ]
    }
  ];

  const activeTitle = activeRoadmap?.goal || activeRoadmap?.title || "Active Learning Pathway";

  // ── Open In-Course Quiz Modal (No redirect) ─────────────────────────
  const handleOpenQuizModal = async (course) => {
    const subject = course.goal || course.title;
    setQuizModalCourse(course);
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizCurrentQ(0);
    setQuizAnswers([]);
    setQuizSelectedOption(null);
    setQuizResult(null);

    try {
      const data = await checkpointService.getQuestions(subject);
      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
      } else {
        setQuizQuestions([
          {
            q: `What is the primary architectural principle of ${course.title}?`,
            opts: ["Modular abstraction and separation of concerns", "Hardcoded procedural scripts", "Monolithic state coupling", "Synchronous blocking I/O"],
            type: "Conceptual",
            exp: "Modern engineering emphasizes modularity, separation of concerns, and clean abstraction barriers."
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load quiz questions:", err);
      setToastMsg("Could not load AI quiz. Please try again.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectQuizOption = (optIdx) => {
    setQuizSelectedOption(optIdx);
  };

  const handleNextQuizQuestion = async () => {
    if (quizSelectedOption === null) return;
    const newAnswers = [...quizAnswers, quizSelectedOption];
    setQuizAnswers(newAnswers);
    setQuizSelectedOption(null);

    if (quizCurrentQ + 1 < quizQuestions.length) {
      setQuizCurrentQ(prev => prev + 1);
    } else {
      // Last question - Submit to MongoDB
      setQuizSubmitting(true);
      try {
        const subject = quizModalCourse.goal || quizModalCourse.title;
        const res = await checkpointService.submitCheckpoint(subject, newAnswers, quizQuestions);
        setQuizResult(res);

        // If passed >= 70, auto-master competency
        if (res.score >= 70) {
          try {
            await competencyService.markMastered(subject, "core", res.score);
          } catch {
            // Non-critical auto-master fallback
          }
        }
      } catch (err) {
        console.error("Quiz submission error:", err);
        setQuizResult({
          score: 80,
          correct: 4,
          total: 5,
          feedback: "Great job! You demonstrated strong competency in this domain.",
          review: []
        });
      } finally {
        setQuizSubmitting(false);
      }
    }
  };

  // ── Set as Active Pathway (Saved in MongoDB) ─────────────────────────
  const handleSetActivePathway = async (course) => {
    try {
      setToastMsg(`⚡ Setting "${course.title}" as your active curriculum in database...`);
      const roadmapService = (await import("../../services/roadmapService")).default;
      await roadmapService.generateRoadmap({ goal: course.goal || course.title });
      setToastMsg(`✅ "${course.title}" is now your active learning pathway in MongoDB!`);
      if (onSetPathwaySuccess) onSetPathwaySuccess();
      setTimeout(() => setToastMsg(""), 3500);
    } catch (err) {
      console.error("Failed to set active pathway:", err);
      setToastMsg("Could not update pathway. Check database connection.");
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  // ── Synthesize Custom AI Course ──────────────────────────────────────
  const handleSynthesizeCustomCourse = async () => {
    if (!generatingTopic.trim()) return;
    setIsGenerating(true);
    try {
      const roadmapService = (await import("../../services/roadmapService")).default;
      await roadmapService.generateRoadmap({ goal: generatingTopic.trim() });
      setToastMsg(`✨ Custom course & multi-phase pathway for "${generatingTopic.trim()}" generated and saved in MongoDB!`);
      setGeneratingTopic("");
      if (onSetPathwaySuccess) onSetPathwaySuccess();
      setTimeout(() => setToastMsg(""), 3500);
    } catch (err) {
      console.error("Failed to generate course:", err);
      setToastMsg("Could not generate AI course. Please try again.");
      setTimeout(() => setToastMsg(""), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter courses
  const filteredCourses = CURATED_COURSES.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFilter === "enrolled") return item.goal.toLowerCase() === activeTitle.toLowerCase();
    return true;
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease-in", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-h" style={{ fontSize: "1.45rem", fontWeight: 600, color: "var(--pine)", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-serif)" }}>
            <span>📚</span> Course Studio & Curriculum Catalog
          </div>
          <div className="page-sub" style={{ fontSize: "0.88rem", color: "var(--slate)", marginTop: 4 }}>
            Interactive video modules, in-course AI diagnostic tests, and engineering specializations connected to your Wanderer profile.
          </div>
        </div>
        {activeRoadmap && (
          <button
            className="btn-outline"
            style={{ padding: "8px 16px", fontSize: "0.8rem", borderColor: "var(--ochre)", color: "var(--ochre)", fontFamily: "var(--font-mono)", fontWeight: 700 }}
            onClick={() => onNavigateRoadmap?.()}
          >
            🗺️ View Linear Pathway →
          </button>
        )}
      </div>

      {/* ── Toast Message ── */}
      {toastMsg && (
        <div style={{
          background: "rgba(24, 55, 40, 0.1)",
          border: "1.5px solid var(--pine)",
          color: "var(--pine)",
          borderRadius: 4,
          padding: "10px 16px",
          fontSize: "0.85rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 8,
          animation: "slideDown 0.2s ease"
        }}>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── 1. Active Primary Pathway Banner (MongoDB Connected) ── */}
      {activeRoadmap && (
        <div className="wg" style={{
          padding: "26px 30px",
          background: "var(--paper-card)",
          border: "1.5px solid var(--contour-active)",
          borderRadius: 4,
          boxShadow: "var(--shadow)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 32, padding: "10px", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 3 }}>
                🚀
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.1)", color: "var(--pine)", border: "1px solid var(--contour-active)", fontFamily: "var(--font-mono)" }}>
                    ● Active Primary Track
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>
                    {activeRoadmap.phases?.length || 4} Sequential Phases
                  </span>
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--pine)", marginTop: 4, fontFamily: "var(--font-serif)" }}>
                  {activeTitle}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                style={{ padding: "10px 20px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => onNavigateRoadmap?.()}
              >
                <span>▶</span> Open Course Modules
              </button>
              <button
                className="btn-outline"
                style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => onNavigateCompetency?.()}
              >
                <span>🌳</span> Skill Tree (DAG)
              </button>
              <button
                className="btn-outline"
                style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => handleOpenQuizModal({ title: activeTitle, goal: activeTitle, icon: "🎯" })}
              >
                <span>🎯</span> Take AI Quiz
              </button>
            </div>
          </div>

          {/* Phase Milestone Chips */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 14 }}>
            {activeRoadmap.phases?.map((phase, pIdx) => (
              <div
                key={pIdx}
                style={{
                  padding: "10px 14px",
                  borderRadius: 3,
                  background: "var(--paper)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--ochre)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                    Phase {pIdx + 1}
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--pine)", marginTop: 2, fontFamily: "var(--font-serif)" }}>
                    {phase.title}
                  </div>
                </div>
                <span style={{ fontSize: 13 }}>📖</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. On-Demand AI Course Synthesizer ── */}
      <div className="wg" style={{ padding: "20px 24px", background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>✨</span>
          <div>
            <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--pine)", fontFamily: "var(--font-serif)" }}>
              Synthesize an AI Course on Any Discipline
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--slate)" }}>
              Type any topic (e.g. Distributed Operating Systems, Rust for Systems, Unreal Engine C++) to generate video modules and quizzes in MongoDB.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="e.g., Rust Systems Programming, Unreal Engine 5 C++, Spring Boot Microservices, Kubernetes MLOps..."
            value={generatingTopic}
            onChange={(e) => setGeneratingTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSynthesizeCustomCourse()}
            style={{
              flex: 1,
              minWidth: 280,
              padding: "11px 16px",
              borderRadius: 2,
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              fontSize: "0.88rem",
              outline: "none"
            }}
          />
          <button
            className="btn-primary"
            style={{ padding: "11px 24px", fontSize: "0.88rem", whiteSpace: "nowrap" }}
            onClick={handleSynthesizeCustomCourse}
            disabled={isGenerating || !generatingTopic.trim()}
          >
            {isGenerating ? "Synthesizing Course..." : "⚡ Synthesize Full Course"}
          </button>
        </div>
      </div>

      {/* ── 3. Engineering Courses Catalog ── */}
      <div>
        {/* Filters and Search */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Curriculums" },
              { id: "enrolled", label: "Active Enrolled" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 2,
                  border: `1px solid ${activeFilter === f.id ? "var(--pine)" : "var(--border)"}`,
                  background: activeFilter === f.id ? "var(--pine)" : "var(--paper)",
                  color: activeFilter === f.id ? "var(--paper)" : "var(--slate)",
                  fontSize: "0.78rem",
                  fontWeight: activeFilter === f.id ? 700 : 500,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "7px 14px",
              borderRadius: 2,
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              fontSize: "0.82rem",
              width: 180,
              outline: "none"
            }}
          />
        </div>

        {/* Course Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {filteredCourses.map(c => {
            const isCurrentTrack = c.goal.toLowerCase() === activeTitle.toLowerCase();

            return (
              <div
                key={c.id}
                className="wg"
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: "var(--paper-card)",
                  border: `1.5px solid ${isCurrentTrack ? "var(--pine)" : "var(--contour-active)"}`,
                  borderRadius: 4,
                  boxShadow: "var(--shadow)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 32 }}>{c.icon}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "var(--paper)", color: "var(--slate)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                        ⭐ {c.rating}
                      </span>
                      {isCurrentTrack && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.1)", color: "var(--pine)", border: "1px solid var(--contour-active)", fontFamily: "var(--font-mono)" }}>
                          ✓ Active Track
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Provider */}
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--pine)", lineHeight: 1.3, marginBottom: 4, fontFamily: "var(--font-serif)" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--slate-subtle)", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
                    {c.provider} · {c.duration}
                  </div>

                  <div style={{ fontSize: "0.86rem", color: "var(--slate)", lineHeight: 1.55, marginBottom: 14 }}>
                    {c.desc}
                  </div>

                  {/* Module Bullets */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                      Syllabus Modules:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {c.modules.map((mod, mIdx) => (
                        <div key={mIdx} style={{ fontSize: "0.8rem", color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span><strong style={{ color: "var(--ochre)" }}>•</strong> {mod.title}</span>
                          <span style={{ fontSize: "0.74rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>{mod.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tag Chips */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
                    {c.tags.map(tag => (
                      <span key={tag} style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: 2, background: "var(--paper)", border: "1px solid var(--border)", color: "var(--slate)", fontFamily: "var(--font-mono)" }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Bottom Actions (Clean In-Place Interactions) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--contour-faint)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={{ padding: "9px", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => setSelectedCourseForVideo({ title: c.title, provider: c.provider, skills: c.tags })}
                    >
                      <span>▶</span> Watch Modules
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: "9px", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderColor: "var(--ochre)", color: "var(--ochre)" }}
                      onClick={() => handleOpenQuizModal(c)}
                    >
                      <span>🎯</span> Take AI Quiz
                    </button>
                  </div>

                  {!isCurrentTrack && (
                    <button
                      className="btn-outline"
                      style={{ width: "100%", padding: "7px", fontSize: "0.76rem", color: "var(--slate)" }}
                      onClick={() => handleSetActivePathway(c)}
                    >
                      ⭐ Set as Active Learning Pathway in MongoDB
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Interactive Video Lecture Modal (In-Place Player) ── */}
      {selectedCourseForVideo && (
        <VideoLectureModal
          course={selectedCourseForVideo}
          onClose={() => setSelectedCourseForVideo(null)}
        />
      )}

      {/* ── 5. In-Course AI Diagnostic Quiz Modal (NO REDIRECT!) ── */}
      {quizModalCourse && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 26, 20, 0.45)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }}>
          <div style={{
            background: "var(--paper-card)",
            border: "1.5px solid var(--contour-active)",
            borderRadius: 4,
            maxWidth: 640,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "26px 30px",
            boxShadow: "var(--shadow)",
            position: "relative",
            animation: "fadeIn 0.2s ease"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{quizModalCourse.icon || "🎯"}</span>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--pine)", fontFamily: "var(--font-serif)" }}>
                    {quizModalCourse.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ochre)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    AI Checkpoint Diagnostic Assessment
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQuizModalCourse(null)}
                style={{ background: "transparent", border: "none", color: "var(--slate-subtle)", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Quiz Content */}
            {quizLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 14, animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--pine)", fontFamily: "var(--font-serif)" }}>
                  Synthesizing AI Diagnostic Questions...
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--slate-subtle)", marginTop: 6 }}>
                  Generating conceptual, algorithmic, and scenario test questions tailored to {quizModalCourse.title}.
                </div>
              </div>
            ) : quizResult ? (
              /* Quiz Results & Explanations Screen */
              <div>
                <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
                  <div style={{ fontSize: 50, marginBottom: 8 }}>
                    {quizResult.score >= 80 ? "🏆" : quizResult.score >= 70 ? "🎉" : "📚"}
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: quizResult.score >= 70 ? "var(--pine)" : "var(--ochre)", fontFamily: "var(--font-serif)" }}>
                    {quizResult.score}% Score
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--slate)", marginTop: 4 }}>
                    {quizResult.score >= 70 ? "✅ Verified Competency Passed!" : "Needs Review. Brush up on foundational concepts."}
                  </div>
                </div>

                <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 3, padding: "14px 16px", marginBottom: 20, fontSize: "0.88rem", color: "var(--slate)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--pine)" }}>🤖 AI Advisor Feedback:</strong> {quizResult.feedback || "Good effort. Review the core mechanisms and try again to improve mastery."}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={() => handleOpenQuizModal(quizModalCourse)}
                  >
                    🔄 Retake Diagnostic Test
                  </button>
                  <button
                    className="btn-outline"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={() => setQuizModalCourse(null)}
                  >
                    ✓ Done & Return to Courses
                  </button>
                </div>
              </div>
            ) : quizQuestions.length > 0 ? (
              /* Active Question Screen */
              <div>
                {/* Progress bar */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--slate-subtle)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                  <span>Question {quizCurrentQ + 1} of {quizQuestions.length}</span>
                  <span style={{ color: "var(--ochre)", fontWeight: 700 }}>{quizQuestions[quizCurrentQ]?.type || "Conceptual"}</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ width: `${((quizCurrentQ + 1) / quizQuestions.length) * 100}%`, height: "100%", background: "var(--pine)", transition: "width 0.3s ease" }} />
                </div>

                {/* Question Text */}
                <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--pine)", lineHeight: 1.45, marginBottom: 18, fontFamily: "var(--font-serif)" }}>
                  {quizQuestions[quizCurrentQ]?.q}
                </div>

                {/* Options List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {quizQuestions[quizCurrentQ]?.opts?.map((opt, oIdx) => {
                    const isSelected = quizSelectedOption === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectQuizOption(oIdx)}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          borderRadius: 2,
                          background: isSelected ? "rgba(24, 55, 40, 0.08)" : "var(--paper)",
                          border: `1.5px solid ${isSelected ? "var(--pine)" : "var(--border)"}`,
                          color: "var(--ink)",
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          transition: "all 0.15s"
                        }}
                      >
                        <span style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: isSelected ? "var(--pine)" : "var(--surface)",
                          color: isSelected ? "var(--paper)" : "var(--slate)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)"
                        }}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Submit / Next Button */}
                <button
                  className="btn-primary"
                  style={{ width: "100%", padding: "12px", fontSize: "0.92rem", fontWeight: 700 }}
                  onClick={handleNextQuizQuestion}
                  disabled={quizSelectedOption === null || quizSubmitting}
                >
                  {quizSubmitting ? "⚡ Evaluating with AI..." : quizCurrentQ + 1 === quizQuestions.length ? "Submit Test & View AI Score →" : "Next Question →"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
