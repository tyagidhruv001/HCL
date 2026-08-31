import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/register.css";
import authService from "../services/authService";
import { ArrowLeft, Check } from "lucide-react";

export default function RegisterPage({ onRegister }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fname: "", lname: "", dob: "", email: "", phone: "", password: "", confirmPass: "",
    education: "", year: "", interests: [], skills: [], improveSkills: "", about: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Synchronize body background on mount
  useEffect(() => {
    const origBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#F6F1E5";
    return () => {
      document.body.style.backgroundColor = origBg;
    };
  }, []);

  const INTERESTS = ["Machine Learning", "Web Dev", "Mobile Dev", "Data Science", "Cybersecurity", "Cloud Computing", "DSA", "UI/UX Design", "Blockchain", "DevOps"];
  const SKILLS = ["JavaScript", "Python", "Java", "C++", "React", "Node.js", "MongoDB", "SQL", "Git", "Docker"];
  const STEPS = ["Personal Info", "Education", "Skills & Interests", "About You"];

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggle = (key, val) => setForm(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val] }));

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.fname) e.fname = "First name is required";
      if (!form.lname) e.lname = "Last name is required";
      if (!form.email.includes("@")) e.email = "Valid email address required";
      if (!form.phone.match(/^\d{10}$/)) e.phone = "Valid 10-digit mobile number required";
      if (form.password.length < 6) e.password = "Minimum 6 characters";
      if (form.password !== form.confirmPass) e.confirmPass = "Passwords do not match";
    }
    return e;
  };

  const next = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      setLoading(true);
      setApiError("");
      try {
        const data = await authService.register(form);
        onRegister(data);
        navigate("/dashboard");
      } catch (err) {
        setApiError(err.response?.data?.message || err.message || "Registration failed. Please verify your details.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="reg-page">
      {/* Top Left Navigation Back Button */}
      <button className="reg-top-back-btn" onClick={() => navigate("/login")}>
        <ArrowLeft size={15} />
        <span>Back to Sign In</span>
      </button>

      <div className="reg-content-wrapper">
        <div className="reg-header">
          <h1>Create Your Learning Route</h1>
          <p>Configure your personalized AI study roadmap</p>
        </div>

        {/* STEPPER */}
        <div className="reg-stepper">
          {STEPS.map((s, i) => (
            <div key={s} className="step-item">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className={`step-circle ${i < step ? "done" : i === step ? "active" : "pending"}`}>
                  {i < step ? <Check size={15} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`step-line ${i < step ? "done" : ""}`} />}
              </div>
              <div className="step-label" style={{ color: i === step ? "var(--ochre)" : i < step ? "var(--pine)" : "var(--slate-subtle)", width: i < STEPS.length - 1 ? 90 : 76 }}>
                {s}
              </div>
            </div>
          ))}
        </div>

        <div className="reg-card">
          {/* STEP 0: PERSONAL INFO */}
          {step === 0 && (
            <>
              <h3>Personal Information</h3>
              <div className="reg-grid-2">
                {[["First Name", "fname", "text", "John"], ["Last Name", "lname", "text", "Wick"]].map(([l, k, t, ph]) => (
                  <div className="reg-group" key={k}>
                    <label className="reg-label">{l}</label>
                    <input className={`input-field ${errors[k] ? "err" : ""}`} type={t} placeholder={ph} value={form[k]} onChange={e => setF(k, e.target.value)} />
                    {errors[k] && <span style={{ fontSize: "0.74rem", color: "#B22D1D", fontFamily: "var(--font-mono)" }}>{errors[k]}</span>}
                  </div>
                ))}
              </div>
              <div className="reg-group">
                <label className="reg-label">Date of Birth</label>
                <input className="input-field" type="date" value={form.dob} onChange={e => setF("dob", e.target.value)} />
              </div>
              <div className="reg-group">
                <label className="reg-label">Email Address</label>
                <input className={`input-field ${errors.email ? "err" : ""}`} type="email" placeholder="developer@university.edu" value={form.email} onChange={e => setF("email", e.target.value)} />
                {errors.email && <span style={{ fontSize: "0.74rem", color: "#B22D1D", fontFamily: "var(--font-mono)" }}>{errors.email}</span>}
              </div>
              <div className="reg-group">
                <label className="reg-label">Mobile Number</label>
                <input className={`input-field ${errors.phone ? "err" : ""}`} type="tel" placeholder="9876543210" value={form.phone} onChange={e => setF("phone", e.target.value)} />
                {errors.phone && <span style={{ fontSize: "0.74rem", color: "#B22D1D", fontFamily: "var(--font-mono)" }}>{errors.phone}</span>}
              </div>
              <div className="reg-grid-2">
                <div className="reg-group">
                  <label className="reg-label">Password</label>
                  <input className={`input-field ${errors.password ? "err" : ""}`} type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setF("password", e.target.value)} />
                  {errors.password && <span style={{ fontSize: "0.74rem", color: "#B22D1D", fontFamily: "var(--font-mono)" }}>{errors.password}</span>}
                </div>
                <div className="reg-group">
                  <label className="reg-label">Confirm Password</label>
                  <input className={`input-field ${errors.confirmPass ? "err" : ""}`} type="password" placeholder="Repeat password" value={form.confirmPass} onChange={e => setF("confirmPass", e.target.value)} />
                  {errors.confirmPass && <span style={{ fontSize: "0.74rem", color: "#B22D1D", fontFamily: "var(--font-mono)" }}>{errors.confirmPass}</span>}
                </div>
              </div>
            </>
          )}

          {/* STEP 1: EDUCATION */}
          {step === 1 && (
            <>
              <h3>Education Details</h3>
              <div className="reg-group">
                <label className="reg-label">Currently Studying In</label>
                <select className="input-field" value={form.education} onChange={e => setF("education", e.target.value)}>
                  <option value="">Select your level...</option>
                  <option>Class 10th</option><option>Class 11th</option><option>Class 12th</option>
                  <option>B.Tech / B.E.</option><option>BCA</option><option>MCA</option>
                  <option>M.Tech</option><option>MBA</option><option>B.Sc</option><option>Other</option>
                </select>
              </div>
              {["B.Tech / B.E.", "BCA", "MCA", "M.Tech", "MBA"].includes(form.education) && (
                <div className="reg-group">
                  <label className="reg-label">Current Year</label>
                  <select className="input-field" value={form.year} onChange={e => setF("year", e.target.value)}>
                    <option value="">Select year...</option>
                    <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
                  </select>
                </div>
              )}
              <div className="reg-group">
                <label className="reg-label">College / School Name (optional)</label>
                <input className="input-field" placeholder="e.g. Stanford University / MIT / IIT Delhi" />
              </div>
              <div className="reg-group">
                <label className="reg-label">Branch / Stream (optional)</label>
                <input className="input-field" placeholder="e.g. Computer Science & Engineering" />
              </div>
            </>
          )}

          {/* STEP 2: SKILLS & INTERESTS */}
          {step === 2 && (
            <>
              <h3>Skills &amp; Interests</h3>
              <div className="reg-group">
                <label className="reg-label">Your Target Interests (select all that apply)</label>
                <div className="interest-grid">
                  {INTERESTS.map(i => (
                    <button key={i} type="button" className={`interest-chip ${form.interests.includes(i) ? "sel" : ""}`} onClick={() => toggle("interests", i)}>{i}</button>
                  ))}
                </div>
              </div>
              <div className="reg-group" style={{ marginTop: 14 }}>
                <label className="reg-label">Current Skills You Have</label>
                <div className="interest-grid">
                  {SKILLS.map(s => (
                    <button key={s} type="button" className={`interest-chip ${form.skills.includes(s) ? "sel" : ""}`} onClick={() => toggle("skills", s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="reg-group" style={{ marginTop: 14 }}>
                <label className="reg-label">Key Subjects You Want to Master</label>
                <input className="input-field" placeholder="e.g. Dynamic Programming, Virtual Memory, Distributed Systems..." value={form.improveSkills} onChange={e => setF("improveSkills", e.target.value)} />
              </div>
            </>
          )}

          {/* STEP 3: ABOUT */}
          {step === 3 && (
            <>
              <h3>About You</h3>
              <div className="reg-group">
                <label className="reg-label">Tell us about your learning goals (max 100 words)</label>
                <textarea className="input-field" rows={4} placeholder="Write a short summary — target engineering roles, semester exam goals, what you hope to achieve with Wanderer..." style={{ resize: "vertical" }}
                  value={form.about} onChange={e => { const words = e.target.value.trim().split(/\s+/).filter(Boolean); if (words.length <= 100) setF("about", e.target.value); }} />
                <div style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", color: "var(--slate-subtle)", textAlign: "right", marginTop: 4 }}>
                  {form.about.trim().split(/\s+/).filter(Boolean).length}/100 words
                </div>
              </div>
              <div style={{ background: "rgba(24, 55, 40, 0.05)", border: "1px solid var(--contour-active)", borderRadius: 3, padding: "14px 18px", marginTop: 10 }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--pine)", marginBottom: 3 }}>🎓 Route Configuration Ready</div>
                <div style={{ fontSize: "0.84rem", color: "var(--slate)", lineHeight: 1.55 }}>After finishing setup, Wanderer will generate your customized academic milestone spine and skill graph.</div>
              </div>
            </>
          )}

          <div className="reg-nav">
            <button type="button" className="reg-nav-btn-ghost" onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/login")} disabled={loading}>
              {step === 0 ? "Cancel" : "← Previous Step"}
            </button>
            <button type="button" className="btn-primary" onClick={next} disabled={loading}>
              {loading ? "Creating Route..." : (step < 3 ? "Continue →" : "Generate My Learning Path →")}
            </button>
          </div>
          {apiError && <div style={{ color: "#B22D1D", fontFamily: "var(--font-mono)", fontSize: "0.82rem", textAlign: "center", marginTop: 14, padding: "8px 12px", background: "rgba(178, 45, 29, 0.06)", borderRadius: 2 }}>{apiError}</div>}
        </div>
      </div>
    </div>
  );
}
