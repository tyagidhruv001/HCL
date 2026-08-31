import { useState, useEffect } from "react";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import { CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Synchronize body background on mount
  useEffect(() => {
    const origBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#F6F1E5";
    return () => {
      document.body.style.backgroundColor = origBg;
    };
  }, []);

  const validate = () => {
    const e = {};
    if (!form.email.includes("@")) e.email = "Valid email address required";
    if (form.password.length < 6) e.password = "Minimum 6 characters";
    return e;
  };

  const handle = async (e) => {
    if (e) e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    setApiError("");
    try {
      const data = await authService.login(form);
      onLogin(data);
      navigate("/dashboard");
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* Top Left Navigation Back Button */}
      <button className="login-back-btn" onClick={() => navigate("/")}>
        <ArrowLeft size={15} />
        <span>Return to Home</span>
      </button>

      <div className="login-split-container">
        {/* Left Side: Brand Editorial Showcase */}
        <div className="login-left-brand">
          <span className="brand-badge">// ACADEMIC ACCESS PORTAL</span>
          <h1>
            Your personalized<br />
            <em>study engine</em> awaits.
          </h1>
          <p className="login-left-desc">
            Wanderer monitors your learning milestones, administers adaptive diagnostics, and restructures your curriculum before conceptual gaps compound.
          </p>

          <ul className="auth-feature-list">
            {[
              "Checkpoint-based milestone retention evaluations",
              "Multi-agent conversational AI tutor (Groq & Gemini)",
              "Live distraction telemetry & Pomodoro study streaks",
              "Direct role matching against real company tech stacks"
            ].map((feature, idx) => (
              <li className="auth-feature-item" key={idx}>
                <CheckCircle2 size={16} style={{ color: "var(--pine)", flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Side: Form Card */}
        <div className="login-right-form">
          <div className="auth-card-box">
            <div className="auth-card-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your personal dashboard &amp; route</p>
            </div>

            <div className="auth-tab-bar">
              <button
                type="button"
                className={`auth-tab-btn ${tab === "login" ? "active" : ""}`}
                onClick={() => setTab("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${tab === "register" ? "active" : ""}`}
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </div>

            <form onSubmit={handle}>
              <div className="auth-form-group">
                <label className="auth-label">Email Address</label>
                <input
                  type="email"
                  className={`auth-input ${errors.email ? "err" : ""}`}
                  placeholder="developer@university.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                {errors.email && <span className="auth-error-msg">{errors.email}</span>}
              </div>

              <div className="auth-form-group">
                <label className="auth-label">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    className={`auth-input ${errors.password ? "err" : ""}`}
                    placeholder="••••••••••••"
                    style={{ paddingRight: 40 }}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="pass-toggle-btn"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex="-1"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className="auth-error-msg">{errors.password}</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <span
                  className="auth-link"
                  style={{ fontSize: "0.84rem" }}
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </span>
              </div>

              {apiError && (
                <div style={{ color: "#B22D1D", fontFamily: "var(--font-mono)", fontSize: "0.82rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(178, 45, 29, 0.06)", borderRadius: 2 }}>
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                ) : (
                  "Login to Dashboard"
                )}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.88rem", color: "var(--slate)" }}>
              Don&apos;t have an account?{" "}
              <span
                className="auth-link"
                onClick={() => navigate("/register")}
              >
                Create your route
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
