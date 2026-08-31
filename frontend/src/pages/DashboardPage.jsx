import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/Dashboard.css";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import taskService from "../services/taskService";
import checkpointService from "../services/checkpointService";
import roadmapService from "../services/roadmapService";
import aiService from "../services/aiService";
import courseService from "../services/courseService";
import api from "../services/api";
import logo from "../assets/logo.png";
import Modal from "../components/Modal";
import AIChatBot from "../components/AIChatBot";
import focusTracker from "../utils/focusTracker";
import FocusStudio from "../components/FocusStudio";
import studySessionService from "../services/studySessionService";
import LearningPath from "../components/MyPath/LearningPath";
import AiAdvisorChat from "../components/AIAdvisor/AiAdvisorChat";
import CareerStudio from "../components/Careers/CareerStudio";
import CompetencyStudio from "../components/Competency/CompetencyStudio";
import CourseStudio from "../components/Courses/CourseStudio";

// ── Default/fallback data shown while real data loads ──────────
const DEFAULT_ROADMAP_PROGRESS = [];

const DEFAULT_USER = {
  name: "Student", email: "", roll: "", branch: "CSE", sem: "4th", av: "S",
};

const ALL_SUBJECTS = ["dsa", "os", "dbms", "cn", "webdev", "ml", "java", "python", "cloud"];

