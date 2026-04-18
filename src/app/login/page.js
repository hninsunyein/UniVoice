"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { login } from "@/lib/auth";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [agreed,         setAgreed]         = useState(false);
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [showTCModal,      setShowTCModal]      = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [sessionExpired,   setSessionExpired]   = useState(false);
  const [expiredLastLogin, setExpiredLastLogin] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("sessionExpired") === "true") {
      setSessionExpired(true);
      const activeEmail = localStorage.getItem("activeUserEmail");
      const ts = activeEmail ? localStorage.getItem(`lastLoginAt_${activeEmail}`) : null;
      setExpiredLastLogin(ts || null);
      localStorage.removeItem("sessionExpired");
    }
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!agreed) { setError("You must agree to the Terms & Conditions to continue."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);

      if (result.requiresPasswordChange) {
        window.location.href = `/change-password?firstLogin=true&email=${encodeURIComponent(result.email)}`;
        return;
      }

      window.location.href = result.path;
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="login-outer">

      {/* ── Left branding panel ── */}
      <div className="login-left">
        <h1>Uni<em>Voice</em><br />Magazine Portal</h1>
        <p>
          The official platform for collecting student contributions
          to the University&apos;s annual magazine — secure, role-based
          and collaborative.
        </p>
        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-dot">📝</div>
            Submit articles &amp; high-quality images
          </div>
          <div className="feature-item">
            <div className="feature-dot">✅</div>
            Faculty coordinators review &amp; select
          </div>
          <div className="feature-item">
            <div className="feature-dot">📦</div>
            Marketing manager downloads for print
          </div>
          <div className="feature-item">
            <div className="feature-dot">🔒</div>
            Secure role-based access control
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-right">
        <div style={{ marginBottom: 16 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--blue)", textDecoration: "none", fontWeight: 500 }}>
            ← Back to Home
          </Link>
        </div>
        <h2>Welcome</h2>
        <p className="login-sub">Sign in with your university credentials</p>

        <div className="fgroup">
          <label>University Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.ac.uk"
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        <div className="fgroup">
          <label>Password</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <div style={{ marginTop: 8, textAlign: "right" }}>
            <Link href="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>
        </div>

        <div className="tc-row">
          <input
            type="checkbox"
            id="tc1"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={loading}
          />
          <label htmlFor="tc1">
            I agree to the{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setShowTCModal(true); }}>
              Terms &amp; Conditions
            </a>{" "}
            for participating in the University Magazine submission process.
          </label>
        </div>

        {sessionExpired && (
          <div className="alert warn" style={{ marginBottom: 16 }}>
            <span className="alert-icon">⏱️</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Your session has expired. Please sign in again.</div>
              {expiredLastLogin && (
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  Last login:{" "}
                  {new Date(expiredLastLogin).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })},{" "}
                  {new Date(expiredLastLogin).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="alert dang" style={{ marginBottom: 16 }}>
            <span className="alert-icon">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleLogin}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Signing in…" : "Sign In →"}
        </button>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13.5, color: "var(--text-muted)" }}>
          Having trouble?{" "}
          <a
            href="#"
            style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 600 }}
            onClick={(e) => { e.preventDefault(); setShowSupportModal(true); }}
          >
            Contact Support
          </a>
        </div>
      </div>

      {/* ── Terms & Conditions Modal ── */}
      {showTCModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowTCModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 480, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Terms &amp; Conditions</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", margin: 0 }}>
              By using the UniVoice Magazine Portal, you agree to submit only original work and grant the University a non-exclusive right to publish your contributions in the annual magazine. Submissions must comply with academic integrity policies. The University reserves the right to edit or reject any content deemed inappropriate or in violation of these terms.
            </p>
            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button className="btn btn-primary" onClick={() => setShowTCModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact Support Modal ── */}
      {showSupportModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowSupportModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 480, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Contact Support</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", margin: 0 }}>
              For login issues or technical difficulties, please contact the University IT Helpdesk at <strong>support@university.ac.uk</strong> or call <strong>+1 (800) 123-4567</strong> during office hours (Mon–Fri, 9 AM – 5 PM). For urgent matters, visit the IT Support desk on campus.
            </p>
            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button className="btn btn-primary" onClick={() => setShowSupportModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
