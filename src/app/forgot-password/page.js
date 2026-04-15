"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestPasswordReset, confirmPasswordReset } from "@/lib/auth";
import PasswordInput from "@/components/PasswordInput";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Steps: 1=email, 2=otp+newpw, 3=success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  /* ── Step 1: Request OTP ── */
  const handleEmailSubmit = async () => {
    setError("");
    if (!email) { setError("Please enter your university email address."); return; }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep(2);
    } catch (err) {
      setError(err.message || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP input helpers ── */
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      otpRefs[index - 1].current?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    digits.split("").forEach((c, i) => { if (i < 6) next[i] = c; });
    setOtp(next);
    otpRefs[Math.min(digits.length, 5)].current?.focus();
  };

  /* ── Step 2: Verify OTP then reset password ── */
  const handleVerifyAndReset = async () => {
    setError("");
    const enteredOtp = otp.join("");
    if (enteredOtp.length < 6) { setError("Please enter all 6 digits of your OTP."); return; }
    if (!newPassword || !confirmPassword) { setError("Please enter and confirm your new password."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      await confirmPasswordReset(email, enteredOtp, newPassword, confirmPassword);
      setStep(3);
    } catch (err) {
      setError(err.message || "Verification failed. Please check your OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setResendCount((c) => c + 1);
      otpRefs[0].current?.focus();
    } catch (err) {
      setError(err.message || "Could not resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const getStrength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = getStrength(newPassword);
  const strengthColors = ["", "#b52a2a", "#e07c1a", "#2b82e0", "#0e7a55"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="login-outer">
      {/* Left branding */}
      <div className="login-left">
        <h1>Uni<em>Voice</em><br />Magazine Portal</h1>
        <p>
          {step === 1 && "Enter your university email and we'll send you a one-time verification code."}
          {step === 2 && "Enter the 6-digit OTP sent to your email, then set your new password."}
          {step === 3 && "Your password has been reset. You can now sign in with your new credentials."}
        </p>
        <div className="feature-list">
          <div className="feature-item" style={{ opacity: step >= 1 ? 1 : 0.4 }}>
            <div className="feature-dot">{step > 1 ? "✓" : "📧"}</div>
            Step 1: Enter your university email
          </div>
          <div className="feature-item" style={{ opacity: step >= 2 ? 1 : 0.4 }}>
            <div className="feature-dot">{step > 2 ? "✓" : "🔢"}</div>
            Step 2: Verify OTP &amp; set new password
          </div>
          <div className="feature-item" style={{ opacity: step >= 3 ? 1 : 0.4 }}>
            <div className="feature-dot">{step === 3 ? "✓" : "🔒"}</div>
            Step 3: Sign in with new password
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="login-right">
        {/* Step indicators */}
        <div className="fp-steps">
          {["Email", "Verify & Reset", "Done"].map((label, i) => (
            <div key={i} className={`fp-step ${step > i + 1 ? "done" : step === i + 1 ? "active" : ""}`}>
              <div className="fp-step-circle">{step > i + 1 ? "✓" : i + 1}</div>
              <div className="fp-step-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <>
            <h2>Forgot Password?</h2>
            <p className="login-sub">Enter your university email to receive a verification code</p>

            <div className="fgroup">
              <label>University Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.ac.uk"
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert dang" style={{ marginBottom: 16 }}>
                <span className="alert-icon">⚠️</span>
                <div>{error}</div>
              </div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleEmailSubmit}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Sending OTP…" : "Send OTP Code →"}
            </button>

            <div style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
              Remembered your password?{" "}
              <Link href="/login" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 600 }}>
                Sign In
              </Link>
            </div>
          </>
        )}

        {/* ── Step 2: OTP + New Password ── */}
        {step === 2 && (
          <>
            <h2>Verify &amp; Reset Password</h2>
            <p className="login-sub">
              A 6-digit OTP was sent to <strong>{email}</strong>
            </p>

            <div className="alert info" style={{ marginBottom: 20 }}>
              <span className="alert-icon">📧</span>
              <div>Check your inbox. The code expires in <strong>10 minutes</strong>.</div>
            </div>

            {/* OTP inputs */}
            <div className="fgroup">
              <label>One-Time Password (OTP)</label>
              <div className="otp-container">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    className="otp-input"
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    autoFocus={i === 0}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {/* New password */}
            <div className="fgroup">
              <label>New Password</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong new password"
                disabled={loading}
              />
              {newPassword && (
                <div className="pw-strength-bar">
                  {[1, 2, 3, 4].map((lv) => (
                    <div key={lv} className="pw-strength-seg"
                      style={{ background: strength >= lv ? strengthColors[strength] : "var(--border-dark)" }} />
                  ))}
                  <span className="pw-strength-label" style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="fgroup">
              <label>Confirm New Password</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyAndReset()}
              />
              {confirmPassword && newPassword && (
                <div style={{ marginTop: 6, fontSize: 13, color: newPassword === confirmPassword ? "var(--success)" : "var(--danger)" }}>
                  {newPassword === confirmPassword ? "✓ Passwords match" : "✕ Passwords do not match"}
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
              onClick={handleVerifyAndReset}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Verifying…" : "Verify & Reset Password →"}
            </button>

            <div style={{ marginTop: 20, textAlign: "center", fontSize: 14 }}>
              <span style={{ color: "var(--text-muted)" }}>Didn&apos;t receive it? </span>
              <button
                onClick={handleResend}
                disabled={loading}
                style={{ background: "none", border: "none", color: "var(--blue)", fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: 0 }}
              >
                Resend OTP{resendCount > 0 ? ` (${resendCount})` : ""}
              </button>
              <span style={{ color: "var(--text-muted)", margin: "0 8px" }}>·</span>
              <button
                onClick={() => { setStep(1); setError(""); setOtp(["", "", "", "", "", ""]); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: 0 }}
              >
                Change email
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Success ── */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2>Password Reset!</h2>
            <p className="login-sub">Your password has been updated successfully.</p>
            <div className="alert succ" style={{ marginTop: 20, marginBottom: 28, textAlign: "left" }}>
              <span className="alert-icon">🎉</span>
              <div>You can now sign in with your new password.</div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={() => router.push("/login")}>
              Go to Login →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
