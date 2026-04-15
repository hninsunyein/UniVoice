"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { clearTokens } from "@/lib/api";
import PasswordInput from "@/components/PasswordInput";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "admin", "super_admin"];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!agreed) {
      setError("You must agree to the Terms & Conditions to continue.");
      return;
    }
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);

      if (result.requiresPasswordChange) {
        window.location.href = `/change-password?firstLogin=true&email=${encodeURIComponent(result.email)}`;
        return;
      }

      const role = result.user?.roleName || result.user?.role || "";
      if (!ADMIN_ROLES.includes(role)) {
        clearTokens();
        setError("Access denied. This login is for administrators only.");
        setLoading(false);
        return;
      }

      window.location.href = result.path;
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-outer">
      {/* Left branding panel */}
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

      {/* Right form panel */}
      <div className="login-right">
        <h2>Welcome Admin</h2>
        <p className="login-sub">Sign in to access the administration panel</p>

        <div className="fgroup">
          <label>Administrator Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@university.ac.uk"
            disabled={loading}
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
            I agree to the <a href="#">Terms &amp; Conditions</a> for
            participating in the University Magazine submission process.
          </label>
        </div>

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
          <a href="#" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 600 }}>
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