// Helper: format focus duration into exact, accurate time string (e.g. 25m, 4m 30s, 1h 15m 20s)
function formatFocusTime(minutes) {
  const totalSec = Math.round((Number(minutes) || 0) * 60);
  if (totalSec === 0) return "0m";
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return secs > 0 ? `${hrs}h ${mins}m ${secs}s` : mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

// Helper: map backend roadmap progress to UI format
function mapProgress(progress) {
  if (!progress || !progress.length) return [];
  return progress.map(p => ({
    topic: p.subject,
    pct: p.pct,
    done: p.done,
    total: p.total,
    color: p.color,
  }));
}

// Helper: map backend roadmap nodes to UI roadPath format
function mapRoadPath(nodes) {
  if (!nodes || !nodes.length) return [];
  return nodes.map((n, i) => ({
    day: n.day,
    topic: n.topic,
    status: n.status,
    subject: n.subject,
    originalIndex: i,
    icon: n.status === "done" ? "✅" : n.status === "current" ? "📍" : "🔒",
    color: n.status === "pending" ? "#4a6080" : n.color,
  }));
}

// ── Topic Resource Generator ─────────────────────────────────────
// Builds YouTube search + curated doc links for any roadmap topic
function _getTopicResources(topic, subject) {
  const q = encodeURIComponent(`${topic} ${subject || ""}`.trim());
  const topicQ = encodeURIComponent(topic);

  // YouTube links – search + top tutorial queries
  const videos = [
    { label: `▶ ${topic} — Full Tutorial`, url: `https://www.youtube.com/results?search_query=${q}+tutorial` },
    { label: `▶ ${topic} — Explained Simply`, url: `https://www.youtube.com/results?search_query=${topicQ}+explained+for+beginners` },
    { label: `▶ ${topic} — Interview Questions`, url: `https://www.youtube.com/results?search_query=${topicQ}+interview+questions` },
  ];

  // Documentation links
  const docs = [
    { label: "GeeksForGeeks", icon: "📗", url: `https://www.geeksforgeeks.org/search/?q=${topicQ}` },
    { label: "W3Schools",     icon: "🌐", url: `https://www.w3schools.com/search/search_result.php?q=${topicQ}` },
    { label: "MDN Web Docs",  icon: "📘", url: `https://developer.mozilla.org/en-US/search?q=${topicQ}` },
    { label: "Wikipedia",     icon: "📖", url: `https://en.wikipedia.org/w/index.php?search=${topicQ}` },
    { label: "JavatPoint",    icon: "☕", url: `https://www.javatpoint.com/search/${topicQ}` },
  ];

  return { videos, docs };
}

// Helper: map backend checkpoint history to cpScores format
function mapCpScores(history) {
  if (!history || !history.length) return [];
  return history.map(h => {
    const d = new Date(h.createdAt);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    return { week: h.week, label: h.label || label, s: h.score, subject: h.subject };
  });
}

function Countdown({ days }) {
  const hours = (days * 24) % 24;
  return (
    <div className="countdown">
      {[["days", days], ["hrs", hours], ["min", 42], ["sec", 18]].map(([l, v]) => (
        <div className="cd-box" key={l}>
          <div className="cd-num">{String(v).padStart(2, "0")}</div>
          <div className="cd-lbl">{l}</div>
        </div>
      ))}
    </div>
  );
}

function EditProfileDialog({ liveUser, setLiveUser, onClose }) {
  const [preview, setPreview] = useState(liveUser.profilePic || null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: liveUser.name || '',
    phone: liveUser.phone || '',
    dob: liveUser.dob || '',
    roll: liveUser.roll || '',
    branch: liveUser.branch || '',
    education: liveUser.education || '',
    year: liveUser.year || '',
    skills: liveUser.skills || '',
    about: liveUser.about || '',
  });

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => alert('Failed to read file.');
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => alert('Failed to process image.');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPreview(dataUrl);
        setIsDeleting(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const nameParts = (form.name || '').trim().split(' ');
      const fname = nameParts[0] || '';
      const lname = nameParts.slice(1).join(' ') || '';

      const payload = {
        fname,
        lname,
        phone: form.phone,
        dob: form.dob,
        roll: form.roll,
        branch: form.branch,
        education: form.education,
        year: form.year,
        skills: (form.skills || '').split(',').map(s => s.trim()).filter(Boolean),
        about: form.about,
      };

      if (isDeleting) {
        payload.profilePic = '';
      } else if (preview) {
        payload.profilePic = preview;
      }

      const saved = await authService.updateProfile(payload);
      const newPic = isDeleting ? null : (saved.profilePic !== undefined ? saved.profilePic : preview);

      setLiveUser(prev => ({
        ...prev,
        name: `${fname} ${lname}`.trim() || prev.name,
        phone: payload.phone,
        dob: payload.dob,
        roll: payload.roll,
        branch: payload.branch,
        education: payload.education,
        year: payload.year,
        skills: payload.skills.join(', '),
        about: payload.about,
        profilePic: newPic,
        av: `${fname[0] || ''}${lname[0] || ''}`.toUpperCase() || prev.av,
      }));

      // Update in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, ...saved, profilePic: newPic }));
      } catch {
        /* ignore */
      }

      onClose();
    } catch (e) {
      console.error('Update profile error:', e);
      alert('Failed to update profile: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || 'User')}&background=6366f1&color=fff`;

  return (
    <Modal title="✏️ Edit Profile" onClose={onClose}>
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 10 }}>
        {/* Image Upload System */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 12 }}>
            <img
              src={isDeleting ? fallbackAvatar : (preview || fallbackAvatar)}
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid var(--accent)',
                boxShadow: '0 4px 20px rgba(0, 212, 170, 0.25)',
              }}
              alt="Avatar Preview"
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: 12.5, padding: '7px 18px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => fileInputRef.current?.click()}
            >
              📸 Upload Photo
            </button>
            {(preview || liveUser.profilePic) && !isDeleting && (
              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: 12.5, padding: '7px 18px', borderRadius: 20, color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                onClick={() => {
                  setIsDeleting(true);
                  setPreview(null);
                }}
              >
                🗑️ Remove
              </button>
            )}
          </div>
        </div>

        {/* Profile Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          {[
            ['Full Name', 'text', 'name', 'e.g. Dhruv Tyagi'],
            ['Phone Number', 'text', 'phone', '+91 98765 43210'],
            ['Date of Birth', 'date', 'dob', ''],
            ['Roll No.', 'text', 'roll', 'e.g. 21001004'],
            ['Branch', 'text', 'branch', 'e.g. Computer Science'],
            ['Education / Degree', 'text', 'education', 'e.g. B.Tech Computer Science'],
            ['Graduation Year', 'text', 'year', 'e.g. 2026'],
            ['Skills (comma separated)', 'text', 'skills', 'React, Node.js, Python'],
          ].map(([label, type, key, placeholder]) => (
            <div key={key}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{label}</div>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="input-field"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>

        {/* About Me block */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>Short Bio / About</div>
          <textarea
            value={form.about}
            onChange={e => setForm(prev => ({ ...prev, about: e.target.value }))}
            placeholder="Tell us about your learning goals and projects..."
            className="input-field"
            style={{ width: '100%', minHeight: 75, resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 700 }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? '⏳ Saving Changes...' : '💾 Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

function DashboardPage({ theme, setTheme }) {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [sbOpen, setSbOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Live data state ──────────────────────────────────────────
  const [liveUser, setLiveUser] = useState(DEFAULT_USER);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [roadmapProgress, setRoadmapProgress] = useState(DEFAULT_ROADMAP_PROGRESS);
  const [roadPath, setRoadPath] = useState([]);
  const [cpScores, setCpScores] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [badges, setBadges] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [riskLevel, setRiskLevel] = useState("Low");
  const [consistencyData, setConsistencyData] = useState({});
  const [completionPct, setCompletionPct] = useState(0);
  const [stats, setStats] = useState({});
  const [focus, setFocus] = useState({
    tabSwitches: 0,
    score: 100
  });

  // Update focus state when liveUser (backend data) loads
  useEffect(() => {
    if (liveUser && liveUser.focusScore !== undefined) {
      setFocus({
        tabSwitches: liveUser.totalSwitches || 0,
        score: liveUser.focusScore
      });
      // Sync the internal tracker with backend values
      focusTracker.tabSwitches = liveUser.totalSwitches || 0;
      focusTracker.score = liveUser.focusScore;
    }
  }, [liveUser]);

  useEffect(() => {
    focusTracker.start();

    const interval = setInterval(() => {
      setFocus(focusTracker.getData());
    }, 1000);

    // Sync with backend every 2 minutes
    const syncInterval = setInterval(async () => {
      const data = focusTracker.getData();
      try {
        await authService.syncFocus(data.score, data.tabSwitches);
      } catch (e) {
        console.error("Focus Sync Failed:", e.response?.data?.message || e.message);
      }
    }, 120000);

    return () => {
      focusTracker.stop();
      clearInterval(interval);
      clearInterval(syncInterval);
      // Final sync on leave
      const data = focusTracker.getData();
      authService.syncFocus(data.score, data.tabSwitches).catch(() => { });
    };
  }, []);

  // ── Checkpoint test state ────────────────────────────────────
  const [testQuestions, setTestQuestions] = useState([]);
  const [testSubject, setTestSubject] = useState("");
  const [roadmapSubject, setRoadmapSubject] = useState("");
  const [_topicDrawer, _setTopicDrawer] = useState(null); // { topic, subject, color, day, status, index }
  // ── Resource tracking (localStorage-persisted per user) ──
  const [_resourcesRead, setResourcesRead] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ss_resources') || '{}'); }
    catch { return {}; }
  });
  const [todayStreakMarked, setTodayStreakMarked] = useState(() =>
    localStorage.getItem('ss_streak_day') === new Date().toDateString()
  );
  const [customTopic, setCustomTopic] = useState("");
  const [testState, setTestState] = useState({ started: false, q: 0, answers: [], score: null, correct: 0, total: 0, submitting: false, feedback: null, review: [], analysis: null });
  const [testLoading, setTestLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  // ── Settings State ────────────────────────────────────────────
  const [settings, setSettings] = useState({
    "Checkpoint Reminders": true,
    "Daily Study Alerts": true,
    "Streak Notifications": true,
    "Weak Topic Alerts": true
  });

  const toggleSetting = async (name) => {
    const newSettings = { ...settings, [name]: !settings[name] };
    setSettings(newSettings);
    try {
      await authService.updateProfile({ settings: { theme, notifications: newSettings } });
    } catch (e) { console.error("Failed to sync settings:", e); }
  };


  // ── Leaderboard state ──────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  // ── AI advice state ────────────────────────────────────────
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [_generatingRoadmap, setGeneratingRoadmap] = useState(false);

  // ── Add task state ─────────────────────────────────────────
  const [newTask, setNewTask] = useState({ text: "", subject: "DSA", time: "9:00 AM", type: "topic" });
  const [taskAdding, setTaskAdding] = useState(false);

  // ── Courses catalog state ──────────────────────────────────
  const [_catalogCourses, setCatalogCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  const profRef = useRef(null);

  // ── Focus Studio state ─────────────────────────────────────
  const [focusSessions, setFocusSessions] = useState([]);
  const [focusStats, setFocusStats] = useState({
    totalMinutes: 0,
    totalHours: 0,
    todayMinutes: 0,
    todayHours: 0,
    totalSessions: 0,
  });
  const [focusLoading, setFocusLoading] = useState(false);

  const fetchFocusData = useCallback(async () => {
    try {
      setFocusLoading(true);
      const [sessionsRes, statsRes] = await Promise.all([
        studySessionService.getSessions(20),
        studySessionService.getStats(),
      ]);
      if (sessionsRes?.data) setFocusSessions(sessionsRes.data);
      if (statsRes?.data) setFocusStats(statsRes.data);
    } catch (err) {
      console.error("Focus data fetch error:", err);
    } finally {
      setFocusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active === "focusstudio") {
      fetchFocusData();
    }
  }, [active, fetchFocusData]);

  // ── Fetch all dashboard data on mount ────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      fetchFocusData();
      const [analytics, todayTasks, courseList] = await Promise.all([
        authService.getAnalytics(),
        taskService.getTodaysTasks(),
        courseService.getCourses(),
      ]);

      // Trigger AI Advice in background (don't block initial mount for it)
      const fetchAdvice = async () => {
        setAiLoading(true);
        try {
          const adv = await aiService.getStudyAdvice();
          setAiAdvice(adv.advice);
        } catch (e) { console.error("Advice fetch err", e); }
        finally { setAiLoading(false); }
      };
      fetchAdvice();

      setCatalogCourses(courseList || []);

      // User info
      const u = analytics.user || {};
      setEnrolledCourses(u.enrolledCourses || []);
      const fullName = `${u.fname || ""} ${u.lname || ""}`.trim() || "Student";
      const av = fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      setLiveUser({
        name: fullName, email: u.email || "",
        roll: u.roll || "", branch: u.branch || "CSE",
        sem: u.sem || "",
        phone: u.phone || "",
        dob: u.dob ? new Date(u.dob).toISOString().split('T')[0] : "",
        education: u.education || "",
        year: u.year || "",
        skills: u.skills ? u.skills.join(", ") : "",
        about: u.about || "",
        profilePic: u.profilePic || null,
        focusScore: u.focusScore ?? 100,
        totalSwitches: u.totalSwitches ?? 0,
        av,
      });

      // Synchronize settings from DB
      if (u.settings) {
        if (u.settings.theme) setTheme(u.settings.theme);
        if (u.settings.notifications) setSettings(u.settings.notifications);
      }

      // Roadmap
      if (analytics.roadmap) {
        setActiveRoadmap(analytics.roadmap);
        setRoadmapProgress(mapProgress(analytics.roadmap.progress));
        setRoadPath(mapRoadPath(analytics.roadmap.nodes));
      }

      // Checkpoint scores & analytics
      setCpScores(mapCpScores(analytics.checkpointHistory));
      setAnalyticsData(analytics.analyticsData || []);
      setWeakTopics(analytics.weakTopics || []);
      setBadges(u.badges || []);
      setStreak(analytics.stats?.streak || 0);
      setRiskLevel(analytics.stats?.riskLevel || "Low");
      setConsistencyData(analytics.consistencyData || {});
      setCompletionPct(analytics.stats?.completionPct || 0);
      setStats(analytics.stats || {});

      // Auto-select first subject if none selected
      const userCourses = u.enrolledCourses || [];
      if (userCourses.length > 0) {
        if (!roadmapSubject) setRoadmapSubject(userCourses[0]);
        if (!testSubject) setTestSubject(userCourses[0]);
      }

      // Daily tasks — map _id → id for UI consistency
      setTasks(todayTasks.map(t => ({ ...t, id: t._id, subj: t.subject })));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const h = e => { if (profRef.current && !profRef.current.contains(e.target)) setProfOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const risk = completionPct;
  const riskColor = riskLevel === "Low" ? "var(--green)" : riskLevel === "Moderate" ? "var(--yellow)" : "var(--red)";
  const riskLabel = riskLevel === "Low" ? "Low Risk" : riskLevel === "Moderate" ? "Moderate" : "High Risk";
  const doneTasks = stats.todayTasksDone || 0;
  const totalTasks = stats.todayTasksTotal || 0;

  const SIDEBAR = [
    { section: "MAIN" },
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "aiadvisor", icon: "⚡", label: "JARVIS AI", isStarred: true },
    { id: "roadmap", icon: "🗺️", label: "My Path", isStarred: true },
    { id: "competency", icon: "🌳", label: "Skill Tree (DAG)", isStarred: true },
    { id: "checkpoint", icon: "🎯", label: "Checkpoint Tests" },
    { id: "focusstudio", icon: "⏱️", label: "Focus", isStarred: true },
    { id: "careers", icon: "💼", label: "Career & Jobs", isStarred: true },
    { id: "analytics", icon: "👤", label: "Skill Profile" },
    { id: "courses", icon: "📚", label: "My Courses" },
    { id: "leaderboard", icon: "🏆", label: "Leaderboard" },
    { section: "INFO" },
    { id: "aboutus", icon: "👥", label: "About Us" },
    { id: "contact", icon: "✉️", label: "Contact Us" },
  ];

  const searchItems = SIDEBAR.filter(s => s.id && s.label.toLowerCase().includes(search.toLowerCase()));

  /* ── CHECKPOINT TEST LOGIC (live AI Assessment) ───────── */
  const startTest = async (subjectOverride) => {
    const subject = subjectOverride || testSubject;
    if (subjectOverride) setTestSubject(subjectOverride);
    setTestLoading(true);
    setSelectedAnswer(null);
    try {
      const data = await checkpointService.getQuestions(subject);
      setTestQuestions(data.questions || []);
      setTestState({ started: true, q: 0, answers: [], score: null, correct: 0, total: data.questions?.length || 5, submitting: false, feedback: null, review: [], analysis: null });
    } catch (err) {
      console.error("Failed to fetch questions:", err);
      alert("Could not load questions. Please try again.");
    } finally {
      setTestLoading(false);
    }
  };

  const answerQ = async (idx) => {
    if (testState.submitting) return; // Prevent double-submit
    setSelectedAnswer(idx);
    const newAnswers = [...testState.answers, idx];

    // Short visual delay so user sees selection
    await new Promise(r => setTimeout(r, 300));
    setSelectedAnswer(null);

    if (testState.q + 1 < testQuestions.length) {
      setTestState(p => ({ ...p, q: p.q + 1, answers: newAnswers }));
    } else {
      // Last question — submit to backend for ML evaluation
      setTestState(p => ({ ...p, submitting: true, answers: newAnswers }));
      try {
        const result = await checkpointService.submitCheckpoint(testSubject, newAnswers, testQuestions);
        setTestState(p => ({
          ...p,
          answers: newAnswers,
          score: result.score,
          correct: result.correct,
          total: result.total,
          feedback: result.feedback,
          review: result.review || [],
          analysis: result.analysis || null,
          submitting: false,
        }));
        // Refresh dashboard data
        fetchDashboardData();
      } catch (err) {
        console.error("Submit error:", err);
        setTestState(p => ({ ...p, submitting: false, score: -1, correct: 0, total: newAnswers.length, review: [], analysis: null }));
      }
    }
  };

  const resetTest = () => {
    setTestState({ started: false, q: 0, answers: [], score: null, correct: 0, total: 0, submitting: false, feedback: null, review: [], analysis: null });
    setTestQuestions([]);
    setSelectedAnswer(null);
  };

  /* ── MARK RESOURCE AS READ ────────────────────────────── */
  const _markResource = async (topicKey, resourceKey, nodeIdx) => {
    // 1. Update localStorage
    const prev = JSON.parse(localStorage.getItem('ss_resources') || '{}');
    const topicData = { ...(prev[topicKey] || {}), [resourceKey]: true };
    const updated = { ...prev, [topicKey]: topicData };
    localStorage.setItem('ss_resources', JSON.stringify(updated));
    setResourcesRead(updated);

    // 2. Streak: if first resource marked today, create+toggle a task (triggers backend streak)
    if (!todayStreakMarked) {
      setTodayStreakMarked(true);
      localStorage.setItem('ss_streak_day', new Date().toDateString());
      try {
        const newTask = await taskService.createTask({
          text: `📚 Study: ${topicKey}`,
          subject: _topicDrawer?.subject || 'Roadmap',
          type: 'topic',
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });
        await taskService.toggleTask(newTask._id);
        await fetchDashboardData(); // refresh streak on dashboard
      } catch (e) { console.error('Streak update error', e); }
    }

    // 3. Auto-complete roadmap node when all 3 videos are watched
    const allVidsMarked = [0, 1, 2].every(i => topicData[`v${i}`]);
    if (allVidsMarked && nodeIdx !== undefined && nodeIdx !== null) {
      try {
        await roadmapService.updateNodeStatus(nodeIdx, 'done');
        await fetchDashboardData(); // refresh roadmap progress bars
      } catch (e) { console.error('Node complete error', e); }
    }
  };

  /* ── ROADMAP GENERATION logic ───────────────────────────── */
  const _handleGenerateRoadmap = async () => {
    const subjectToGen = customTopic.trim() || roadmapSubject;
    if (!subjectToGen) return;

    setGeneratingRoadmap(true);
    try {
      // Ask backend to generate a personalized roadmap for ONLY the selected subject
      await roadmapService.generateRoadmap([subjectToGen]);
      setCustomTopic(""); // clear input after generation
      if (customTopic.trim()) setRoadmapSubject(customTopic.trim());
      await fetchDashboardData(); // Re-fetch dashboard data to show the new roadmap
    } catch (err) {
      console.error("Failed to generate roadmap:", err);
      alert("Failed to generate roadmap. Please try again.");
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  /* ── LEADERBOARD fetch ──────────────────────────────────── */
  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const data = await aiService.getLeaderboard();
      setLeaderboard(data || []);
    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active === "leaderboard") fetchLeaderboard();
  }, [active, fetchLeaderboard]);

  /* ── AI ADVICE fetch ────────────────────────────────────── */
  const fetchAiAdvice = useCallback(async () => {
    if (aiAdvice) return; // only fetch once
    setAiLoading(true);
    try {
      const data = await aiService.getStudyAdvice();
      setAiAdvice(data.advice);
    } catch (err) {
      console.error("AI advice error:", err);
      setAiAdvice("Keep going! Consistency is the key to mastering any subject.");
    } finally {
      setAiLoading(false);
    }
  }, [aiAdvice]);

  useEffect(() => {
    if (active === "dashboard" && !loading) fetchAiAdvice();
  }, [active, loading, fetchAiAdvice]);

  /* ── ADD TASK handler ───────────────────────────────────── */
  const handleAddTask = async () => {
    if (!newTask.text.trim()) return;
    setTaskAdding(true);
    try {
      const created = await taskService.createTask(newTask);
      setTasks(prev => [...prev, { ...created, id: created._id, subj: created.subject }]);
      setNewTask({ text: "", subject: "DSA", time: "9:00 AM", type: "topic" });
      setModal(null);
    } catch (err) {
      console.error("Add task error:", err);
      alert("Failed to add task. Please try again.");
    } finally {
      setTaskAdding(false);
    }
  };

  /* ── DELETE TASK handler ─────────────────────────────────── */
  const handleDeleteTask = async (taskId) => {
    try {
      await taskService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  /* ── Task toggle (live) ─────────────────────────────────── */
  const handleToggleTask = async (taskId) => {
    // Optimistic update immediately
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    try {
      const result = await taskService.toggleTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...result.task, id: result.task._id, subj: result.task.subject } : t));
      if (result.streak) setStreak(result.streak);
    } catch (err) {
      console.error("Toggle task error:", err);
      // Revert optimistic update on failure
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    }
  };

  return (
    <div className="dash-wrap">
      {/* MOBILE SIDEBAR OVERLAY */}
      {sbOpen && <div className="sidebar-overlay" onClick={() => setSbOpen(false)}></div>}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sbOpen ? "open" : ""}`} style={{ "--sw": sbOpen ? "240px" : "62px" }}>
        <div className="sb-top" onClick={() => setSbOpen(s => !s)}>
          <div className="sb-logo-box">
            <img src={logo} alt="logo" className="sb-logo-img" />
          </div>
          <span className={`sb-logo-name ${!sbOpen ? "hide" : ""}`}>Wanderer</span>
        </div>
        <div className="sb-nav">
          {SIDEBAR.map((s, i) => s.section
            ? sbOpen ? <div key={i} className="sb-section">{s.section}</div> : null
            : (
              <div key={s.id} className={`sb-item ${active === s.id ? "on" : ""}`} onClick={() => setActive(s.id)} title={!sbOpen ? s.label : ""}>
                <span className="sb-icon">{s.icon}</span>
                <span className={`sb-lbl ${!sbOpen ? "hide" : ""}`}>{s.label}</span>
                {s.isStarred && sbOpen && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '12px',
                      filter: 'drop-shadow(0 0 5px rgba(250, 204, 21, 0.8))',
                      display: 'flex',
                      alignItems: 'center',
                      userSelect: 'none'
                    }}
                    title="Key Feature"
                  >
                    ⭐
                  </span>
                )}
                {s.badge && sbOpen && !s.isStarred && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(199, 110, 26, 0.4)'
                  }}>
                    {s.badge}
                  </span>
                )}
              </div>
            )
          )}

          {/* ── Little Cards Below Navigation ── */}
          {sbOpen && (
            <div className="sb-cards-wrap">
              {/* Little Card 1: Daily Momentum & Focus Telemetry */}
              <div
                className="sb-little-card"
                onClick={() => setActive("focusstudio")}
                title="Open Focus Studio"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span className="sb-card-badge">🔥 MOMENTUM</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ochre)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {streak > 0 ? `${streak}d Streak` : '1d Active'}
                  </span>
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--pine)', fontFamily: 'var(--font-serif)', lineHeight: 1.25 }}>
                  Focus Index: {focus.score}%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${focus.score}%`, height: '100%', background: focus.score > 70 ? 'var(--pine)' : 'var(--ochre)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--slate-subtle)', fontFamily: 'var(--font-mono)' }}>
                    {focusStats.todayMinutes ? `${focusStats.todayMinutes}m` : 'Live'}
                  </span>
                </div>
              </div>

              {/* Little Card 2: Active Pathway Quick-Access */}
              <div
                className="sb-little-card"
                onClick={() => setActive("roadmap")}
                title="Open Linear Pathway"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span className="sb-card-badge" style={{ color: 'var(--pine)', borderColor: 'var(--contour-active)', background: 'rgba(24, 55, 40, 0.08)' }}>
                    🚀 TRACK
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--slate-subtle)', fontFamily: 'var(--font-mono)' }}>
                    {completionPct ? `${completionPct}%` : 'In Progress'}
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--pine)', fontFamily: 'var(--font-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeRoadmap?.goal || "Full-Stack Engineer"}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--slate-subtle)' }}>{activeRoadmap?.phases?.length || 4} Phases</span>
                  <span style={{ color: 'var(--ochre)', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>Resume →</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="sb-foot" style={{ padding: '12px 10px', width: '100%', boxSizing: 'border-box' }}>
          <div className="profile-wrap" ref={profRef} style={{ width: '100%', margin: 0 }}>
            <div className="profile-btn" onClick={() => setProfOpen(o => !o)} style={{ padding: sbOpen ? '8px' : '4px', width: '100%', display: 'flex', justifyContent: 'center', background: 'transparent', border: sbOpen ? '1px solid var(--border)' : 'none', borderRadius: 12, transition: 'background 0.2s', boxSizing: 'border-box' }}>
              {liveUser.profilePic ? (
                <img src={liveUser.profilePic} style={{ width: sbOpen ? 34 : 32, height: sbOpen ? 34 : 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="Profile" />
              ) : (
                <div className="profile-av" style={{ width: sbOpen ? 34 : 32, height: sbOpen ? 34 : 32, fontSize: sbOpen ? 14 : 12, flexShrink: 0 }}>{liveUser.av}</div>
              )}
              {sbOpen && (
                <>
                  <div style={{ marginLeft: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', flex: 1 }}>
                    <span className="profile-name" style={{ fontSize: 13, fontWeight: 700, margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', textAlign: 'left' }}>{liveUser.name}</span>
                    <span style={{ fontSize: 10, color: "var(--accent)", textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', textAlign: 'left', fontWeight: 600 }}>{liveUser.branch && liveUser.sem ? `${liveUser.branch} · Sem ${liveUser.sem}` : liveUser.roll || liveUser.education || 'Student'}</span>
                  </div>
                  <span style={{ fontSize: 18, color: "var(--muted)", alignSelf: 'center', marginLeft: 4, lineHeight: 1 }}>▴</span>
                </>
              )}
            </div>
            {profOpen && (
              <div className="pdrop" style={{ bottom: 'calc(100% + 10px)', top: 'auto', left: sbOpen ? 0 : '70px', right: 'auto', width: '220px', transform: 'none', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' }}>
                <div className="pdrop-head">
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{liveUser.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{liveUser.email}</div>
                  <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>{liveUser.roll} · {liveUser.branch}</div>
                </div>
                <div className="pdrop-item" onClick={() => { setModal({ type: "editProfile" }); setProfOpen(false); }}>✏️<span>Edit Profile</span></div>
                <div className="pdrop-item" onClick={() => { setModal({ type: "settings" }); setProfOpen(false); }}>⚙️<span>Settings</span></div>
                <div className="pdrop-item danger" onClick={() => navigate("/")}>↪<span>Logout</span></div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="dash-main">
        {/* NAVBAR */}
        <nav className="dash-nav">
          <button className="toggle-sb" onClick={() => setSbOpen(s => !s)}>☰</button>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input className="search-inp" placeholder="Search pages, topics..." value={search}
              onChange={e => setSearch(e.target.value)} onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 150)} />
            {searchOpen && search.length > 0 && (
              <div className="search-drop">
                {searchItems.length > 0 ? searchItems.map(r => (
                  <div key={r.id} className="search-drop-item" onMouseDown={() => { setActive(r.id); setSearch(""); }}>
                    <span>{r.icon}</span><span>{r.label}</span>
                  </div>
                )) : <div className="search-drop-item" style={{ color: "var(--muted)" }}>No results</div>}
              </div>
            )}
          </div>

          {/* FOCUS BADGE */}
          <div
            className="focus-badge"
            title="Click to launch Focus"
            style={{ cursor: "pointer" }}
            onClick={() => setActive("focusstudio")}
          >
            <div className="focus-dot" style={{ background: focus.score > 70 ? "var(--accent)" : focus.score > 40 ? "var(--yellow)" : "var(--red)" }}></div>
            <div className="focus-score-box">
              <span className="focus-score-val" style={{ color: focus.score > 70 ? "var(--accent)" : focus.score > 40 ? "var(--yellow)" : "var(--red)" }}>
                {focus.score}%
              </span>
              <span className="focus-score-lbl">Focus ⏱️</span>
            </div>
            <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid var(--border)", display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{focus.tabSwitches}</span>
              <span style={{ fontSize: 9, color: "var(--muted)", textTransform: 'uppercase' }}>Switches</span>
            </div>
          </div>
        </nav>

        {/* CONTENT */}
        <div className={`dash-content ${active === "aiadvisor" ? "dash-content-full" : ""}`}>


          {/* ── DASHBOARD HOME ── */}
          {active === "dashboard" && (
            <div>
              <div className="dash-header">
                <div>
                  <h1 className="page-h">
                    Welcome back, {liveUser.name.split(" ")[0]}.
                  </h1>
                  <p className="page-sub">Here is your active learning velocity, curriculum telemetry, and upcoming checkpoints.</p>
                </div>
                <div className="date-badge">
                  <span>📅</span>
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>

              {/* AI ADVICE CARD */}
              {(aiAdvice || aiLoading) && (
                <div className="flex-resp" style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, padding: "20px 24px", marginBottom: 22, alignItems: "flex-start", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", fontWeight: 700, color: "var(--ochre)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Wanderer AI Dispatch</div>
                    {aiLoading ? (
                      <div style={{ fontSize: "0.9rem", color: "var(--slate-subtle)", fontStyle: "italic" }}>Synthesizing personalized study recommendations...</div>
                    ) : (
                      <div style={{ fontSize: "0.94rem", color: "var(--slate)", lineHeight: 1.65 }}>{aiAdvice}</div>
                    )}
                  </div>
                </div>
              )}

              {/* STAT CARDS */}
              <div className="g4">
                {[
                  { label: "Overall Progress", val: `${risk}%`, sub: `${roadmapProgress?.length || enrolledCourses?.length || 0} subjects`, color: "var(--accent)" },
                  { label: "Tasks Today", val: `${doneTasks}/${totalTasks}`, sub: "Completed", color: "var(--accent3)" },
                  { label: "Streak", val: `${streak} days`, sub: "Keep it up!", color: "var(--accent4)" },
                  { label: "Risk Level", val: riskLabel, sub: "Status", color: riskColor },
                ].map(s => (
                  <div className="wg" key={s.label}>
                    <div className="wg-title">{s.icon} {s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: "var(--display)" }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="g2">
                {/* ROADMAP PROGRESS */}
                <div className="wg">
                  <div className="wg-title">
                    <span>Roadmap Progress</span>
                    <span
                      style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", cursor: "pointer" }}
                      onClick={() => setActive("roadmap")}
                    >
                      ✨ My Path →
                    </span>
                  </div>
                  {roadmapProgress.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>No active pathway generated yet.</p>
                      <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={() => setActive("roadmap")}>
                        ✨ Architect Learning Path
                      </button>
                    </div>
                  ) : (
                    roadmapProgress.map(r => (
                      <div key={r.topic} style={{ marginBottom: 11 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{r.topic}</span>
                          <span style={{ color: r.color, fontWeight: 700 }}>{r.pct}%</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${r.pct}%`, background: r.color }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* CHECKPOINT SCORES */}
                <div className="wg">
                  <div className="wg-title">
                    <span>Checkpoint Scores</span>
                    <span
                      style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", cursor: "pointer" }}
                      onClick={() => setActive("checkpoint")}
                    >
                      🧪 Take Test →
                    </span>
                  </div>
                  {cpScores.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>No checkpoint tests completed yet.</p>
                      <button className="lp-btn lp-btn-secondary lp-btn-sm" onClick={() => setActive("checkpoint")}>
                        🧪 Start Checkpoint Test
                      </button>
                    </div>
                  ) : (
                    cpScores.map((c, i) => (
                      <div key={`${c.subject}-${c.week}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 60 }}>{c.label || c.week}</span>
                        <div className="bar-track" style={{ flex: 1 }}>
                          <div className="bar-fill" style={{ width: `${c.s}%`, background: c.s >= 70 ? "var(--green)" : c.s >= 50 ? "var(--yellow)" : "var(--red)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 34, textAlign: "right", color: c.s >= 70 ? "var(--green)" : c.s >= 50 ? "var(--yellow)" : "var(--red)" }}>
                          {c.s}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="g3">
                {/* TODAY'S TASKS */}
                <div className="wg" style={{ gridColumn: "span 2" }}>
                  <div className="wg-title" style={{ cursor: "default" }}>📅 Today's Study Tasks
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", cursor: "pointer" }}
                      onClick={() => setModal({ type: "addTask" })}>+ Add Task</span>
                  </div>
                  {tasks.length === 0 && roadPath.length === 0 && (
                    <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>No tasks today. Click "+ Add Task" or generate a learning path to get started!</div>
                  )}
                  {tasks.slice(0, 5).map(t => (
                    <div key={t.id} className="task-row">
                      <div className={`task-cb ${t.done ? "done" : ""}`} onClick={e => { e.stopPropagation(); handleToggleTask(t.id); }}>{t.done ? "✓" : ""}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "var(--text)" }}>{t.text}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.time} · {t.subj} · {t.type}</div>
                      </div>
                      <span style={{ fontSize: 15, cursor: "pointer", color: "var(--muted)", padding: "0 4px" }}
                        onClick={() => handleDeleteTask(t.id)} title="Delete task">🗑️</span>
                    </div>
                  ))}
                  {/* Roadmap-derived tasks from active MongoDB curriculum */}
                  {roadPath.filter(n => n.status === "current" || n.status === "pending").slice(0, 3).map((node, idx) => (
                    <div key={`rm-${idx}`} className="task-row" style={{ cursor: "pointer" }} onClick={() => { setActive("roadmap"); }}>
                      <div className="task-cb" style={{ background: "rgba(99,102,241,0.15)", borderColor: "var(--accent)" }}>
                        {node.status === "current" ? "⚡" : "📖"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{node.topic}</div>
                        <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>
                          {node.day} · {node.subject || roadmapSubject} · {node.status === "current" ? "Current Active Step" : "Upcoming Milestone"}
                        </div>
                      </div>
                      <span style={{ fontSize: 13, color: "var(--accent)" }}>→</span>
                    </div>
                  ))}
                </div>

                {/* RISK LEVEL */}
                <div className="wg">
                  <div className="wg-title">⚠️ Risk Level</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120 }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${riskColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", animation: "glow 2s ease-in-out infinite" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: riskColor, fontFamily: "var(--display)" }}>{risk}%</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: riskColor, marginTop: 10 }}>{riskLabel}</div>
                  </div>
                </div>
              </div>

              <div className="g2" style={{ marginBottom: 20 }}>
                {/* WEAK TOPIC HEATMAP */}
                <div className="wg" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div className="wg-title" style={{ marginBottom: 4 }}>🔥 Weak Topic Diagnostics</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                      Topics requiring targeted revision based on milestone performance
                    </div>
                    {weakTopics.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {weakTopics.slice(0, 3).map(t => (
                          <div key={t.t} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{t.t}</span>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 6, background: t.lvl === "critical" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: t.lvl === "critical" ? "var(--red)" : "var(--yellow)" }}>
                                {t.s}% · {t.lvl === "critical" ? "Needs Review" : "In Progress"}
                              </span>
                            </div>
                            <div className="bar-track" style={{ height: 4 }}>
                              <div className="bar-fill" style={{ width: `${Math.max(t.s, 6)}%`, background: t.lvl === "critical" ? "var(--red)" : "var(--yellow)" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                        ✨ All monitored topics currently at high retention score!
                      </div>
                    )}
                  </div>
                </div>

                {/* CONSISTENCY TRACKER (COMPACT CALENDAR) */}
                <div className="wg" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div className="wg-title" style={{ margin: 0 }}>🔗 Consistency Tracker</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>🔥</span> {streak} Day Streak
                      </div>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📅</span>
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                        <div key={i} style={{ fontSize: 9.5, textAlign: "center", color: "var(--muted)", fontWeight: 700, textTransform: 'uppercase' }}>
                          {d}
                        </div>
                      ))}
                      {(() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = now.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const slots = [];

                        // Padding days from previous month
                        for (let i = 0; i < firstDay; i++) {
                          slots.push(<div key={`pad-${i}`} style={{ height: 26 }} />);
                        }

                        // Actual days of current month
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const activity = consistencyData[dateStr] || 0;
                          const intensity = Math.min(activity, 5);
                          const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
                          const colors = ["var(--surface3)", "rgba(24,55,40,0.15)", "rgba(24,55,40,0.32)", "rgba(24,55,40,0.55)", "rgba(24,55,40,0.8)", "var(--pine)"];

                          slots.push(
                            <div
                              key={day}
                              title={`${dateStr}: ${activity} activities`}
                              style={{
                                height: 26,
                                background: colors[intensity],
                                border: isToday ? "1.5px solid var(--ochre)" : "1px solid var(--contour-faint)",
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: intensity > 2 ? "#fff" : "var(--ink)",
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                                position: 'relative'
                              }}
                            >
                              {day}
                              {activity > 0 && (
                                <div style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: intensity > 2 ? '#fff' : 'var(--ochre)' }} />
                              )}
                            </div>
                          );
                        }
                        return slots;
                      })()}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)", paddingTop: 8, borderTop: "1px solid var(--contour-faint)" }}>
                    <span>Active Study Heatmap</span>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span>Less</span>
                      {["var(--surface3)", "rgba(24,55,40,0.15)", "rgba(24,55,40,0.32)", "rgba(24,55,40,0.55)", "rgba(24,55,40,0.8)", "var(--pine)"].map((col, i) => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: col }} />
                      ))}
                      <span>More</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPCOMING CHECKPOINTS & BADGES */}
              <div className="g2">
                {/* UPCOMING CHECKPOINTS */}
                <div className="wg">
                  <div className="wg-title">
                    <span>⏰ Upcoming Checkpoints</span>
                    <span
                      style={{ marginLeft: "auto", fontSize: "0.76rem", color: "var(--ochre)", cursor: "pointer", fontWeight: 700 }}
                      onClick={() => setActive("roadmap")}
                    >
                      My Path →
                    </span>
                  </div>
                  {activeRoadmap && Array.isArray(activeRoadmap.phases) && activeRoadmap.phases.length > 0 ? (
                    activeRoadmap.phases.slice(0, 2).map((phase, pIdx) => (
                      <div key={pIdx} style={{ background: "var(--paper)", border: "1px solid var(--contour-active)", borderRadius: 4, padding: "14px 16px", marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.94rem", color: "var(--pine)" }}>{phase.title || `Phase ${pIdx + 1}`}</div>
                          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.1)", color: "var(--pine)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                            Phase {pIdx + 1}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--slate)", marginBottom: 10 }}>
                          {phase.theme || `${phase.courses?.length || 0} milestones to verify`}
                        </div>
                        <button
                          className="btn-primary"
                          style={{ width: "100%", padding: "9px", fontSize: "0.88rem" }}
                          onClick={() => {
                            setActive("checkpoint");
                            startTest(phase.title || activeRoadmap.goal || "DSA");
                          }}
                        >
                          🧪 Take Phase {pIdx + 1} Checkpoint →
                        </button>
                      </div>
                    ))
                  ) : cpScores.length > 0 ? (
                    Object.entries(
                      cpScores.reduce((acc, c) => { acc[c.week] = c; return acc; }, {})
                    ).slice(-2).map(([week, c], i) => (
                      <div key={i} style={{ background: "var(--surface2)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Checkpoint {week}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Score: {c.s}%</div>
                        <button className="btn-primary" style={{ marginTop: 8, width: "100%", padding: "9px", fontSize: 13 }} onClick={() => { setActive("checkpoint"); startTest(c.subject); }}>Retake →</button>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "20px 0", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>No upcoming checkpoints. Architect a path in My Path to generate milestone tests!</p>
                      <button className="btn-primary" style={{ padding: "8px 18px", fontSize: 13 }} onClick={() => setActive("roadmap")}>
                        ✨ Architect Pathway →
                      </button>
                    </div>
                  )}
                </div>

                {/* BADGES */}
                <div className="wg">
                  <div className="wg-title">🏆 Badges Earned</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {badges.length > 0 ? badges.map(b => (
                      <div key={b.name} className="badge" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                        <span>{b.icon}</span><span>{b.name}</span>
                      </div>
                    )) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>Complete checkpoints and focus sessions to unlock badges:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {[
                            { icon: "🏆", name: "Top Scorer", desc: "80%+ score" },
                            { icon: "⏱️", name: "Deep Work Titan", desc: "1h focus" },
                            { icon: "🔥", name: "Streak Pioneer", desc: "Daily study" },
                          ].map(b => (
                            <span key={b.name} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                              {b.icon} {b.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
                    🔥 Streak: {streak} Day{streak !== 1 ? 's' : ''} · Keep learning to level up!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AI ADVISOR ── */}
          {active === "aiadvisor" && (
            <AiAdvisorChat
              userProfile={{
                name: liveUser.name || "Learner",
                goal: roadmapSubject ? `${roadmapSubject.toUpperCase()} Mastery` : (liveUser.branch ? `${liveUser.branch} Engineering` : "Software Engineering"),
                level: liveUser.year === "1st" ? "Beginner" : liveUser.year === "2nd" || liveUser.year === "3rd" ? "Intermediate" : "Advanced",
                timeline: "3-4 Months",
                interests: enrolledCourses.length > 0 ? enrolledCourses : ["Web Development", "DSA", "Cloud Architecture"],
                completedCount: (roadPath || []).filter(n => n.status === "done").length,
              }}
              showProfilePanel={true}
              onNavigateToPath={() => setActive("roadmap")}
            />
          )}

          {/* ── MY PATH (ADAPTIVE LEARNING ROADMAP) ── */}
          {active === "roadmap" && (
            <LearningPath
              userProfile={{
                name: liveUser.name || "Learner",
                goal: roadmapSubject ? `${roadmapSubject.toUpperCase()} Mastery` : (liveUser.branch ? `${liveUser.branch} Engineering` : "Full Stack Engineer"),
                level: liveUser.year === "1st" ? "Beginner" : liveUser.year === "2nd" || liveUser.year === "3rd" ? "Intermediate" : "Advanced",
                interests: enrolledCourses.length > 0 ? enrolledCourses : ["Web Development", "DSA", "System Design"],
              }}
              onLaunchFocusStudio={() => {
                setActive("focusstudio");
              }}
              onProgressUpdate={() => {
                fetchDashboardData();
              }}
            />
          )}

          {/* ── CHECKPOINT TESTS ── */}
          {active === "checkpoint" && (
            <div>
              <div className="page-h">🎯 Adaptive AI Checkpoint Tests</div>
              <div className="page-sub">Real-time multi-dimensional evaluation generated by AI. Tests adapt dynamically to your active roadmap milestones.</div>

              {!testState.started ? (
                <>
                  {/* 1. Active Pathway Milestone Tests */}
                  {activeRoadmap && Array.isArray(activeRoadmap.phases) && activeRoadmap.phases.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--pine)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-serif)" }}>
                        <span>🗺️</span> Active Pathway Phase Checkpoints ({activeRoadmap.goal || activeRoadmap.title || "Curriculum"})
                      </div>
                      <div className="g2" style={{ gap: 14 }}>
                        {activeRoadmap.phases.map((phase, pIdx) => {
                          const isSelected = testSubject === phase.title;
                          return (
                            <div
                              key={pIdx}
                              style={{
                                background: isSelected ? "rgba(24, 55, 40, 0.08)" : "var(--paper-card)",
                                border: `1.5px solid ${isSelected ? "var(--pine)" : "var(--contour-active)"}`,
                                borderRadius: 4,
                                padding: "18px 20px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: "all 0.2s ease",
                                boxShadow: "var(--shadow)"
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                  <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.1)", color: "var(--pine)", border: "1px solid var(--contour-active)", fontFamily: "var(--font-mono)" }}>
                                    Phase {pIdx + 1}
                                  </span>
                                  <span style={{ fontSize: "0.76rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>
                                    {phase.courses?.length || 3} Milestones
                                  </span>
                                </div>
                                <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--pine)", marginBottom: 6, lineHeight: 1.3, fontFamily: "var(--font-serif)" }}>
                                  {phase.title || `Phase ${pIdx + 1}`}
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "var(--slate)", marginBottom: 16, lineHeight: 1.45 }}>
                                  {phase.theme || "Core competencies and foundational principles"}
                                </div>
                              </div>
                              <button
                                className="btn-primary"
                                style={{ width: "100%", padding: "9px 14px", fontSize: "0.85rem", fontWeight: 700 }}
                                onClick={() => startTest(phase.title || `Phase ${pIdx + 1}`)}
                                disabled={testLoading}
                              >
                                {testLoading && testSubject === phase.title ? "⚡ Generating AI Test..." : `🚀 Start Phase ${pIdx + 1} Test →`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Custom Topic / Custom Diagnostic Generator */}
                  <div style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, marginBottom: 24, padding: "24px 26px", boxShadow: "var(--shadow)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 600, color: "var(--pine)" }}>
                        ✨ Custom AI Topic Diagnostic
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(199, 110, 26, 0.1)", color: "var(--ochre)", border: "1px solid rgba(199, 110, 26, 0.25)", fontFamily: "var(--font-mono)" }}>
                        🧠 Dynamic LLM Generation
                      </span>
                    </div>
                    <div style={{ fontSize: "0.86rem", color: "var(--slate)", marginBottom: 14 }}>
                      Type any topic, concept, or interview domain to generate an instant 100% unique checkpoint test with AI evaluation.
                    </div>

                    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                      <input
                        type="text"
                        placeholder="e.g., Quantum Entanglement, Graph Algorithms, React Hooks, System Design..."
                        value={customTopic}
                        onChange={(e) => {
                          setCustomTopic(e.target.value);
                          setTestSubject(e.target.value);
                        }}
                        style={{
                          flex: 1,
                          minWidth: 220,
                          padding: "11px 16px",
                          borderRadius: 3,
                          background: "var(--paper)",
                          border: "1.5px solid var(--border)",
                          color: "var(--ink)",
                          fontSize: "0.88rem",
                          outline: "none"
                        }}
                      />
                      <button
                        className="btn-primary"
                        style={{ padding: "11px 22px", fontSize: "0.86rem", fontWeight: 700, whiteSpace: "nowrap" }}
                        onClick={() => startTest(customTopic.trim() || testSubject || "Software Engineering")}
                        disabled={testLoading || (!customTopic.trim() && !testSubject)}
                      >
                        {testLoading ? "⚡ Generating AI Quiz..." : "✨ Generate AI Test →"}
                      </button>
                    </div>

                    {/* Quick Suggestion Chips */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "0.74rem", color: "var(--slate-subtle)", fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Quick Topics:</span>
                      {[
                        activeRoadmap?.goal || "Quantum Computing",
                        "Data Structures & Algorithms",
                        "Web Development Architecture",
                        "Operating Systems & Concurrency",
                        "Machine Learning Foundations",
                        "Database Systems & SQL"
                      ].map(topic => (
                        <button
                          key={topic}
                          onClick={() => {
                            setCustomTopic(topic);
                            setTestSubject(topic);
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 2,
                            border: `1px solid ${testSubject === topic ? "var(--pine)" : "var(--border)"}`,
                            background: testSubject === topic ? "var(--pine)" : "var(--paper)",
                            color: testSubject === topic ? "var(--paper)" : "var(--slate)",
                            fontSize: "0.74rem",
                            fontFamily: "var(--font-mono)",
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Past Results History */}
                  <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--pine)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-serif)" }}>
                    <span>📊</span> Past Checkpoint Diagnostics
                  </div>
                  {cpScores.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {cpScores.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, padding: "12px 18px", boxShadow: "var(--shadow)" }}>
                          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--ochre)", width: 34, fontFamily: "var(--font-mono)" }}>{c.week}</span>
                          <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--pine)", flex: 1, fontFamily: "var(--font-serif)" }}>{c.subject || "Checkpoint Diagnostic"}</span>
                          <div className="bar-track" style={{ width: 140, height: 6, background: "var(--paper)", border: "1px solid var(--contour-faint)", borderRadius: 2 }}>
                            <div className="bar-fill" style={{ width: `${c.s}%`, background: c.s >= 80 ? "var(--pine)" : c.s >= 50 ? "var(--ochre)" : "var(--red)" }} />
                          </div>
                          <span style={{ fontWeight: 700, color: c.s >= 80 ? "var(--pine)" : c.s >= 50 ? "var(--ochre)" : "var(--red)", width: 44, textAlign: "right", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
                            {c.s}%
                          </span>
                          <button
                            className="btn-outline"
                            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                            onClick={() => startTest(c.subject)}
                          >
                            Retake 🔁
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "var(--slate-subtle)", fontSize: "0.88rem", padding: "12px 0", fontFamily: "var(--font-mono)" }}>No checkpoint results recorded yet. Launch your first test above!</div>
                  )}
                </>
              ) : testState.submitting ? (
                <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "60px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 600, color: "var(--pine)" }}>Submitting your answers...</div>
                  <div style={{ fontSize: "0.88rem", color: "var(--slate)", marginTop: 8 }}>Calculating your results...</div>
                </div>
              ) : testState.score !== null ? (
                <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 0" }}>
                  {/* Score Hero */}
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 64, marginBottom: 8 }}>
                      {testState.score < 0 ? "⚠️" : testState.score >= 80 ? "🏆" : testState.score >= 50 ? "⚡" : "❌"}
                    </div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "2.8rem", fontWeight: 600, color: testState.score < 0 ? "var(--red)" : testState.score >= 80 ? "var(--pine)" : testState.score >= 50 ? "var(--ochre)" : "var(--red)" }}>
                      {testState.score < 0 ? "Error" : `${testState.score}%`}
                    </div>
                    <div style={{ fontSize: "0.95rem", color: "var(--slate)", margin: "6px 0 14px" }}>
                      {testState.score >= 0 ? `${testState.correct} out of ${testState.total} correct` : "Could not submit. Try again."}
                    </div>
                    {/* Feedback chip */}
                    {testState.score >= 0 && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 3, border: `1.5px solid ${testState.score >= 80 ? "var(--pine)" : testState.score >= 50 ? "var(--ochre)" : "var(--red)"}`, background: testState.score >= 80 ? "rgba(24,55,40,0.1)" : testState.score >= 50 ? "rgba(199,110,26,0.1)" : "rgba(239,68,68,0.1)", fontSize: "0.86rem", fontWeight: 600, color: testState.score >= 80 ? "var(--pine)" : testState.score >= 50 ? "var(--ochre)" : "var(--red)" }}>
                        {testState.score >= 80 ? "✅ Exceptional! Ready for advanced milestone projects." : testState.score >= 50 ? "⚠️ Moderate — revision recommended for missed concepts." : "🔃 Below 50% — consider targeted review in Focus Studio."}
                      </div>
                    )}
                  </div>

                  {/* ML Recommendation Card */}
                  {testState.analysis?.recommendation && (
                    <div style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderLeft: "3px solid var(--ochre)", borderRadius: 4, padding: "16px 20px", marginBottom: 24, boxShadow: "var(--shadow)" }}>
                      <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--ochre)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                        <span>🤖</span> AI Diagnostic & ML Recommendations
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--slate)", lineHeight: 1.6 }}>
                        {testState.analysis.recommendation}
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  {testState.score >= 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
                      {[
                        { label: "Accuracy Score", val: `${testState.score}%`, color: testState.score >= 80 ? "var(--pine)" : testState.score >= 50 ? "var(--ochre)" : "var(--red)" },
                        { label: "Correct Answers", val: `${testState.correct}/${testState.total}`, color: "var(--pine)" },
                        { label: "Tested Subject", val: testSubject.length > 18 ? testSubject.substring(0, 16) + '...' : testSubject, color: "var(--ochre)" },
                      ].map(s => (
                        <div key={s.label} style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, padding: "14px", textAlign: "center", boxShadow: "var(--shadow)" }}>
                          <div style={{ fontSize: "1.5rem", fontWeight: 600, color: s.color, fontFamily: "var(--font-serif)" }}>{s.val}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--slate-subtle)", marginTop: 3, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Question-by-Question AI Review & Explanations */}
                  {Array.isArray(testState.review) && testState.review.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--pine)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-serif)" }}>
                        <span>📋</span> Question-by-Question Evaluation & Explanations
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {testState.review.map((item, rIdx) => (
                          <div key={rIdx} style={{ background: "var(--paper-card)", border: `1.5px solid ${item.isCorrect ? "var(--pine)" : "var(--red)"}`, borderRadius: 4, padding: "16px 18px", boxShadow: "var(--shadow)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--pine)", lineHeight: 1.4, fontFamily: "var(--font-serif)" }}>
                                {rIdx + 1}. {item.q}
                              </div>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, flexShrink: 0, background: item.isCorrect ? "rgba(24,55,40,0.1)" : "rgba(239,68,68,0.1)", color: item.isCorrect ? "var(--pine)" : "var(--red)", fontFamily: "var(--font-mono)" }}>
                                {item.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6, marginBottom: 10, fontSize: "0.82rem" }}>
                              {item.opts.map((opt, oIdx) => {
                                const isUser = item.userAns === oIdx;
                                const isTarget = item.correctAns === oIdx;
                                let bg = "var(--paper)";
                                let col = "var(--slate)";
                                let bdr = "var(--border)";
                                if (isTarget) {
                                  bg = "rgba(24, 55, 40, 0.1)";
                                  col = "var(--pine)";
                                  bdr = "var(--pine)";
                                } else if (isUser && !item.isCorrect) {
                                  bg = "rgba(239, 68, 68, 0.1)";
                                  col = "var(--red)";
                                  bdr = "var(--red)";
                                }
                                return (
                                  <div key={oIdx} style={{ padding: "6px 10px", borderRadius: 2, background: bg, border: `1px solid ${bdr}`, color: col, fontFamily: "var(--font-mono)" }}>
                                    <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt} {isUser && <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>(Your choice)</span>} {isTarget && <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>✓ Key</span>}
                                  </div>
                                );
                              })}
                            </div>

                            {item.explanation && (
                              <div style={{ fontSize: "0.84rem", color: "var(--slate)", background: "var(--paper)", borderLeft: "3px solid var(--ochre)", padding: "8px 12px", borderRadius: "0 3px 3px 0", lineHeight: 1.5 }}>
                                <strong style={{ color: "var(--pine)" }}>💡 Explanation:</strong> {item.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                    <button className="btn-primary" style={{ padding: "10px 24px", fontSize: "0.88rem" }} onClick={resetTest}>
                      🔁 Retake or Choose Subject
                    </button>
                    <button className="btn-outline" style={{ padding: "10px 24px", fontSize: "0.88rem" }}
                      onClick={() => { resetTest(); setActive("dashboard"); }}>
                      📊 View Dashboard
                    </button>
                    <button className="btn-outline" style={{ padding: "10px 24px", fontSize: "0.88rem", borderColor: "var(--pine)", color: "var(--pine)" }}
                      onClick={() => { resetTest(); setActive("roadmap"); }}>
                      🗺️ View Pathway
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: 660, margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: "0.84rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>Question {testState.q + 1} of {testQuestions.length}</span>
                    <span style={{ color: "var(--ochre)", fontWeight: 700, fontSize: "0.84rem", fontFamily: "var(--font-mono)" }}>{testSubject} · {Math.round((testState.q / (testQuestions.length || 1)) * 100)}% done</span>
                  </div>
                  <div className="bar-track" style={{ marginBottom: 22, height: 6, background: "var(--paper)", border: "1px solid var(--contour-faint)", borderRadius: 2 }}><div className="bar-fill" style={{ width: `${(testState.q / (testQuestions.length || 1)) * 100}%`, background: "var(--pine)" }} /></div>
                  <div style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, padding: "26px 28px", boxShadow: "var(--shadow)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--ochre)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)" }}>Question {testState.q + 1}</div>
                      {testQuestions[testState.q]?.type && (
                        <span style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 2,
                          background: "rgba(24,55,40,0.1)",
                          color: "var(--pine)",
                          border: "1px solid var(--contour-active)",
                          fontFamily: "var(--font-mono)",
                          textTransform: 'uppercase'
                        }}>
                          {testQuestions[testState.q].type === 'conceptual' ? '🧠 Conceptual' : testQuestions[testState.q].type === 'code_analysis' ? '💻 Logic Analysis' : testQuestions[testState.q].type === 'applied_scenario' ? '🔬 Applied Scenario' : '⚙️ Edge Diagnostics'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 600, marginBottom: 22, lineHeight: 1.5, color: "var(--pine)" }}>{testQuestions[testState.q]?.q}</div>
                    {testQuestions[testState.q]?.opts.map((opt, oi) => (
                      <button key={oi} onClick={() => answerQ(oi)}
                        disabled={selectedAnswer !== null}
                        style={{
                          width: "100%",
                          padding: "12px 18px",
                          background: selectedAnswer === oi ? "rgba(24,55,40,0.1)" : "var(--paper)",
                          border: `1.5px solid ${selectedAnswer === oi ? "var(--pine)" : "var(--border)"}`,
                          borderRadius: 3,
                          color: selectedAnswer === oi ? "var(--pine)" : "var(--ink)",
                          fontSize: "0.88rem",
                          textAlign: "left",
                          marginBottom: 10,
                          cursor: selectedAnswer !== null ? "default" : "pointer",
                          transition: "all 0.15s ease",
                          fontFamily: "var(--font-sans)",
                          display: "flex",
                          alignItems: "center"
                        }}>
                        <span style={{ fontWeight: 700, marginRight: 10, color: "var(--ochre)", fontFamily: "var(--font-mono)" }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FOCUS ── */}
          {active === "focusstudio" && (
            <div>
              <div className="dash-header" style={{ marginBottom: 18 }}>
                <div>
                  <div className="page-h">⏱️ Focus</div>
                  <div className="page-sub">
                    Master deep work with Pomodoro intervals, real-time Web Audio synthesis, and real-time distraction telemetry.
                  </div>
                </div>
              </div>

              {/* ── Live Focus Telemetry Card (matching top badge) ── */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
                padding: "18px 24px",
                background: "var(--paper-card)",
                border: "1.5px solid var(--contour-active)",
                borderRadius: 4,
                marginBottom: 22,
                boxShadow: "var(--shadow)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: focus.score > 70 ? "var(--pine)" : focus.score > 40 ? "var(--ochre)" : "var(--red)",
                    boxShadow: `0 0 8px ${focus.score > 70 ? "var(--pine)" : focus.score > 40 ? "var(--ochre)" : "var(--red)"}`,
                    flexShrink: 0
                  }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "1.85rem", fontWeight: 600, fontFamily: "var(--font-serif)", color: focus.score > 70 ? "var(--pine)" : focus.score > 40 ? "var(--ochre)" : "var(--red)" }}>
                        {focus.score}%
                      </span>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>
                        REAL-TIME FOCUS TELEMETRY ⏱️
                      </span>
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "var(--slate)", marginTop: 2 }}>
                      {focus.score > 70 ? "🔥 Optimum concentration level maintained. Zero active distraction." : focus.score > 40 ? "⚠️ Moderate focus. Minimize switching between external applications." : "🚨 High distraction index detected. Launch a Pomodoro sprint to reset concentration."}
                    </div>
                  </div>
                </div>

                <div style={{
                  paddingLeft: 20,
                  borderLeft: "1px solid var(--contour-faint)",
                  textAlign: "right"
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 600, fontFamily: "var(--font-serif)", color: "var(--pine)" }}>
                    {focus.tabSwitches}
                  </div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--slate-subtle)", letterSpacing: "0.04em", fontFamily: "var(--font-mono)" }}>
                    Tab Switches
                  </div>
                </div>
              </div>

              <div className="focus-workstation-grid">
                {/* Embedded Focus Studio Card */}
                <div>
                  <FocusStudio
                    isModal={false}
                    defaultTopic={roadmapSubject ? `${roadmapSubject.toUpperCase()} Deep Work` : "Deep Focus Session"}
                    onSessionComplete={({ streak: newStreak }) => {
                      fetchFocusData();
                      fetchDashboardData();
                      if (newStreak) setStreak(newStreak);
                    }}
                  />
                </div>

                {/* Focus Stats & History Card */}
                <div>
                  <div className="focus-stats-card">
                    <div style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text)" }}>
                      📊 Focus Analytics
                    </div>
                    <div className="focus-stats-grid">
                      <div className="focus-stat-item">
                        <div className="focus-stat-value">{formatFocusTime(focusStats.totalMinutes)}</div>
                        <div className="focus-stat-label">Total Focus Time</div>
                      </div>
                      <div className="focus-stat-item">
                        <div className="focus-stat-value" style={{ color: "var(--accent2, #6366f1)" }}>
                          {focusStats.totalSessions || 0}
                        </div>
                        <div className="focus-stat-label">Sessions Done</div>
                      </div>
                      <div className="focus-stat-item">
                        <div className="focus-stat-value" style={{ color: "var(--yellow, #f59e0b)" }}>
                          {formatFocusTime(focusStats.todayMinutes)}
                        </div>
                        <div className="focus-stat-label">Today's Focus</div>
                      </div>
                      <div className="focus-stat-item">
                        <div className="focus-stat-value" style={{ color: "var(--accent4, #ef4444)" }}>
                          🔥 {streak}d
                        </div>
                        <div className="focus-stat-label">Daily Streak</div>
                      </div>
                    </div>
                  </div>

                  <div className="focus-stats-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                        📜 Session History
                      </div>
                      <button
                        className="btn-outline"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        onClick={fetchFocusData}
                        title="Refresh history"
                      >
                        🔄
                      </button>
                    </div>

                    {focusLoading && focusSessions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13 }}>
                        Loading sessions...
                      </div>
                    ) : focusSessions.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13 }}>
                        No focus sessions logged yet. Complete a Pomodoro sprint on the left!
                      </div>
                    ) : (
                      <div className="focus-history-list">
                        {focusSessions.map((s) => {
                          const date = new Date(s.studiedAt || s.createdAt);
                          const dateStr = date.toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <div key={s._id || s.id} className="focus-history-item">
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                                  {s.topic || "Deep Focus Session"}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                  {dateStr}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className="focus-history-badge">
                                  {formatFocusTime(s.duration || (s.durationSeconds ? s.durationSeconds / 60 : 0))}
                                </span>
                                <button
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--muted)",
                                    fontSize: 13,
                                  }}
                                  title="Delete session"
                                  onClick={async () => {
                                    try {
                                      await studySessionService.deleteSession(s._id || s.id);
                                      fetchFocusData();
                                    } catch (e) {
                                      console.error("Delete error:", e);
                                    }
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PREREQUISITE COMPETENCY TREE (KNOWLEDGE GRAPH DAG) ── */}
          {active === "competency" && (
            <CompetencyStudio
              activeRoadmap={activeRoadmap}
              onStartTest={(subject) => {
                setActive("checkpoint");
                startTest(subject);
              }}
              onOpenFocusStudio={(topic) => {
                setModal({ type: "focusStudio", topic });
              }}
              onNavigateRoadmap={() => setActive("roadmap")}
            />
          )}

          {/* ── CAREER & JOB MATCH STUDIO ── */}
          {active === "careers" && (
            <CareerStudio
              user={liveUser}
              activeRoadmap={activeRoadmap}
              checkpointScore={liveUser.checkpointScore}
            />
          )}

          {/* ── SKILL PROFILE ── */}
          {active === "analytics" && (
            <div>
              <div className="page-h">👤 Developer Skill Profile</div>
              <div className="page-sub">Verified skills, domain proficiencies, and project portfolio.</div>

              {/* Developer Hero Card */}
              <div style={{
                background: "var(--paper-card)",
                border: "1.5px solid var(--contour-active)",
                borderRadius: 4,
                padding: "28px 32px",
                marginBottom: 24,
                boxShadow: "var(--shadow)",
                display: "flex",
                gap: 24,
                alignItems: "center",
                flexWrap: "wrap"
              }}>
                {/* Avatar with Pine Circle */}
                <div style={{
                  width: 86, height: 86, borderRadius: "50%",
                  background: "var(--pine)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, fontWeight: 700, color: "var(--paper)",
                  boxShadow: "0 4px 16px rgba(24, 55, 40, 0.2)", flexShrink: 0,
                  overflow: "hidden",
                  fontFamily: "var(--font-mono)"
                }}>
                  {liveUser.profilePic ? (
                    <img src={liveUser.profilePic} alt={liveUser.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    liveUser.av || "ST"
                  )}
                </div>

                {/* Profile Details */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.65rem", fontWeight: 600, margin: 0, color: "var(--pine)" }}>
                      {liveUser.name || "Student Developer"}
                    </h2>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.08)", color: "var(--pine)", border: "1px solid var(--contour-active)", fontFamily: "var(--font-mono)" }}>
                      ✓ Verified Learner
                    </span>
                  </div>

                  <div style={{ fontSize: "0.92rem", color: "var(--slate)", fontWeight: 500, marginBottom: 8 }}>
                    🎓 {liveUser.branch || "Computer Science"} Engineering · {liveUser.year || "4th Semester"} · {liveUser.education || "GLA University"}
                  </div>

                  <p style={{ fontSize: "0.92rem", color: "var(--slate-subtle)", margin: "0 0 14px", lineHeight: 1.6, maxWidth: 650 }}>
                    {liveUser.about || `Passionate technologist dedicated to mastering ${roadmapSubject || liveUser.goal || "Full-Stack Development, Data Structures, and Adaptive AI Systems"}. Actively architecting hands-on projects and verifying competencies through Wanderer.`}
                  </p>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {liveUser.email && (
                      <span style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 2, background: "var(--paper)", border: "1px solid var(--border)", color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                        📧 {liveUser.email}
                      </span>
                    )}
                    <span style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 2, background: "var(--paper)", border: "1px solid var(--border)", color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                      🎯 Goal: {roadmapSubject || liveUser.goal || "Software Engineering"}
                    </span>
                    <span style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 2, background: "rgba(199, 110, 26, 0.1)", border: "1px solid rgba(199, 110, 26, 0.3)", color: "var(--ochre)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      🔥 {streak} Day Streak
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                  <button
                    className="btn-primary"
                    style={{ padding: "10px 20px", fontSize: "0.9rem" }}
                    onClick={() => setModal({ type: "editProfile" })}
                  >
                    ✏️ Edit Profile Info
                  </button>
                </div>
              </div>

              {/* Quantified Competency Telemetry (4 Cards) */}
              <div className="g4" style={{ marginBottom: 24 }}>
                {[
                  { label: "Core Skills", val: `${(liveUser.skills?.split(',').filter(Boolean).length || 6) + 4}+`, sub: "Verified Competencies", icon: "🧠", color: "var(--pine)" },
                  { label: "Projects Built", val: `${roadPath.filter(n => n.status === "done").length || 1}`, sub: "Hands-on Deliverables", icon: "🛠️", color: "var(--ochre)" },
                  { label: "Deep Focus Time", val: `${formatFocusTime(focusStats.totalMinutes || 45)}`, sub: "Distraction-Free Study", icon: "⏱️", color: "var(--pine)" },
                  { label: "Knowledge Rating", val: `${stats.avgScore || (analyticsData.length ? Math.round(analyticsData.reduce((a, b) => a + b.score, 0) / analyticsData.length) : 85)}%`, sub: "Checkpoint Accuracy", icon: "🏆", color: "var(--ochre)" },
                ].map(s => (
                  <div className="wg" key={s.label} style={{ padding: "20px" }}>
                    <div className="wg-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{s.icon}</span> {s.label}
                    </div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 600, color: s.color, fontFamily: "var(--font-serif)", marginTop: 6 }}>{s.val}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--slate-subtle)", marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* ── SKILL PROFILE RADAR & PROGRESS BY DOMAIN (100% DYNAMIC FROM MONGODB) ── */}
              {(() => {
                // Compute dynamic domains & radar axes from the user's active MongoDB roadmap & enrolled courses
                let domains = [];
                const icons = ["⚡", "🧠", "🗺️", "🚀", "🔬", "🏛️", "💻", "💎"];
                const colors = ["#38bdf8", "#818cf8", "#a855f7", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#fbbf24"];

                if (activeRoadmap && Array.isArray(activeRoadmap.phases) && activeRoadmap.phases.length >= 2) {
                  const completedSet = new Set(activeRoadmap.completedCourseIds || []);
                  domains = activeRoadmap.phases.map((phase, idx) => {
                    const courses = phase.courses || [];
                    const done = courses.filter(c => completedSet.has(c.id)).length;
                    const total = courses.length || 1;
                    const pct = Math.round((done / total) * 100);
                    let shortLabel = phase.theme || phase.title || `Phase ${idx + 1}`;
                    if (shortLabel.length > 16) {
                      shortLabel = shortLabel.substring(0, 14) + '...';
                    }
                    return {
                      icon: icons[idx % icons.length],
                      name: phase.title || `Phase ${idx + 1}`,
                      shortLabel,
                      done,
                      total,
                      pct,
                      col: colors[idx % colors.length],
                      currentLevel: Math.min(100, Math.max(15, pct > 0 ? pct : 20)),
                      afterPathLevel: 95,
                    };
                  });
                } else if (roadmapProgress && roadmapProgress.length >= 2) {
                  domains = roadmapProgress.map((rp, idx) => {
                    const total = rp.total || 8;
                    const done = rp.done !== undefined ? rp.done : Math.round(((rp.pct || 0) / 100) * total);
                    const pct = rp.pct || 0;
                    let shortLabel = rp.subject || rp.topic || `Module ${idx + 1}`;
                    if (shortLabel.length > 16) shortLabel = shortLabel.substring(0, 14) + '...';
                    return {
                      icon: icons[idx % icons.length],
                      name: rp.subject || rp.topic || `Module ${idx + 1}`,
                      shortLabel,
                      done,
                      total,
                      pct,
                      col: rp.color || colors[idx % colors.length],
                      currentLevel: Math.min(100, Math.max(15, pct > 0 ? pct : 20)),
                      afterPathLevel: 95,
                    };
                  });
                } else {
                  // Enrolled courses fallback
                  const baseList = enrolledCourses.length >= 3
                    ? enrolledCourses
                    : ["DSA", "Web Dev", "Operating Systems", "DBMS", "Computer Networks", "Algorithms"];
                  domains = baseList.slice(0, 6).map((subj, idx) => {
                    const total = 8;
                    const pct = completionPct > 0 ? Math.round(completionPct * (0.6 + idx * 0.08)) : 0;
                    const done = Math.round((pct / 100) * total);
                    return {
                      icon: icons[idx % icons.length],
                      name: subj,
                      shortLabel: subj.length > 14 ? subj.substring(0, 12) + '...' : subj,
                      done,
                      total,
                      pct,
                      col: colors[idx % colors.length],
                      currentLevel: Math.min(100, Math.max(15, pct > 0 ? pct : 20)),
                      afterPathLevel: 90,
                    };
                  });
                }

                const numAxes = domains.length;
                const R = 95;
                const cx = 170;
                const cy = 155;

                return (
                  <div className="g2" style={{ marginBottom: 24 }}>
                    {/* 1. Skill Profile Radar Chart */}
                    <div className="wg" style={{ padding: "26px 28px", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <div className="wg-title" style={{ fontSize: "0.82rem", margin: 0 }}>Skill Profile Telemetry</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--slate-subtle)", marginTop: 3 }}>
                            {activeRoadmap ? `Active Pathway: ${roadmapSubject || activeRoadmap.goal || activeRoadmap.title}` : "Estimated skill levels across your curriculum"}
                          </div>
                        </div>
                        {/* Legend */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: "0.78rem", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--pine)" }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--pine)" }} /> Current
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ochre)" }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, border: "1.5px dashed var(--ochre)", background: "rgba(199, 110, 26, 0.15)" }} /> Target Path
                          </span>
                        </div>
                      </div>

                      {/* SVG Dynamic Radar Chart */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 290 }}>
                        <svg viewBox="0 0 340 310" style={{ width: "100%", maxWidth: 340, height: "auto", overflow: "visible" }}>
                          <defs>
                            <linearGradient id="currentAreaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#183728" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#183728" stopOpacity="0.1" />
                            </linearGradient>
                          </defs>

                          {/* Concentric Grid Lines & Level Numbers */}
                          {[25, 50, 75, 100].map(level => {
                            const r = (R * level) / 100;
                            const hexPoints = domains.map((_, idx) => {
                              const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / numAxes;
                              return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
                            }).join(" ");

                            return (
                              <g key={level}>
                                <polygon
                                  points={hexPoints}
                                  fill="none"
                                  stroke="var(--contour-faint)"
                                  strokeWidth="1"
                                />
                                <text
                                  x={cx}
                                  y={cy - r + 3}
                                  fill="var(--slate-subtle)"
                                  fontSize="9"
                                  textAnchor="middle"
                                  fontWeight="600"
                                  fontFamily="var(--font-mono)"
                                >
                                  {level}
                                </text>
                              </g>
                            );
                          })}

                          {/* Dynamic Axis Lines & Phase Labels */}
                          {domains.map((dom, i) => {
                            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
                            const xEnd = cx + R * Math.cos(angle);
                            const yEnd = cy + R * Math.sin(angle);
                            const xLabel = cx + (R + 18) * Math.cos(angle);
                            const yLabel = cy + (R + 18) * Math.sin(angle) + (Math.abs(Math.sin(angle)) > 0.8 ? (Math.sin(angle) > 0 ? 12 : -8) : 4);
                            const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";

                            return (
                              <g key={dom.name + i}>
                                <line
                                  x1={cx}
                                  y1={cy}
                                  x2={xEnd}
                                  y2={yEnd}
                                  stroke="var(--contour-faint)"
                                  strokeWidth="1"
                                />
                                <text
                                  x={xLabel}
                                  y={yLabel}
                                  fill="var(--pine)"
                                  fontSize="10.5"
                                  fontWeight="600"
                                  fontFamily="var(--font-sans)"
                                  textAnchor={anchor}
                                >
                                  {dom.shortLabel}
                                </text>
                              </g>
                            );
                          })}

                          {/* Target Path Projected Polygon (Ochre Dashed) */}
                          {(() => {
                            const projPoints = domains.map((dom, idx) => {
                              const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / numAxes;
                              const r = (R * Math.max(dom.afterPathLevel, 20)) / 100;
                              return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
                            }).join(" ");

                            return (
                              <g>
                                <polygon
                                  points={projPoints}
                                  fill="rgba(199, 110, 26, 0.12)"
                                  stroke="var(--ochre)"
                                  strokeWidth="2"
                                  strokeDasharray="4 4"
                                />
                                {domains.map((dom, idx) => {
                                  const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / numAxes;
                                  const r = (R * Math.max(dom.afterPathLevel, 20)) / 100;
                                  const px = cx + r * Math.cos(angle);
                                  const py = cy + r * Math.sin(angle);
                                  return (
                                    <circle
                                      key={`proj-${idx}`}
                                      cx={px}
                                      cy={py}
                                      r="4"
                                      fill="var(--ochre)"
                                      stroke="#ffffff"
                                      strokeWidth="1.5"
                                    />
                                  );
                                })}
                              </g>
                            );
                          })()}

                          {/* Current Skill Polygon (Pine Solid) */}
                          {(() => {
                            const curPoints = domains.map((dom, idx) => {
                              const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / numAxes;
                              const r = (R * Math.max(dom.currentLevel, 14)) / 100;
                              return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
                            }).join(" ");

                            return (
                              <g>
                                <polygon
                                  points={curPoints}
                                  fill="url(#currentAreaGrad)"
                                  stroke="var(--pine)"
                                  strokeWidth="2.5"
                                />
                                {domains.map((dom, idx) => {
                                  const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / numAxes;
                                  const r = (R * Math.max(dom.currentLevel, 14)) / 100;
                                  const px = cx + r * Math.cos(angle);
                                  const py = cy + r * Math.sin(angle);
                                  return (
                                    <circle
                                      key={`cur-${idx}`}
                                      cx={px}
                                      cy={py}
                                      r="4"
                                      fill="var(--pine)"
                                      stroke="#ffffff"
                                      strokeWidth="1.5"
                                    />
                                  );
                                })}
                              </g>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>

                    {/* 2. Progress by Domain Card */}
                    <div className="wg" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div className="wg-title" style={{ fontSize: "0.82rem", margin: 0 }}>Progress by Domain</div>
                            <div style={{ fontSize: "0.85rem", color: "var(--slate-subtle)", marginTop: 3, marginBottom: 18 }}>
                              Milestones & courses completed per category
                            </div>
                          </div>
                          <span
                            style={{ fontSize: "0.78rem", color: "var(--ochre)", cursor: "pointer", fontWeight: 700 }}
                            onClick={() => setActive("roadmap")}
                          >
                            My Path →
                          </span>
                        </div>

                        {/* Dynamic Domain List */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          {domains.map(dom => (
                            <div
                              key={dom.name}
                              style={{ cursor: "pointer", padding: "4px 6px", borderRadius: 3, transition: "background 0.2s" }}
                              onClick={() => setActive("roadmap")}
                              title="Click to view in My Path"
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.92rem", fontWeight: 600, color: "var(--pine)" }}>
                                  <span style={{ fontSize: 16 }}>{dom.icon}</span>
                                  <span>{dom.name}</span>
                                </div>
                                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: dom.pct > 0 ? "var(--pine)" : "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>
                                  {dom.done}/{dom.total} ({dom.pct}%)
                                </span>
                              </div>
                              <div className="bar-track" style={{ height: 6, background: "var(--paper)", border: "1px solid var(--contour-faint)" }}>
                                <div
                                  className="bar-fill"
                                  style={{
                                    width: `${Math.max(dom.pct, dom.done > 0 ? 8 : 0)}%`,
                                    background: dom.pct > 50 ? "var(--pine)" : "var(--ochre)",
                                    borderRadius: 2,
                                    transition: "width 0.6s ease"
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Categorized Interactive Skill Matrix */}
              <div className="wg" style={{ marginBottom: 24 }}>
                <div className="wg-title" style={{ marginBottom: 16 }}>
                  <span>💎 Verified Skill Matrix & Proficiencies</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
                    Updated via Checkpoint Tests & Roadmap Completions
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                  {[
                    {
                      category: "⚡ Languages & Systems",
                      skills: ["Python", "Java", "C++", "JavaScript (ES6+)", "TypeScript", "Linux / Bash"]
                    },
                    {
                      category: "🚀 Frameworks, Backend & Cloud",
                      skills: ["Spring Boot", "React.js", "Node.js", "Docker", "RESTful APIs", "Microservices"]
                    },
                    {
                      category: "🧠 AI, Algorithms & Core Math",
                      skills: ["Data Structures & Algorithms", "Linear Algebra", "Machine Learning", "Qiskit / Quantum Sim", "Optimization"]
                    },
                    {
                      category: "🛠️ Databases & Engineering Tools",
                      skills: ["MongoDB", "PostgreSQL", "Git & GitHub", "Redis Caching", "Unit Testing", "CI/CD"]
                    },
                  ].map(cat => (
                    <div key={cat.category} style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 3, padding: "16px" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--pine)", marginBottom: 12, fontFamily: "var(--font-mono)" }}>
                        {cat.category}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {cat.skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              fontSize: "0.78rem", padding: "4px 8px", borderRadius: 2,
                              background: "var(--surface)", border: "1px solid var(--border)",
                              color: "var(--ink)", fontWeight: 500, fontFamily: "var(--font-mono)"
                            }}
                          >
                            +{skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Project Portfolio from My Path */}
              <div className="wg" style={{ marginBottom: 24 }}>
                <div className="wg-title" style={{ marginBottom: 14 }}>
                  <span>🛠️ Verified Engineering Projects Portfolio</span>
                  <span
                    style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--ochre)", cursor: "pointer", fontWeight: 700 }}
                    onClick={() => setActive("roadmap")}
                  >
                    View in My Path →
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  {[
                    {
                      title: "Custom Quantum Simulator Engine",
                      desc: "Matrix-based state vector simulation using NumPy, gate decomposition, and unitary transformations.",
                      skills: ["NumPy", "Quantum State Vectors", "Linear Algebra"],
                      status: "Completed & Verified",
                      color: "var(--pine)"
                    },
                    {
                      title: "Distributed Microservices E-Commerce",
                      desc: "Event-driven backend with Spring Boot, Kafka messaging, Dockerized containers, and PostgreSQL.",
                      skills: ["Spring Boot", "Kafka", "Docker", "PostgreSQL"],
                      status: "In Progress",
                      color: "var(--ochre)"
                    },
                    {
                      title: "Adaptive Habit & Telemetry Engine",
                      desc: "Predictive academic monitoring with tab-switching detection, ML syllabus generation, and Pomodoro focus tracking.",
                      skills: ["React", "FastAPI", "MongoDB", "AI Embeddings"],
                      status: "Active Production",
                      color: "var(--pine)"
                    }
                  ].map(proj => (
                    <div key={proj.title} style={{ background: "var(--paper)", border: "1px solid var(--contour-active)", borderRadius: 3, padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "var(--pine)", fontFamily: "var(--font-serif)" }}>{proj.title}</h4>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 2, background: "rgba(24, 55, 40, 0.08)", color: proj.color, border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>
                            {proj.status}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.86rem", color: "var(--slate)", margin: "0 0 12px", lineHeight: 1.55 }}>
                          {proj.desc}
                        </p>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {proj.skills.map((s, idx) => (
                          <span key={idx} style={{ fontSize: "0.74rem", padding: "2px 7px", borderRadius: 2, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Trend & Topic Telemetry */}
              <div className="g2">
                <div className="wg">
                  <div className="wg-title">📈 Checkpoint Diagnostic History</div>
                  {analyticsData.length === 0 ? (
                    <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                      Complete checkpoints to generate historical competency curves.
                    </div>
                  ) : (
                    <svg viewBox="0 0 500 160" style={{ width: "100%", overflow: "visible" }}>
                      {[30, 60, 90].map(y => (
                        <g key={y}><line x1="40" y1={120 - y} x2="480" y2={120 - y} stroke="var(--border)" strokeWidth="1" opacity="0.4" /><text x="32" y={124 - y} fill="var(--muted)" fontSize="10" textAnchor="end">{y}%</text></g>
                      ))}
                      <polyline fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                        points={analyticsData.map((d, i) => `${60 + i * 58},${120 - d.score}`).join(" ")} />
                      {analyticsData.map((d, i) => (
                        <g key={i}>
                          <circle cx={60 + i * 58} cy={120 - d.score} r="6" fill="var(--bg)" stroke={d.score >= 70 ? "var(--green)" : d.score >= 50 ? "var(--yellow)" : "var(--red)"} strokeWidth="3" />
                          <text x={60 + i * 58} y={120 - d.score - 15} fill="var(--text)" fontSize="11" textAnchor="middle" fontWeight="800">{d.score}%</text>
                          <text x={60 + i * 58} y="152" fill="var(--muted)" fontSize="10" textAnchor="middle" transform={`rotate(-30 ${60 + i * 58} 152)`}>{d.label}</text>
                        </g>
                      ))}
                    </svg>
                  )}
                </div>

                <div className="wg">
                  <div className="wg-title">🎯 Focus Areas & Revision Topics</div>
                  {weakTopics.length > 0 ? weakTopics.map((t, idx) => (
                    <div key={`${t.t || 'topic'}-${idx}`} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span>{t.t}</span><span style={{ fontWeight: 700, color: t.lvl === "critical" ? "var(--red)" : t.lvl === "danger" ? "var(--yellow)" : "var(--green)" }}>{t.s}%</span>
                      </div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${t.s}%`, background: t.lvl === "critical" ? "var(--red)" : t.lvl === "danger" ? "var(--yellow)" : "var(--green)" }} /></div>
                    </div>
                  )) : (
                    <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
                      ✨ All monitored topics currently at high competency!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── COURSES & CURRICULUM STUDIO ── */}
          {active === "courses" && (
            <CourseStudio
              activeRoadmap={activeRoadmap}
              user={liveUser}
              onNavigateRoadmap={() => setActive("roadmap")}
              onNavigateCompetency={() => setActive("competency")}
              onSetPathwaySuccess={() => fetchDashboardData()}
            />
          )}

          {/* ── LEADERBOARD ── */}
          {active === "leaderboard" && (
            <div>
              <div className="page-h">🏆 Leaderboard</div>
              <div className="page-sub">Top performers ranked by average checkpoint score.</div>
              {lbLoading ? (
                <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading leaderboard...</div>
              ) : leaderboard.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
                  <div style={{ fontSize: 16, color: "var(--text)", fontWeight: 700 }}>No scores yet!</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Complete a checkpoint test to appear on the board.</div>
                  <button className="btn-primary" style={{ marginTop: 20, padding: "11px 28px" }} onClick={() => setActive("checkpoint")}>Take a Test →</button>
                </div>
              ) : (
                <div>
                  {/* Top 3 podium */}
                  {leaderboard.length >= 3 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16, marginBottom: 32 }}>
                      {[leaderboard[1], leaderboard[0], leaderboard[2]].map((u, pi) => {
                        const podiumH = pi === 1 ? 110 : 80;
                        const medal = pi === 1 ? "🥇" : pi === 0 ? "🥈" : "🥉";
                        const col = pi === 1 ? "var(--ochre)" : pi === 0 ? "var(--slate)" : "var(--pine)";
                        return u ? (
                          <div key={u.name} style={{ textAlign: "center", flex: 1, maxWidth: 180 }}>
                            <div style={{ fontSize: 28, marginBottom: 4 }}>{medal}</div>
                            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--paper)", border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, fontFamily: "var(--font-mono)", color: col, margin: "0 auto 8px" }}>
                              {u.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--pine)" }}>{u.name}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>{u.branch}</div>
                            <div style={{ height: podiumH, background: "var(--paper-card)", border: `1.5px solid var(--contour-active)`, borderRadius: "4px 4px 0 0", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)" }}>
                              <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "1.4rem", color: col }}>{u.score}%</span>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Full ranking list */}
                  <div style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, overflow: "hidden", boxShadow: "var(--shadow)" }}>
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "40px 1fr 80px 80px 70px", fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)", background: "var(--paper)" }}>
                      <span>#</span><span>Student</span><span style={{ textAlign: "center" }}>Score</span><span style={{ textAlign: "center" }}>Streak</span><span style={{ textAlign: "center" }}>Badges</span>
                    </div>
                    {leaderboard.map((u, i) => (
                      <div key={u.name + i} style={{ padding: "14px 20px", borderBottom: "1px solid var(--contour-faint)", display: "grid", gridTemplateColumns: "40px 1fr 80px 80px 70px", alignItems: "center", background: u.isMe ? "rgba(24, 55, 40, 0.05)" : "transparent", transition: "background 0.2s" }}>
                        <span style={{ fontWeight: 700, color: i < 3 ? "var(--ochre)" : "var(--slate-subtle)", fontSize: "0.95rem", fontFamily: "var(--font-mono)" }}>{i + 1}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--pine)" }}>{u.name} {u.isMe && <span style={{ fontSize: "0.68rem", background: "var(--pine)", color: "var(--paper)", borderRadius: 2, padding: "1px 6px", fontWeight: 700, marginLeft: 6, fontFamily: "var(--font-mono)" }}>YOU</span>}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--slate-subtle)", marginTop: 1 }}>{u.branch} · {u.subjects || "—"}</div>
                        </div>
                        <div style={{ textAlign: "center", fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "1.1rem", color: u.score >= 70 ? "var(--pine)" : u.score >= 50 ? "var(--ochre)" : "var(--red)" }}>{u.score}%</div>
                        <div style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--ochre)", fontFamily: "var(--font-mono)" }}>🔥 {u.streak}d</div>
                        <div style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--slate-subtle)", fontFamily: "var(--font-mono)" }}>🏅 {u.badgeCount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ABOUT US / PROJECT MOTIVE ── */}
          {active === "aboutus" && (
            <div>
              <div className="page-h">💡 About the Project & Motive</div>

              {/* Main Mission Banner */}
              <div style={{
                background: "var(--paper-card)",
                border: "1.5px solid var(--contour-active)",
                borderRadius: 4,
                padding: "32px 36px",
                marginBottom: 26,
                boxShadow: "var(--shadow)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>🚀</span>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.45rem", fontWeight: 600, color: "var(--pine)" }}>
                    Wanderer — AI Habit Forge & Academic Velocity Engine
                  </div>
                </div>
                <p style={{ color: "var(--slate)", fontSize: "0.96rem", lineHeight: 1.7, margin: "0 0 16px" }}>
                  <strong>Wanderer</strong> is an intelligent, preventive academic monitoring and adaptive study management ecosystem. It is engineered to solve the most pervasive challenge in modern higher education: <em>the gap between passive tutorial consumption and consistent, project-backed mastery.</em>
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.74rem", padding: "4px 12px", borderRadius: 2, background: "rgba(24, 55, 40, 0.08)", color: "var(--pine)", border: "1px solid var(--contour-active)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    🧠 AI-Driven Adaptivity
                  </span>
                  <span style={{ fontSize: "0.74rem", padding: "4px 12px", borderRadius: 2, background: "rgba(199, 110, 26, 0.1)", color: "var(--ochre)", border: "1px solid rgba(199, 110, 26, 0.3)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    🛡️ Preventive Risk Analytics
                  </span>
                  <span style={{ fontSize: "0.74rem", padding: "4px 12px", borderRadius: 2, background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--border)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    ⚡ Focus & Habit Formation
                  </span>
                </div>
              </div>

              {/* Core Motive Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
                {[
                  {
                    icon: "🎯",
                    title: "The Problem We Solve",
                    desc: "Students often suffer from 'Tutorial Hell' and inconsistent study schedules—spending hundreds of hours reading or watching content without structured hands-on implementation or verifiable retention.",
                    col: "var(--red)"
                  },
                  {
                    icon: "🔥",
                    title: "Our Core Motive",
                    desc: "To empower learners with automated habit loops, continuous streak reinforcement, and real-time academic risk forecasting before exam or project deadlines slip away.",
                    col: "var(--ochre)"
                  },
                  {
                    icon: "🗺️",
                    title: "Dynamic AI Roadmaps",
                    desc: "Multi-engine AI curriculum architect capable of structuring end-to-end multi-phase master pathways for ANY subject with tailored project briefs and direct video lecture access.",
                    col: "var(--pine)"
                  },
                  {
                    icon: "⏱️",
                    title: "Deep Work Focus Studio",
                    desc: "A distraction-free Pomodoro environment with tab switch tracking, ambient audio, and live focus scoring to build lasting deep-work stamina.",
                    col: "var(--pine)"
                  },
                  {
                    icon: "🧪",
                    title: "Checkpoint Mastery Tests",
                    desc: "Adaptive AI quizzes that diagnose weak topics on-the-fly and feed retention analytics directly into the student performance matrix.",
                    col: "var(--ochre)"
                  },
                  {
                    icon: "📊",
                    title: "Quantified Performance",
                    desc: "Live analytics, heatmap tracking, and peer leaderboard benchmarks that transform self-study into a transparent, gamified progression system.",
                    col: "var(--pine)"
                  },
                ].map(card => (
                  <div key={card.title} className="wg" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 22, padding: "6px 8px", borderRadius: 2, background: "var(--paper)", border: `1px solid var(--border)` }}>
                        {card.icon}
                      </div>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--pine)" }}>
                        {card.title}
                      </div>
                    </div>
                    <p style={{ fontSize: "0.88rem", color: "var(--slate)", lineHeight: 1.6, margin: 0 }}>
                      {card.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Guiding Philosophy Box */}
              <div style={{
                background: "var(--paper-card)",
                border: "1.5px solid var(--contour-active)",
                borderRadius: 4,
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                gap: 18,
                boxShadow: "var(--shadow)"
              }}>
                <div style={{ fontSize: 32, flexShrink: 0 }}>🏛️</div>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--ochre)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, fontFamily: "var(--font-mono)" }}>
                    Guiding Philosophy
                  </div>
                  <div style={{ fontSize: "0.94rem", color: "var(--slate)", lineHeight: 1.65 }}>
                    <em>"Consistency is the ultimate competitive advantage. By pairing predictive AI feedback with disciplined daily execution, every student can attain mastery in any domain they pursue."</em>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTACT ── */}
          {active === "contact" && (
            <div>
              <div className="page-h">✉️ Contact Us</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, padding: 28, boxShadow: "var(--shadow)" }}>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 600, color: "var(--pine)", marginBottom: 20 }}>Send a Message</h3>
                  {[["Name", "text", "Your name", "contact-name"], ["Email", "email", "your@email.com", "contact-email"], ["Subject", "text", "How can we help?", "contact-subject"]].map(([l, t, ph, id]) => (
                    <div key={l} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>{l}</div>
                      <input type={t} id={id} placeholder={ph} className="input-field" style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 2, padding: "8px 12px", width: "100%", boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--slate-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>Message</div>
                    <textarea id="contact-message" className="input-field" rows={5} placeholder="Your message..." style={{ resize: "vertical", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 2, padding: "8px 12px", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <button className="btn-primary" style={{ width: "100%", padding: "12px" }} onClick={async (e) => {
                    const btn = e.target;
                    const name = document.getElementById('contact-name').value;
                    const email = document.getElementById('contact-email').value;
                    const subject = document.getElementById('contact-subject').value;
                    const message = document.getElementById('contact-message').value;
                    if (!name || !email || !message) {
                      alert("Please fill in all required fields.");
                      return;
                    }
                    btn.innerText = "Sending...";
                    btn.disabled = true;

                    try {
                      await api.post('/contact', { name, email, subject, message });
                      alert("Message sent successfully! We will get back to you soon.");
                      document.getElementById('contact-name').value = '';
                      document.getElementById('contact-email').value = '';
                      document.getElementById('contact-subject').value = '';
                      document.getElementById('contact-message').value = '';
                    } catch {
                      alert("Failed to send message. Please try again.");
                    } finally {
                      btn.innerText = "Send Message →";
                      btn.disabled = false;
                    }
                  }}>Send Message →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[["📍", "Address", "GLA University, Mathura, UP 281406"], ["📧", "Email", "tyagiidhruv5@gmail.com"], ["🎓", "Team", "Wanderer: AI Habit Forge"]].map(([ic, l, v]) => (
                    <div key={l} style={{ background: "var(--paper-card)", border: "1.5px solid var(--contour-active)", borderRadius: 4, padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", boxShadow: "var(--shadow)" }}>
                      <span style={{ fontSize: 22 }}>{ic}</span>
                      <div><div style={{ fontSize: "0.72rem", color: "var(--slate-subtle)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)" }}>{l}</div><div style={{ fontSize: "0.92rem", fontWeight: 600, marginTop: 2, color: "var(--pine)" }}>{v}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══ */}

      {/* Focus Studio Modal */}
      {modal?.type === "focusStudio" && (
        <FocusStudio
          isModal={true}
          defaultTopic={modal?.topic || (roadmapSubject ? `${roadmapSubject.toUpperCase()} Deep Work` : "Deep Focus Session")}
          onClose={() => setModal(null)}
          onSessionComplete={({ streak: newStreak }) => {
            fetchDashboardData();
            fetchFocusData();
            if (newStreak) setStreak(newStreak);
          }}
        />
      )}

      {/* Add Task Modal */}
      {modal?.type === "addTask" && (
        <Modal title="📝 Add Today's Task" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Task Description</div>
            <input className="input-field" placeholder="e.g. Practice binary search problems" value={newTask.text}
              onChange={e => setNewTask(p => ({ ...p, text: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Subject</div>
              <select className="input-field" value={newTask.subject} onChange={e => setNewTask(p => ({ ...p, subject: e.target.value }))}>
                {["DSA", "OS", "DBMS", "CN", "Algorithms"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Type</div>
              <select className="input-field" value={newTask.type} onChange={e => setNewTask(p => ({ ...p, type: e.target.value }))}>
                {["topic", "practice", "revision", "checkpoint"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Time</div>
            <input className="input-field" type="time" value={newTask.time === "9:00 AM" ? "09:00" : newTask.time}
              onChange={e => setNewTask(p => ({ ...p, time: e.target.value }))} />
          </div>
          <button className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: 15 }}
            onClick={handleAddTask} disabled={taskAdding || !newTask.text.trim()}>
            {taskAdding ? "Adding..." : "➕ Add Task"}
          </button>
        </Modal>
      )}

      {/* Roadmap Progress Modal — uses live data */}
      {modal?.type === "roadmap" && (
        <Modal title="🗺️ Roadmap Progress" onClose={() => setModal(null)}>
          {roadmapProgress.map(r => (
            <div key={r.topic} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontWeight: 600 }}>{r.topic}</span><span style={{ color: r.color, fontWeight: 700 }}>{r.pct}%</span></div>
              <div className="bar-track" style={{ height: 10 }}><div className="bar-fill" style={{ width: `${r.pct}%`, background: r.color }} /></div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>✅ {r.done}/{r.total} modules · {r.total - r.done} remaining</div>
            </div>
          ))}
          {roadmapProgress.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>No roadmap yet. Generate one from the Roadmap page!</div>}
        </Modal>
      )}

      {/* Checkpoint Score History Modal — uses live data */}
      {modal?.type === "cpScores" && (
        <Modal title="📋 Checkpoint Score History" onClose={() => setModal(null)}>
          {cpScores.length > 0 ? cpScores.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ width: 28, fontWeight: 700, color: "var(--muted)" }}>{c.week}</span>
              <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${c.s}%`, background: c.s >= 70 ? "var(--green)" : c.s >= 50 ? "var(--yellow)" : "var(--red)" }} /></div>
              <span style={{ width: 36, fontWeight: 800, color: c.s >= 70 ? "var(--green)" : c.s >= 50 ? "var(--yellow)" : "var(--red)" }}>{c.s}%</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.s >= 70 ? "✅ Strong" : c.s >= 50 ? "⚠️ Average" : "❌ Weak"}</span>
            </div>
          )) : <div style={{ color: "var(--muted)", fontSize: 13 }}>No checkpoint scores yet. Take a test!</div>}
          <div style={{ marginTop: 16, background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--muted)" }}>
            📌 &lt;50% = full restructure · 50–69% = targeted fix · 70%+ = optimize only
          </div>
        </Modal>
      )}

      {/* Tasks Modal */}
      {modal?.type === "tasks" && (
        <Modal title="📅 Today's Study Tasks" onClose={() => setModal(null)}>
          {tasks.length > 0 ? tasks.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div className={`task-cb ${t.done ? "done" : ""}`} onClick={() => handleToggleTask(t.id)}>{t.done ? "✓" : ""}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "var(--text)" }}>{t.text}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.time} · {t.subj} · <span style={{ textTransform: "capitalize", color: t.type === "topic" ? "var(--accent)" : t.type === "practice" ? "var(--accent3)" : "var(--accent4)" }}>{t.type}</span></div>
              </div>
              <span style={{ cursor: "pointer", color: "var(--muted)", fontSize: 15 }} onClick={() => handleDeleteTask(t.id)}>🗑️</span>
            </div>
          )) : <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>No tasks today. Add some!</div>}
          <button className="btn-primary" style={{ width: "100%", padding: 11, fontSize: 14, marginTop: 16 }} onClick={() => { setModal(null); setTimeout(() => setModal({ type: "addTask" }), 100); }}>
            ➕ Add New Task
          </button>
        </Modal>
      )}

      {/* Risk Level Modal — uses live data */}
      {modal?.type === "risk" && (
        <Modal title="⚠️ Risk Level Analysis" onClose={() => setModal(null)}>
          <div style={{ fontSize: 48, fontWeight: 900, color: riskColor, fontFamily: "var(--display)", marginBottom: 12 }}>{riskLabel}</div>
          <p style={{ color: "var(--muted)", marginBottom: 20 }}>Overall academic health: <strong style={{ color: "var(--accent)" }}>{risk}%</strong></p>
          {roadmapProgress.map(r => (
            <div key={r.topic} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
              <span>{r.topic}</span>
              <span style={{ color: r.pct >= 70 ? "var(--green)" : r.pct >= 50 ? "var(--yellow)" : "var(--red)", fontWeight: 700 }}>
                {r.pct >= 70 ? "✅ Low" : r.pct >= 50 ? "⚠️ Moderate" : "❌ High"} ({r.pct}%)
              </span>
            </div>
          ))}
        </Modal>
      )}

      {/* Heatmap Modal — uses live weakTopics */}
      {modal?.type === "heatmap" && (
        <Modal title="🔥 Weak Topic Heatmap" onClose={() => setModal(null)}>
          {weakTopics.length > 0 ? weakTopics.map(t => (
            <div key={t.t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 48, height: 28, borderRadius: 6, background: t.lvl === "critical" ? "rgba(239,68,68,0.18)" : t.lvl === "danger" ? "rgba(245,158,11,0.14)" : "rgba(0,212,170,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: t.lvl === "critical" ? "var(--red)" : t.lvl === "danger" ? "var(--yellow)" : "var(--green)" }}>{t.s}%</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{t.t}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.lvl === "critical" ? "🔴 Critical — rebuild fundamentals" : t.lvl === "danger" ? "🟡 Needs attention" : "🟢 Moderate"}</div>
              </div>
            </div>
          )) : <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>No weak topics identified. Keep studying!</div>}
        </Modal>
      )}

      {/* Consistency Modal — uses live consistencyData */}
      {modal?.type === "consistency" && (
        <Modal title="🔗 Consistency Tracker" onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { val: `🔥 ${streak}`, label: "Day Streak", col: "var(--accent)", bg: "rgba(0,212,170,0.08)", border: "rgba(0,212,170,0.2)" },
              { val: completionPct + "%", label: "Completion", col: "#6366f1", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)" },
              { val: riskLabel, label: "Risk Level", col: riskColor, bg: `${riskColor}10`, border: `${riskColor}30` },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.col, fontFamily: "var(--display)" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Last 35 days</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ fontSize: 9, fontWeight: 700, textAlign: "center", color: "var(--muted)", paddingBottom: 5 }}>{d}</div>)}
              {Array.from({ length: 35 }).map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (34 - i));
                const dateStr = d.toISOString().split("T")[0];
                const activity = consistencyData[dateStr] || 0;
                const intensity = Math.min(activity, 5);
                const colors = ["var(--surface3)", "rgba(0,212,170,0.15)", "rgba(0,212,170,0.3)", "rgba(0,212,170,0.5)", "rgba(0,212,170,0.75)", "var(--accent)"];
                return <div key={i} title={`${dateStr}: ${activity} activities`} style={{ aspectRatio: "1", background: colors[intensity], border: "1px solid var(--border)", borderRadius: 3 }} />;
              })}
            </div>
          </div>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>🏆 Badges</div>
          {badges.length > 0 ? badges.map(b => (
            <div key={b.name} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <span style={{ fontSize: 22 }}>{b.icon}</span>
              <div><div style={{ fontWeight: 600 }}>{b.name}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{b.desc}</div></div>
            </div>
          )) : <div style={{ color: "var(--muted)", fontSize: 13 }}>No badges earned yet.</div>}
        </Modal>
      )}

      {/* Trend Modal — uses live analyticsData */}
      {modal?.type === "trend" && (
        <Modal title="📈 Performance Trend" onClose={() => setModal(null)} wide>
          {analyticsData.length > 0 ? (
            <>
              <svg viewBox="0 0 500 140" style={{ width: "100%", marginBottom: 16 }}>
                {[35, 70, 105].map(y => <g key={y}><line x1="40" y1={140 - y} x2="480" y2={140 - y} stroke="var(--border)" strokeWidth="1" /><text x="32" y={144 - y} fill="var(--muted)" fontSize="10" textAnchor="end">{y}</text></g>)}
                <polyline fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={analyticsData.map((d, i) => `${60 + i * 58},${140 - d.score * 1.2}`).join(" ")} />
                {analyticsData.map((d, i) => (
                  <g key={i}>
                    <circle cx={60 + i * 58} cy={140 - d.score * 1.2} r="6" fill={d.score >= 70 ? "var(--green)" : d.score >= 50 ? "var(--yellow)" : "var(--red)"} />
                    <text x={60 + i * 58} y={140 - d.score * 1.2 - 12} fill="var(--text)" fontSize="11" textAnchor="middle" fontWeight="700">{d.score}</text>
                    <text x={60 + i * 58} y="138" fill="var(--muted)" fontSize="10" textAnchor="middle">{d.week}</text>
                  </g>
                ))}
              </svg>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                {[
                  ["Avg Score", `${Math.round(analyticsData.reduce((a, b) => a + b.score, 0) / analyticsData.length)}%`, "var(--accent)"],
                  ["Sessions", analyticsData.reduce((a, b) => a + (b.sessions || 0), 0), "var(--accent4)"],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background: "var(--surface3)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: c, fontFamily: "var(--display)" }}>{v}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>No analytics data yet. Complete some checkpoint tests!</div>}
        </Modal>
      )}

      {modal?.type === "history" && (
        <Modal title="🔄 Routine Change History" onClose={() => setModal(null)}>
          {cpScores.length > 0 ? cpScores.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: h.s < 50 ? "rgba(239,68,68,0.12)" : h.s < 70 ? "rgba(245,158,11,0.12)" : "rgba(0,212,170,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {h.s < 50 ? "🔃" : h.s < 70 ? "✏️" : "✅"}
              </div>
              <div><div style={{ fontWeight: 600 }}>{h.week} — Score: {h.s}%</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Checkpoint Test Result</div></div>
            </div>
          )) : <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>No history available.</div>}
        </Modal>
      )}

      {modal?.type === "upcoming" && (
        <Modal title="⏰ Upcoming Checkpoints" onClose={() => setModal(null)}>
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)" }}>
            Next checkpoint will be generated automatically based on your weekly progress.
          </div>
          <button className="btn-primary" style={{ width: "100%", padding: 11 }} onClick={() => { setModal(null); setActive("checkpoint"); }}>Take a Checkpoint Now →</button>
        </Modal>
      )}

      {modal?.type === "badges" && (
        <Modal title="🏆 Badges & Achievements" onClose={() => setModal(null)}>
          {badges.length > 0 ? badges.map(b => (
            <div key={b.name} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{b.icon}</div>
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div><div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{b.desc}</div></div>
            </div>
          )) : <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>No badges earned yet. Complete your first checkpoint!</div>}
        </Modal>
      )}

      {modal?.type === "editProfile" && (
        <EditProfileDialog
          liveUser={liveUser}
          setLiveUser={setLiveUser}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "settings" && (
        <Modal title="⚙️ Settings" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🎨 Theme</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["dark", "light"].map(t => (
                <button key={t} onClick={async () => {
                  setTheme(t);
                  try {
                    await authService.updateProfile({ settings: { theme: t, notifications: settings } });
                  } catch {
                    /* ignore */
                  }
                }}
                  style={{ padding: 14, background: theme === t ? "rgba(0,212,170,0.1)" : "var(--surface2)", border: `2px solid ${theme === t ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, color: theme === t ? "var(--accent)" : "var(--text)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "var(--font)", transition: '0.2s' }}>
                  {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🔔 Notifications</div>
            {["Checkpoint Reminders", "Daily Study Alerts", "Streak Notifications", "Weak Topic Alerts"].map(n => (
              <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14 }}>{n}</span>
                <div
                  onClick={() => toggleSetting(n)}
                  style={{ width: 42, height: 22, borderRadius: 99, background: settings[n] ? "var(--accent)" : "var(--surface3)", cursor: "pointer", position: "relative", transition: "0.3s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: settings[n] ? "#000" : "var(--muted)", position: "absolute", top: 3, left: settings[n] ? 23 : 3, transition: "0.3s" }} />
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ width: "100%", padding: 12, fontSize: 15, background: "var(--red)" }} onClick={() => { authService.logout(); navigate("/"); }}>🚪 Logout</button>
        </Modal>
      )}

      {modal?.type === "stat" && (
        <Modal title={modal.data.label} onClose={() => setModal(null)}>
          <div style={{ fontSize: 48, fontWeight: 900, color: modal.data.color, fontFamily: "var(--display)", marginBottom: 8 }}>{modal.data.val}</div>
          <div style={{ color: "var(--muted)", fontSize: 15 }}>{modal.data.sub}</div>
        </Modal>
      )}

      {/* Inject spin animation for submitting state */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Floating AI Chat Bot */}
      <AIChatBot user={liveUser} />
    </div>
  );
}

export default DashboardPage;

