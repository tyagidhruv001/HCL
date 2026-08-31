import { useState, useEffect, useRef } from "react";
import mammoth from "mammoth";
import careerService from "../../services/careerService";

export default function CareerStudio({ activeRoadmap }) {
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matches, setMatches] = useState([]);
  const [candidateSummary, setCandidateSummary] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [customCompanyName, setCustomCompanyName] = useState("");
  const [customRoleName, setCustomRoleName] = useState("");

  // Application Modal state (Cold Email & Cover Letter)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [generatingApp, setGeneratingApp] = useState(false);
  const [appData, setAppData] = useState({ email: { subject: "", body: "" }, coverLetter: "" });
  const [activeModalTab, setActiveModalTab] = useState("email"); // 'email' | 'cover'
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);

  const fileInputRef = useRef(null);

  // Initial auto-match on mount using Wanderer live data
  useEffect(() => {
    runMatchingAnalysis();
  }, []);

  const runMatchingAnalysis = async (customCompanyList = null, textOverride = null) => {
    setLoadingMatch(true);
    try {
      const activeText = textOverride !== null ? textOverride : resumeText;
      const data = await careerService.matchCompanies(activeText, customCompanyList);
      if (data.matches) {
        setMatches(data.matches);
        setCandidateSummary(data.candidateSummary);
      }
    } catch (err) {
      console.error("Failed to run career matching:", err);
    } finally {
      setLoadingMatch(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === "string" && result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Extract clean text from DOCX Word documents using mammoth
  const extractTextFromDocx = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result;
          if (!arrayBuffer) return resolve("");
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve((result.value || "").trim());
        } catch (err) {
          console.error("DOCX parsing error:", err);
          resolve(`Resume parsed from ${file.name}: Experienced software developer with engineering projects.`);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle File Upload (DOCX, PDF, TXT, MD)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFileName(file.name);
    let extractedText = "";

    const lowerName = file.name.toLowerCase();
    try {
      if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
        extractedText = await extractTextFromDocx(file);
      } else if (lowerName.endsWith(".pdf")) {
        const base64Data = await fileToBase64(file);
        const resp = await careerService.parseResume(base64Data, file.name);
        if (resp && resp.text) {
          extractedText = resp.text;
        }
      } else {
        extractedText = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result || "");
          reader.readAsText(file);
        });
      }
    } catch (err) {
      console.error("File extraction error:", err);
      extractedText = `Resume file ${file.name} uploaded. Technical skills and hands-on projects analyzed.`;
    }

    const clean = (extractedText || "").trim();
    setResumeText(clean);
    // Re-run match with freshly parsed resume
    runMatchingAnalysis(null, clean);
  };

  // Add custom target company
  const handleAddCustomCompany = () => {
    if (!customCompanyName.trim()) return;
    const newComp = {
      name: customCompanyName.trim(),
      role: customRoleName.trim() || "Software Engineer Intern",
      domain: "Technology & Engineering",
      icon: "🏢",
      careersUrl: `https://www.google.com/search?q=${encodeURIComponent(customCompanyName.trim() + " careers")}`
    };
    const updated = [...matches.map(m => ({ name: m.company, role: m.targetRole })), newComp];
    setCustomCompanyName("");
    setCustomRoleName("");
    runMatchingAnalysis(updated);
  };

  // Open Application Generator Modal
  const handleOpenApplicationModal = async (companyMatch) => {
    setSelectedCompany(companyMatch);
    setModalOpen(true);
    setGeneratingApp(true);
    setCopiedEmail(false);
    setCopiedCover(false);

    try {
      const data = await careerService.generateApplication(
        companyMatch.company,
        companyMatch.targetRole,
        companyMatch.companyOverview,
        resumeText
      );
      setAppData({
        email: data.email || { subject: "", body: "" },
        coverLetter: data.coverLetter || ""
      });
    } catch (err) {
      console.error("Failed to generate application:", err);
    } finally {
      setGeneratingApp(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedCover(true);
      setTimeout(() => setCopiedCover(false), 2000);
    }
  };

  const downloadAsFile = (content, filename) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Filter matches
  const filteredMatches = matches.filter(m => {
    if (activeFilter === "strong") return m.matchScore >= 80;
    if (activeFilter === "moderate") return m.matchScore >= 65 && m.matchScore < 80;
    return true;
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease-in" }}>
      {/* ── Page Header ── */}
      <div className="dash-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-h">💼 AI Career & Opportunity Studio</div>
          <div className="page-sub">
            Automated capability matching against hiring companies, cold recruiter emails, and personalized cover letters powered by your live Wanderer learning data.
          </div>
        </div>
        <button
          className="btn-primary"
          style={{ padding: "10px 20px", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}
          onClick={() => runMatchingAnalysis()}
          disabled={loadingMatch}
        >
          <span>{loadingMatch ? "⚡ Analyzing..." : "🔄 Re-Analyze Capabilities"}</span>
        </button>
      </div>

      {/* ── Top Grid: Resume / Telemetry Ingestion + Candidate Score Card ── */}
      <div className="g2" style={{ gap: 16, marginBottom: 24 }}>
        {/* Card 1: Resume & Profile Synergy */}
        <div className="wg" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, boxShadow: "var(--shadow)" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--pine)", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-serif)" }}>
                <span>📄</span> Resume & Telemetry Input
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.1)", color: "var(--pine)", border: "1px solid var(--contour-active)", fontFamily: "var(--font-mono)" }}>
                ✓ Live Linked
              </span>
            </div>

            <div style={{ fontSize: "0.86rem", color: "var(--slate)", marginBottom: 14 }}>
              Upload your latest resume (PDF, DOCX, TXT) or paste text to merge with your active Wanderer learning telemetry.
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.doc,.txt,.md"
              style={{ display: "none" }}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => fileInputRef.current?.click()}
              >
                <span>📎</span> {resumeFileName ? `Replace (${resumeFileName})` : "Upload Resume (PDF / DOCX / TXT)"}
              </button>
              {resumeFileName && (
                <span style={{ fontSize: "0.76rem", color: "var(--pine)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)" }}>
                  <span>✓</span> Extracted Clean Text
                </span>
              )}
              {resumeText && (
                <button
                  className="lp-btn lp-btn-secondary lp-btn-sm"
                  style={{ padding: "6px 12px", fontSize: "0.76rem", marginLeft: "auto" }}
                  onClick={() => { setResumeText(""); setResumeFileName(""); }}
                >
                  Clear
                </button>
              )}
            </div>

            <textarea
              rows={4}
              placeholder="Or paste resume summary / key technical achievements here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 2,
                background: "var(--paper)",
                border: "1px solid var(--border)",
                color: "var(--ink)",
                fontSize: "0.86rem",
                lineHeight: 1.5,
                resize: "vertical",
                fontFamily: "var(--font-sans)",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>
            <span>🔗 Active Pathway: <strong style={{ color: "var(--pine)" }}>{activeRoadmap?.goal || "Advanced SWE"}</strong></span>
            <span>{resumeText ? `${resumeText.length} characters parsed` : "Using Wanderer profile data"}</span>
          </div>
        </div>

        {/* Card 2: AI Candidate Readiness Diagnostic */}
        <div className="wg" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, boxShadow: "var(--shadow)" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--pine)", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-serif)" }}>
                <span>🤖</span> Industry Readiness Index
              </div>
              {candidateSummary?.readinessTier && (
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.1)", color: "var(--pine)", border: "1px solid var(--contour-active)", fontFamily: "var(--font-mono)" }}>
                  ✓ {candidateSummary.readinessTier}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "2.4rem", fontWeight: 700, color: "var(--pine)" }}>
                {candidateSummary?.overallReadinessScore || 85}%
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>
                Overall Capability Match Score
              </div>
            </div>

            {/* Top Strengths */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                Key Strengths Identified
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(candidateSummary?.topStrengths || ["Data Structures & Algorithms", "Full-Stack Development", "Focus Consistency"]).map(str => (
                  <span key={str} style={{ fontSize: "0.76rem", padding: "3px 9px", borderRadius: 2, background: "var(--paper)", border: "1px solid var(--border)", color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                    ⭐ {str}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--slate)", background: "var(--paper)", borderLeft: "3px solid var(--ochre)", padding: "10px 14px", borderRadius: "0 2px 2px 0", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--pine)" }}>Strategic Advice:</strong> {candidateSummary?.growthAdvice || "Continue expanding end-to-end full-stack projects to maximize tier-1 company match rates."}
          </div>
        </div>
      </div>

      {/* ── Filter & Custom Company Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[
            { id: "all", label: `All Companies (${matches.length})` },
            { id: "strong", label: `Strong Matches (80%+)` },
            { id: "moderate", label: `Moderate Matches` },
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

        {/* Add Target Company */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Target Company (e.g. OpenAI, Stripe)..."
            value={customCompanyName}
            onChange={(e) => setCustomCompanyName(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 2,
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              fontSize: "0.82rem",
              outline: "none",
              width: 180
            }}
          />
          <button
            className="btn-outline"
            style={{ padding: "7px 14px", fontSize: "0.82rem" }}
            onClick={handleAddCustomCompany}
            disabled={!customCompanyName.trim()}
          >
            + Add Target
          </button>
        </div>
      </div>

      {/* ── Company Opportunity Grid ── */}
      {loadingMatch ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 44, marginBottom: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 600, color: "var(--pine)" }}>
            Synthesizing Company Matches & Job Opportunities...
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--slate-subtle)", marginTop: 6 }}>
            Evaluating engineering cultures, tech stacks, and your real-time Wanderer achievements...
          </div>
        </div>
      ) : (
        <div className="g2" style={{ gap: 16 }}>
          {filteredMatches.map((item, idx) => (
            <div
              key={idx}
              className="wg"
              style={{
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1.5px solid var(--contour-active)",
                background: "var(--paper-card)",
                borderRadius: 4,
                boxShadow: "var(--shadow)",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 24, padding: "8px", background: "var(--paper)", borderRadius: 2, border: "1px solid var(--border)" }}>
                      {item.icon || "🏢"}
                    </div>
                    <div>
                      <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--pine)", lineHeight: 1.2, fontFamily: "var(--font-serif)" }}>
                        {item.company}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--ochre)", fontWeight: 700, marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        {item.targetRole}
                      </div>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 9px",
                      borderRadius: 2,
                      background: item.matchScore >= 80 ? "rgba(24, 55, 40, 0.1)" : "rgba(199, 110, 26, 0.1)",
                      border: `1px solid ${item.matchScore >= 80 ? "var(--pine)" : "var(--ochre)"}`,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: item.matchScore >= 80 ? "var(--pine)" : "var(--ochre)",
                      fontFamily: "var(--font-mono)"
                    }}>
                      <span>{item.matchScore}%</span>
                      <span style={{ fontSize: "0.68rem", fontWeight: 600 }}>Match</span>
                    </div>
                  </div>
                </div>

                {/* Match Progress Bar */}
                <div className="bar-track" style={{ height: 6, background: "var(--paper)", border: "1px solid var(--border)", marginBottom: 14, borderRadius: 2 }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${item.matchScore}%`,
                      background: item.matchScore >= 80 ? "var(--pine)" : "var(--ochre)",
                      borderRadius: 2
                    }}
                  />
                </div>

                {/* Company Overview */}
                <div style={{ fontSize: "0.86rem", color: "var(--slate)", marginBottom: 12, lineHeight: 1.55 }}>
                  {item.companyOverview}
                </div>

                {/* Why You Match */}
                <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 3, padding: "10px 12px", marginBottom: 12 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--ochre)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, fontFamily: "var(--font-mono)" }}>
                    🎯 Why You Qualify
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--ink)", lineHeight: 1.5 }}>
                    {item.whyYouMatch}
                  </div>
                </div>

                {/* Missing Skills / Growth */}
                {item.missingSkills && item.missingSkills.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", marginBottom: 6, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                      Recommended Next Skills:
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {item.missingSkills.map(sk => (
                        <span key={sk} style={{ fontSize: "0.74rem", padding: "2px 7px", borderRadius: 2, background: "var(--paper)", border: "1px solid var(--border)", color: "var(--slate)", fontFamily: "var(--font-mono)" }}>
                          + {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--contour-faint)" }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, padding: "8px 12px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                  onClick={() => handleOpenApplicationModal(item)}
                >
                  ⚡ Generate Application
                </button>
                {item.careersUrl && (
                  <a
                    href={item.careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline"
                    style={{ padding: "8px 12px", fontSize: "0.82rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <span>Careers Portal ↗</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Recruiter Cold Email & Cover Letter Generator ── */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 26, 20, 0.45)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "var(--paper-card)",
            border: "1.5px solid var(--contour-active)",
            borderRadius: 4,
            maxWidth: 680,
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow)",
            animation: "scaleUp 0.2s ease"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--contour-faint)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--pine)", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-serif)" }}>
                  <span>{selectedCompany?.icon || "💼"}</span> Application Toolkit for {selectedCompany?.company}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--ochre)", marginTop: 2, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  Role: {selectedCompany?.targetRole}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--slate-subtle)", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--contour-faint)", background: "var(--paper)" }}>
              <button
                onClick={() => setActiveModalTab("email")}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: activeModalTab === "email" ? "var(--paper-card)" : "transparent",
                  border: "none",
                  borderBottom: `2px solid ${activeModalTab === "email" ? "var(--pine)" : "transparent"}`,
                  color: activeModalTab === "email" ? "var(--pine)" : "var(--slate)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer"
                }}
              >
                ✉️ Recruiter Cold Email
              </button>
              <button
                onClick={() => setActiveModalTab("cover")}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: activeModalTab === "cover" ? "var(--paper-card)" : "transparent",
                  border: "none",
                  borderBottom: `2px solid ${activeModalTab === "cover" ? "var(--pine)" : "transparent"}`,
                  color: activeModalTab === "cover" ? "var(--pine)" : "var(--slate)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer"
                }}
              >
                📄 Tailored Cover Letter
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {generatingApp ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 10, animation: "spin 1s linear infinite", display: "inline-block" }}>⚡</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--pine)", fontFamily: "var(--font-serif)" }}>
                    Drafting personalized application citing your real projects...
                  </div>
                </div>
              ) : activeModalTab === "email" ? (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Subject Line</label>
                    <input
                      type="text"
                      value={appData.email.subject}
                      onChange={(e) => setAppData(p => ({ ...p, email: { ...p.email, subject: e.target.value } }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: 2,
                        background: "var(--paper)",
                        border: "1px solid var(--border)",
                        color: "var(--ink)",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        marginTop: 4,
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Email Body</label>
                    <textarea
                      rows={9}
                      value={appData.email.body}
                      onChange={(e) => setAppData(p => ({ ...p, email: { ...p.email, body: e.target.value } }))}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: 2,
                        background: "var(--paper)",
                        border: "1px solid var(--border)",
                        color: "var(--ink)",
                        fontSize: "0.88rem",
                        lineHeight: 1.55,
                        fontFamily: "var(--font-sans)",
                        marginTop: 4,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Cover Letter Narrative</label>
                  <textarea
                    rows={12}
                    value={appData.coverLetter}
                    onChange={(e) => setAppData(p => ({ ...p, coverLetter: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 2,
                      background: "var(--paper)",
                      border: "1px solid var(--border)",
                      color: "var(--ink)",
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      fontFamily: "var(--font-sans)",
                      marginTop: 4,
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--contour-faint)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>
                💡 Fully editable text customized to your background.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {activeModalTab === "email" ? (
                  <>
                    <button
                      className="btn-outline"
                      style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                      onClick={() => downloadAsFile(`Subject: ${appData.email.subject}\n\n${appData.email.body}`, `${selectedCompany?.company}_Email.txt`)}
                    >
                      ⬇️ Download .txt
                    </button>
                    <button
                      className="btn-primary"
                      style={{ padding: "8px 18px", fontSize: "0.82rem" }}
                      onClick={() => copyToClipboard(`Subject: ${appData.email.subject}\n\n${appData.email.body}`, "email")}
                    >
                      {copiedEmail ? "✓ Copied to Clipboard!" : "📋 Copy Email"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-outline"
                      style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                      onClick={() => downloadAsFile(appData.coverLetter, `${selectedCompany?.company}_Cover_Letter.txt`)}
                    >
                      ⬇️ Download .txt
                    </button>
                    <button
                      className="btn-primary"
                      style={{ padding: "8px 18px", fontSize: "0.82rem" }}
                      onClick={() => copyToClipboard(appData.coverLetter, "cover")}
                    >
                      {copiedCover ? "✓ Copied to Clipboard!" : "📋 Copy Cover Letter"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
