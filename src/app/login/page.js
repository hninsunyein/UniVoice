"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const userAccounts = [
  { email: "hnin@university.ac.uk", role: "student", path: "/student" },
  { email: "sarah@university.ac.uk", role: "coordinator", path: "/coordinator" },
  { email: "james@university.ac.uk", role: "manager", path: "/manager" },
  { email: "admin@university.ac.uk", role: "admin", path: "/admin" },
  { email: "guest@university.ac.uk", role: "guest", path: "/guest" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("hnin@university.ac.uk");
  const [password, setPassword] = useState("••••••••");
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!agreed) {
      setError("You must agree to the Terms & Conditions to continue.");
      return;
    }
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    const account = userAccounts.find((u) => u.email === email);
    if (!account) {
      setError("No account found with that email address.");
      return;
    }
    setError("");
    router.push(account.path);
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
        <h2>Welcome Back</h2>
        <p className="login-sub">Sign in to continue to your dashboard</p>

        <div className="last-login">
          <span style={{ fontSize: 18, flexShrink: 0 }}>🕐</span>
          <div><strong>Last login:</strong> Monday, 16 Feb 2026 · 09:42 AM — this is your last session.</div>
        </div>

        <div className="fgroup">
          <label>University Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.ac.uk"
          />
        </div>

        <div className="fgroup">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>

        <div className="tc-row">
          <input
            type="checkbox"
            id="tc1"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
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

        <button className="btn btn-primary btn-full btn-lg" onClick={handleLogin}>
          Sign In →
        </button>
      </div>
    </div>
  );
}
