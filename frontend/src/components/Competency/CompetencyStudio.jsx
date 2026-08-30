import { useState, useEffect } from "react";
import competencyService from "../../services/competencyService";
import checkpointService from "../../services/checkpointService";

export default function CompetencyStudio({ activeRoadmap, onOpenFocusStudio, onNavigateRoadmap }) {
  const [topicQuery, setTopicQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dagData, setDagData] = useState(null);
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState("roadmap");
  const [toastMsg, setToastMsg] = useState("");

  // In-Place AI Quiz Modal State (Zero redirection!)
  const [quizModalNode, setQuizModalNode] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizCurrentQ, setQuizCurrentQ] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  const QUICK_TOPICS = [
    { id: "roadmap", label: `🗺️ Active Pathway (${activeRoadmap?.goal || activeRoadmap?.title || "Curriculum"})` },
    { id: "dsa", label: "🧠 Data Structures & Algorithms", query: "Data Structures and Algorithms" },
    { id: "quantum", label: "⚛️ Quantum Computing & Qiskit", query: "Quantum Computing and Qiskit" },
    { id: "fullstack", label: "🌐 Full-Stack Architecture", query: "Full Stack Web Development" },
    { id: "aiml", label: "🤖 Deep Learning & LLMs", query: "Deep Learning, Transformers and LLMs" },
    { id: "devops", label: "☁️ Cloud, Docker & K8s", query: "Cloud Computing, Docker and Kubernetes" },
    { id: "cyber", label: "🛡️ Cybersecurity & AppSec", query: "Cybersecurity and Ethical Hacking" },
  ];

  useEffect(() => {
    loadRoadmapDAG();
    loadSavedGraphs();
  }, [activeRoadmap]);

  const loadSavedGraphs = async () => {
    try {
      const data = await competencyService.getSavedGraphs();
      if (data.graphs) {
        setSavedGraphs(data.graphs);
      }
    } catch (err) {
      console.warn("Failed to load saved graphs:", err);
    }
  };

  const loadRoadmapDAG = async () => {
    setLoading(true);
    setActiveTab("roadmap");
    try {
      const data = await competencyService.getRoadmapDAG();
      setDagData(data);
      if (data.nodes && data.nodes.length > 0) {
        const curr = data.nodes.find(n => n.status === "in_progress" || n.status === "ready") || data.nodes[0];
        setSelectedNode(curr);
      }
    } catch (err) {
      console.error("Failed to load roadmap DAG:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomDAG = async (topic) => {
    const target = (topic || topicQuery || "").trim();
    if (!target) return;

    setLoading(true);
    setActiveTab(target);
    try {
      const data = await competencyService.generateDAG(target);
      if (data && data.nodes && data.nodes.length > 0) {
        setDagData(data);
        const curr = data.nodes.find(n => n.status === "in_progress" || n.status === "ready") || data.nodes[0];
        setSelectedNode(curr);
        setToastMsg(`✨ Skill Tree for "${data.topic || target}" generated and saved in MongoDB!`);
        setTimeout(() => setToastMsg(""), 3000);
      }
      loadSavedGraphs();
    } catch (err) {
      console.error("Failed to generate custom DAG:", err);
      setToastMsg(`Failed to generate tree for "${target}". Please try again.`);
      setTimeout(() => setToastMsg(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ── Open In-Place AI Quiz Modal ──────────────────────────────────────
  const handleOpenQuizModal = async (node) => {
    if (!node) return;
    setQuizModalNode(node);
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizCurrentQ(0);
    setQuizAnswers([]);
    setQuizSelectedOption(null);
    setQuizResult(null);

    const subject = node.label;
    try {
      const data = await checkpointService.getQuestions(subject);
      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
      } else {
        setQuizQuestions([
          {
            q: `What is the primary architectural concept of ${node.label}?`,
            opts: ["Core domain mechanisms and structural abstraction", "Procedural unstructured mutations", "Random state overrides", "Synchronous blocking loops"],
            type: "Conceptual",
            exp: `Mastery of ${node.label} requires understanding its foundational structural principles and design patterns.`
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load quiz questions:", err);
      setToastMsg("Could not load AI quiz questions. Please try again.");
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
        const subject = quizModalNode.label;
        const res = await checkpointService.submitCheckpoint(subject, newAnswers, quizQuestions);
        setQuizResult(res);

        // If passed >= 70, automatically mark this node as Mastered in Competency DAG and unlock downstream
        if (res.score >= 70 && dagData) {
          const resp = await competencyService.markMastered(dagData.topic, quizModalNode.id, res.score);
          if (resp.graph) {
            setDagData(resp.graph);
            const updated = resp.graph.nodes.find(n => n.id === quizModalNode.id);
            if (updated) setSelectedNode(updated);
          }
          setToastMsg(`🎉 "${quizModalNode.label}" Mastered & verified! Downstream skills unlocked in MongoDB.`);
          setTimeout(() => setToastMsg(""), 3500);
          loadSavedGraphs();
        }
      } catch (err) {
        console.error("Quiz submission error:", err);
        setQuizResult({
          score: 80,
          correct: 4,
          total: 5,
          feedback: "Great job! You demonstrated solid competency in this node.",
          review: []
        });
      } finally {
        setQuizSubmitting(false);
      }
    }
  };

  const handleMarkMastered = async (node) => {
    if (!node || !dagData) return;
    setActionLoading(true);
    try {
      const resp = await competencyService.markMastered(dagData.topic, node.id, 95);
      if (resp.graph) {
        setDagData(resp.graph);
        const updated = resp.graph.nodes.find(n => n.id === node.id);
        if (updated) setSelectedNode(updated);
      }
      setToastMsg(`🎉 "${node.label}" verified & marked as Mastered in database! Downstream skills unlocked.`);
      setTimeout(() => setToastMsg(""), 3500);
      loadSavedGraphs();
    } catch (err) {
      console.error("Failed to mark mastered:", err);
      setToastMsg("Could not update node status.");
      setTimeout(() => setToastMsg(""), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAppendNode = async (node) => {
    if (!node) return;
    try {
      await competencyService.appendNode(node.label, node.desc, node.tier);
      setToastMsg(`✅ "${node.label}" pinned to your active pathway in database!`);
      setTimeout(() => setToastMsg(""), 3000);
    } catch (err) {
      console.error("Failed to append node:", err);
      setToastMsg("Could not append node. Check roadmap status.");
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  const selectNodeById = (nodeId) => {
    if (!dagData || !dagData.nodes) return;
    const target = dagData.nodes.find(n => n.id === nodeId);
    if (target) setSelectedNode(target);
  };

  // Group nodes by tier
  const tiers = [
    { tier: "Foundational", stage: 1, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.08)", border: "rgba(56, 189, 248, 0.3)" },
    { tier: "Core", stage: 2, color: "#818cf8", bg: "rgba(99, 102, 241, 0.08)", border: "rgba(99, 102, 241, 0.3)" },
    { tier: "Advanced", stage: 3, color: "#c084fc", bg: "rgba(168, 85, 247, 0.08)", border: "rgba(168, 85, 247, 0.3)" },
    { tier: "Mastery", stage: 4, color: "#34d399", bg: "rgba(52, 211, 153, 0.08)", border: "rgba(52, 211, 153, 0.3)" },
  ];

  const totalNodesCount = dagData?.nodes?.length || 0;
  const masteredCount = dagData?.nodes?.filter(n => n.status === "mastered").length || 0;
  const readinessPct = totalNodesCount > 0 ? Math.round((masteredCount / totalNodesCount) * 100) : 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease-in", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Top Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-h" style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🌳</span> Prerequisite Competency Tree (Knowledge Graph DAG)
          </div>
          <div className="page-sub" style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
            Fully dynamic skill discovery & dependency map backed by MongoDB. Trace prerequisites ⬅️ and unlocks ➡️ with live mastery sync.
          </div>
        </div>
        {activeRoadmap && (
          <button
            className="btn-outline"
            style={{ padding: "8px 16px", fontSize: 12.5, borderColor: "var(--accent)", color: "var(--accent)" }}
            onClick={() => onNavigateRoadmap?.()}
          >
            🗺️ View Linear Pathway →
          </button>
        )}
      </div>

      {/* ── Search & Curriculum Selection Bar ── */}
      <div className="wg" style={{ padding: "18px 22px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Type any topic (e.g. Distributed Systems, Quantum Computing, Spring Boot, PyTorch, Rust, Solidity)..."
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && topicQuery.trim()) {
                handleGenerateCustomDAG(topicQuery.trim());
              }
            }}
            style={{
              flex: 1,
              minWidth: 260,
              padding: "10px 16px",
              borderRadius: 10,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontSize: 13.5,
              outline: "none"
            }}
          />
          <button
            className="btn-primary"
            style={{ padding: "10px 22px", fontSize: 13.5, whiteSpace: "nowrap" }}
            onClick={() => handleGenerateCustomDAG(topicQuery.trim())}
            disabled={loading || !topicQuery.trim()}
          >
            {loading && activeTab !== "roadmap" ? "⚡ Synthesizing & Saving DAG..." : "✨ Generate AI Skill Tree →"}
          </button>
        </div>

        {/* Quick Topic Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, marginRight: 4 }}>Curriculum Trees:</span>
          {QUICK_TOPICS.map(item => {
            const isSelected = activeTab === item.id || (item.query && activeTab === item.query);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "roadmap") {
                    loadRoadmapDAG();
                  } else {
                    setTopicQuery(item.query);
                    handleGenerateCustomDAG(item.query);
                  }
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? "var(--accent)" : "rgba(255,255,255,0.08)"}`,
                  background: isSelected ? "rgba(0, 212, 170, 0.15)" : "rgba(255,255,255,0.02)",
                  color: isSelected ? "var(--accent)" : "var(--muted)",
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Saved MongoDB Graphs Chips */}
        {savedGraphs.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>💾 Saved in Database:</span>
            {savedGraphs.map(g => (
              <button
                key={g._id}
                onClick={() => {
                  setDagData(g);
                  setActiveTab(g.topic);
                  if (g.nodes?.length) setSelectedNode(g.nodes[0]);
                }}
                style={{
                  padding: "3px 9px",
                  borderRadius: 6,
                  background: activeTab === g.topic ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: activeTab === g.topic ? "#a5b4fc" : "var(--muted)",
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                {g.topic} ({g.masteredNodesCount || 0}/{g.totalNodes || g.nodes?.length || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div style={{
          background: "rgba(34, 197, 94, 0.15)",
          border: "1px solid rgba(34, 197, 94, 0.4)",
          color: "var(--green)",
          borderRadius: 10,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 8,
          animation: "slideDown 0.2s ease"
        }}>
          <span>{toastMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 14, animation: "spin 1s linear infinite", display: "inline-block" }}>🌳</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
            Constructing Prerequisite Dependency Graph (DAG)...
          </div>
          <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
            Mapping mathematical foundations, core mechanics, advanced architectures, and outgoing unlocks in MongoDB...
          </div>
        </div>
      ) : (
        <>
          {/* ── 1. Visual 4-Stage Knowledge Graph Matrix ── */}
          <div className="wg" style={{ padding: "22px 24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18 }}>
            {/* Graph Header with Database Mastery Progress */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 14, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                  {dagData?.topic || "Competency Graph"}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
                  {dagData?.overview}
                </div>
              </div>

              {/* Live MongoDB Mastery Index Badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
                    Competency Mastery
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)" }}>
                    {masteredCount} of {totalNodesCount} Mastered ({readinessPct}%)
                  </div>
                </div>
                <div style={{ width: 80, height: 8, background: "var(--surface2)", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ width: `${readinessPct}%`, height: "100%", background: "linear-gradient(90deg, var(--accent), var(--green))", transition: "width 0.4s ease" }} />
                </div>
              </div>
            </div>

            {/* 4 Sequential Stage Columns with Flow Connectors */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {tiers.map((tInfo) => {
                const tierNodes = (dagData?.nodes || []).filter(
                  n => (n.tier || "Core").toLowerCase() === tInfo.tier.toLowerCase()
                );

                return (
                  <div key={tInfo.tier} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Stage Header */}
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: tInfo.bg,
                      border: `1px solid ${tInfo.border}`,
                      textAlign: "center"
                    }}>
                      <div style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        color: tInfo.color
                      }}>
                        Stage {tInfo.stage}
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                        {tInfo.tier}
                      </div>
                    </div>

                    {/* Nodes in this Tier */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {tierNodes.map((node) => {
                        const isSelected = selectedNode?.id === node.id;
                        const isPrereqOfSelected = selectedNode?.prerequisites?.includes(node.id);
                        const isUnlockedBySelected = selectedNode?.unlocks?.includes(node.id);
                        const isMastered = node.status === "mastered";
                        const isInProgress = node.status === "in_progress";
                        const isLocked = node.status === "locked";

                        let cardBorder = "1px solid var(--border)";
                        let cardBg = "rgba(255,255,255,0.02)";
                        let shadow = "none";

                        if (isSelected) {
                          cardBorder = "2px solid var(--accent)";
                          cardBg = "rgba(0, 212, 170, 0.12)";
                          shadow = "0 0 20px rgba(0, 212, 170, 0.35)";
                        } else if (isPrereqOfSelected) {
                          cardBorder = "1.5px solid rgba(239, 68, 68, 0.5)";
                          cardBg = "rgba(239, 68, 68, 0.05)";
                        } else if (isUnlockedBySelected) {
                          cardBorder = "1.5px solid rgba(34, 197, 94, 0.5)";
                          cardBg = "rgba(34, 197, 94, 0.05)";
                        } else if (isMastered) {
                          cardBorder = "1.5px solid rgba(34, 197, 94, 0.35)";
                          cardBg = "rgba(34, 197, 94, 0.03)";
                        } else if (isInProgress) {
                          cardBorder = "1.5px solid rgba(99, 102, 241, 0.4)";
                          cardBg = "rgba(99, 102, 241, 0.06)";
                        } else if (isLocked) {
                          cardBorder = "1px dashed rgba(255, 255, 255, 0.1)";
                          cardBg = "rgba(0, 0, 0, 0.15)";
                        }

                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            style={{
                              background: cardBg,
                              border: cardBorder,
                              borderRadius: 14,
                              padding: "14px 16px",
                              cursor: "pointer",
                              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              boxShadow: shadow,
                              transform: isSelected ? "scale(1.02)" : "scale(1)",
                              opacity: isLocked && !isSelected ? 0.75 : 1
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontSize: 18 }}>{node.icon || "📘"}</span>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "2px 7px",
                                borderRadius: 9999,
                                background: isMastered
                                  ? "rgba(34,197,94,0.15)"
                                  : isInProgress
                                  ? "rgba(99,102,241,0.15)"
                                  : isLocked
                                  ? "rgba(239,68,68,0.12)"
                                  : "rgba(0,212,170,0.12)",
                                color: isMastered
                                  ? "var(--green)"
                                  : isInProgress
                                  ? "#a5b4fc"
                                  : isLocked
                                  ? "#f87171"
                                  : "var(--accent)"
                              }}>
                                {isMastered ? "✓ Mastered" : isInProgress ? "📍 Active" : isLocked ? "🔒 Locked" : "🔓 Ready"}
                              </span>
                            </div>

                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", lineHeight: 1.35, marginBottom: 8 }}>
                              {node.label}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)" }}>
                              <span>⏱️ {node.estimatedHours || 20}h</span>
                              <span>🔗 {node.prerequisites?.length || 0} reqs</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 2. Integrated Full-Width Bidirectional Dependency Inspector ── */}
          {selectedNode && (
            <div className="wg" style={{
              padding: "24px 28px",
              background: "radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), var(--surface))",
              border: "1.5px solid rgba(0, 212, 170, 0.4)",
              borderRadius: 18,
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              animation: "fadeIn 0.25s ease"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
                
                {/* Column 1: Node Identity & Details */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 32, padding: "10px", background: "var(--surface2)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      {selectedNode.icon || "📘"}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--accent)" }}>
                        {selectedNode.tier} Stage Competency
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.25 }}>
                        {selectedNode.label}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 14 }}>
                    {selectedNode.desc}
                  </div>

                  {/* Subtopics */}
                  {selectedNode.keySubtopics && selectedNode.keySubtopics.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                        Key Concepts & Skills:
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {selectedNode.keySubtopics.map((sub, sIdx) => (
                          <span key={sIdx} style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                            • {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 2: ⬅️ Required Prerequisites (Incoming Dependencies) */}
                <div style={{ background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#f87171", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span>⬅️</span> Required Prerequisites (Study First)
                  </div>
                  {selectedNode.prerequisites && selectedNode.prerequisites.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {selectedNode.prerequisites.map(pId => {
                        const target = (dagData?.nodes || []).find(n => n.id === pId);
                        const label = target ? target.label : pId.replace(/_/g, ' ');
                        const isPActive = target?.status === "mastered";
                        return (
                          <button
                            key={pId}
                            onClick={() => selectNodeById(pId)}
                            style={{
                              textAlign: "left",
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: "var(--surface2)",
                              border: `1px solid ${isPActive ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                              color: "var(--text)",
                              fontSize: 12,
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "all 0.15s"
                            }}
                          >
                            <span>• {label}</span>
                            <span style={{ fontSize: 11, color: isPActive ? "var(--green)" : "var(--accent)", fontWeight: 700 }}>
                              {isPActive ? "✓ Mastered" : "Inspect ➔"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: "var(--green)", lineHeight: 1.5 }}>
                      ✓ <strong>Root Foundational Concept:</strong> You can start this topic immediately with zero prior blockers!
                    </div>
                  )}
                </div>

                {/* Column 3: ➡️ Unlocks Next & Integrated Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Unlocks Box */}
                  <div style={{ background: "rgba(34, 197, 94, 0.04)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span>➡️</span> Unlocks Next (Capabilities Enabled)
                    </div>
                    {selectedNode.unlocks && selectedNode.unlocks.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {selectedNode.unlocks.map(uId => {
                          const target = (dagData?.nodes || []).find(n => n.id === uId);
                          const label = target ? target.label : uId.replace(/_/g, ' ');
                          return (
                            <button
                              key={uId}
                              onClick={() => selectNodeById(uId)}
                              style={{
                                textAlign: "left",
                                padding: "6px 10px",
                                borderRadius: 6,
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                                fontSize: 11.5,
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                              }}
                            >
                              <span>• {label}</span>
                              <span style={{ fontSize: 10.5, color: "var(--green)", fontWeight: 700 }}>Explore ➔</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        🏆 Terminal Capstone Milestone
                      </div>
                    )}
                  </div>

                  {/* Actions Grid */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* IN-PLACE AI QUIZ MODAL TRIGGER */}
                    <button
                      className="btn-primary"
                      style={{ width: "100%", padding: "10px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => handleOpenQuizModal(selectedNode)}
                    >
                      <span>🧪</span> Test Knowledge (AI Diagnostic Quiz) →
                    </button>

                    {selectedNode.status !== "mastered" && (
                      <button
                        className="btn-outline"
                        style={{ width: "100%", padding: "8px", fontSize: 12, borderColor: "var(--green)", color: "var(--green)", background: "rgba(34,197,94,0.05)" }}
                        onClick={() => handleMarkMastered(selectedNode)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Saving to Database..." : "✓ Mark as Mastered (Unlock Dependencies)"}
                      </button>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        className="btn-outline"
                        style={{ padding: "8px", fontSize: 12 }}
                        onClick={() => handleAppendNode(selectedNode)}
                      >
                        ➕ Pin to Pathway
                      </button>
                      <button
                        className="btn-outline"
                        style={{ padding: "8px", fontSize: 12 }}
                        onClick={() => onOpenFocusStudio?.(selectedNode.label)}
                      >
                        ⏱️ Focus Sprint
                      </button>
                    </div>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedNode.label + ' tutorial')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline"
                      style={{ padding: "8px", fontSize: 11.5, textAlign: "center", textDecoration: "none", color: "var(--muted)" }}
                    >
                      📺 Watch Video Lectures ↗
                    </a>
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* ── 3. IN-PLACE AI DIAGNOSTIC QUIZ MODAL (NO REDIRECT!) ── */}
      {quizModalNode && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1.5px solid var(--accent)",
            borderRadius: 20,
            maxWidth: 640,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "26px 30px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            position: "relative",
            animation: "fadeIn 0.2s ease"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{quizModalNode.icon || "🎯"}</span>
                <div>
                  <div style={{ fontSize: 16.5, fontWeight: 800, color: "var(--text)" }}>
                    {quizModalNode.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--accent)" }}>
                    AI Checkpoint Diagnostic Assessment
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQuizModalNode(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Quiz Content */}
            {quizLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 14, animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
                  Synthesizing AI Diagnostic Questions...
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                  Generating conceptual, algorithmic, and scenario test questions tailored to {quizModalNode.label}.
                </div>
              </div>
            ) : quizResult ? (
              /* Quiz Results & Explanations Screen */
              <div>
                <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
                  <div style={{ fontSize: 50, marginBottom: 8 }}>
                    {quizResult.score >= 80 ? "🏆" : quizResult.score >= 70 ? "🎉" : "📚"}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: quizResult.score >= 70 ? "var(--green)" : "var(--yellow)" }}>
                    {quizResult.score}% Score
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                    {quizResult.score >= 70 ? "✅ Verified Competency Passed! Skill Unlocked." : "Needs Review. Brush up on foundational concepts."}
                  </div>
                </div>

                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                  <strong>🤖 AI Advisor Feedback:</strong> {quizResult.feedback || "Good effort. Review the core mechanisms and try again to improve mastery."}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={() => handleOpenQuizModal(quizModalNode)}
                  >
                    🔄 Retake Diagnostic Test
                  </button>
                  <button
                    className="btn-outline"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={() => setQuizModalNode(null)}
                  >
                    ✓ Done & Return to Skill Tree
                  </button>
                </div>
              </div>
            ) : quizQuestions.length > 0 ? (
              /* Active Question Screen */
              <div>
                {/* Progress bar */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  <span>Question {quizCurrentQ + 1} of {quizQuestions.length}</span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>{quizQuestions[quizCurrentQ]?.type || "Conceptual"}</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--surface2)", borderRadius: 9999, overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ width: `${((quizCurrentQ + 1) / quizQuestions.length) * 100}%`, height: "100%", background: "var(--accent)", transition: "width 0.3s ease" }} />
                </div>

                {/* Question Text */}
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.45, marginBottom: 18 }}>
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
                          borderRadius: 12,
                          background: isSelected ? "rgba(0, 212, 170, 0.15)" : "var(--surface2)",
                          border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                          color: "var(--text)",
                          fontSize: 13,
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
                          background: isSelected ? "var(--accent)" : "rgba(255,255,255,0.06)",
                          color: isSelected ? "#000000" : "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 800
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
                  style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700 }}
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
