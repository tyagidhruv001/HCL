import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ForgotPassword from "./pages/ForgotPassword";
import OAuthCallback from "./pages/OAuthCallback";

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (data) => {
    setUser(data);
    console.log("Logged in:", data);
  };

  const handleRegister = (data) => {
    setUser(data);
    console.log("Registered:", data);
  };

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'light' : (saved || 'light');
  });

  // Trigger HTML theme updates automatically
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register" element={<RegisterPage onRegister={handleRegister} />} />
      <Route path="/dashboard" element={<DashboardPage user={user} theme={theme} setTheme={setTheme} />} />
      <Route path="/courses" element={<Navigate to="/dashboard" replace />} />
      <Route path="/oauth/callback" element={<OAuthCallback onLogin={handleLogin} />} />
    </Routes>
  );
}

export default App;