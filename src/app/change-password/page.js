"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { firstLoginChangePassword } from "@/lib/auth";
import PasswordInput from "@/components/PasswordInput";

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("firstLogin") === "true";
  const prefillEmail = searchParams.get("email") || "";

  const [form, setForm] = useState({
    email: prefillEmail,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const getStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getStrength(form.newPassword);
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["", "#b52a2a", "#e07c1a", "#2b82e0", "#0e7a55"];

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const result = await firstLoginChangePassword(
        form.email,
        form.currentPassword,
        form.newPassword,
        form.confirmPassword
      );
      setSuccess(true);
      setTimeout(() => { window.location.href = result.path; }, 2000);
    } catch (err) {
      setError(err.message || "Password change failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-outer">
        <div className="login-left">
          <h1>Uni<em>Voice</em><br />Magazine Portal</h1>
          <p>Your account is now secured. Redirecting you to your dashboard…</p>
        </div>
        <div className="login-right" style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ marginBottom: 12 }}>Password Changed!</h2>
            <p className="login-sub">Redirecting to your dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-outer">
      <div className="login-left">
        <h1>Uni<em>Voice</em><br />Magazine Portal</h1>
        <p>
          {isFirstLogin
            ? "Welcome! For security, please set a new password before accessing your dashboard."
            : "Keep your account secure by updating your password regularly."}
        </p>
        <div className="feature-list">
          <div className="feature-item"><div className="feature-dot">🔒</div>Use at least 8 characters</div>
          <div className="feature-item"><div className="feature-dot">🔠</div>Mix uppercase &amp; lowercase letters</div>
          <div className="feature-item"><div className="feature-dot">🔢</div>Include numbers and symbols</div>
          <div className="feature-item"><div className="feature-dot">🚫</div>Do not reuse previous passwords</div>
        </div>
      </div>

      <div className="login-right">
        {isFirstLogin && (
          <div className="alert warn" style={{ marginBottom: 24 }}>
            <span className="alert-icon">👋</span>
            <div><strong>First-time login detected.</strong> Please change your temporary password to continue.</div>
          </div>
        )}

        <h2>{isFirstLogin ? "Set Your Password" : "Change Password"}</h2>
        <p className="login-sub">
          {isFirstLogin ? "Create a secure password for your account" : "Update your account password"}
        </p>

        <div className="fgroup">
          <label>University Email</label>
          <input
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="you@university.ac.uk"
            disabled={loading || !!prefillEmail}
            style={prefillEmail ? { background: "var(--sky)", color: "var(--text-mid)" } : {}}
          />
        </div>

        <div className="fgroup">
          <label>{isFirstLogin ? "Temporary Password" : "Current Password"}</label>
          <PasswordInput
            value={form.currentPassword}
            onChange={handleChange("currentPassword")}
            placeholder="Enter your current / temporary password"
            disabled={loading}
          />
        </div>

        <div className="fgroup">
          <label>New Password</label>
          <PasswordInput
            value={form.newPassword}
            onChange={handleChange("newPassword")}
            placeholder="Create a strong new password"
            disabled={loading}
          />
          {form.newPassword && (
            <div className="pw-strength-bar">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className="pw-strength-seg"
                  style={{ background: strength >= level ? strengthColors[strength] : "var(--border-dark)" }}
                />
              ))}
              <span className="pw-strength-label" style={{ color: strengthColors[strength] }}>
                {strengthLabels[strength]}
              </span>
            </div>
          )}
        </div>

        <div className="fgroup">
          <label>Confirm New Password</label>
          <PasswordInput
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            placeholder="Re-enter your new password"
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          {form.confirmPassword && form.newPassword && (
            <div style={{ marginTop: 6, fontSize: 13, color: form.newPassword === form.confirmPassword ? "var(--success)" : "var(--danger)" }}>
              {form.newPassword === form.confirmPassword ? "✓ Passwords match" : "✕ Passwords do not match"}
            </div>
          )}
        </div>

        {error && (
          <div className="alert dang" style={{ marginBottom: 16 }}>
            <span className="alert-icon">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSubmit}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Saving…" : isFirstLogin ? "Set Password & Continue →" : "Change Password →"}
        </button>

        {!isFirstLogin && (
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
            <Link href="/login" style={{ color: "var(--blue)", textDecoration: "none" }}>← Back to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="login-outer"><div className="login-left"><h1>Uni<em>Voice</em></h1></div><div className="login-right" /></div>}>
      <ChangePasswordForm />
    </Suspense>
  );
}
