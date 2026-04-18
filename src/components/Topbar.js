"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { logout } from "@/lib/auth";
import { getUser, getAccessToken, getRefreshToken, clearTokens, getLastLoginAt } from "@/lib/api";

/* ── Constants ──────────────────────────────────────────
   Idle timeout: warn after 25 min, auto-logout after 30 min.
   These match typical university security policies.
   ──────────────────────────────────────────────────────── */
const IDLE_WARN_MS  = 25 * 60 * 1000; // 25 min → show warning
const IDLE_GRACE_S  = 5  * 60;        // 5 min grace period (in seconds) before auto-logout

/* Decode any JWT payload without a library */
function parseJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function fmtLoginTime(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date}, ${time}`;
  } catch {
    return null;
  }
}

function fmtCountdown(secsLeft) {
  if (secsLeft <= 0) return "0:00";
  const m = Math.floor(secsLeft / 60);
  const s = secsLeft % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Topbar({ userInfo, backTo, backLabel, avatar }) {
  const [tokenMinsLeft,  setTokenMinsLeft]  = useState(null);   // refresh token < 5 min remaining
  const [sessionExpired, setSessionExpired] = useState(false);  // hard expired
  const [idleWarn,       setIdleWarn]       = useState(false);  // idle warning active
  const [idleSecsLeft,   setIdleSecsLeft]   = useState(null);   // countdown during idle warning
  const [lastLogin,      setLastLogin]      = useState(null);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);

  const tokenIntervalRef = useRef(null);
  const idleWarnTimer    = useRef(null);  // fires after IDLE_WARN_MS to show warning
  const idleCountdown    = useRef(null);  // 1s tick during grace period

  /* ── Sidebar toggle ── */
  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      document.body.classList.toggle("sidebar-open", next);
      return next;
    });
  };

  useEffect(() => {
    const close = () => { setSidebarOpen(false); document.body.classList.remove("sidebar-open"); };
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  /* ── Last login display ── */
  useEffect(() => {
    setLastLogin(fmtLoginTime(getLastLoginAt()));
  }, []);

  /* ── Shared logout ── */
  const performLogout = useCallback(async () => {
    clearInterval(tokenIntervalRef.current);
    clearTimeout(idleWarnTimer.current);
    clearInterval(idleCountdown.current);
    const user = getUser();
    const role = (user?.roleName || user?.role || "").toUpperCase();
    try { await logout(); } catch {}
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path.startsWith("/admin")) {
      window.location.href = "/admin/login";
    } else if (role === "GUEST") {
      window.location.href = "/";
    } else {
      window.location.href = "/login";
    }
  }, []);

  const forceExpire = useCallback(() => {
    clearInterval(tokenIntervalRef.current);
    clearTimeout(idleWarnTimer.current);
    clearInterval(idleCountdown.current);
    localStorage.setItem("sessionExpired", "true");
    clearTokens();
    setSessionExpired(true);
  }, []);

  /* ── Token expiry monitoring (refresh token = true session boundary) ── */
  useEffect(() => {
    function checkToken() {
      const rToken = getRefreshToken();
      if (!rToken) return;
      const payload = parseJwtPayload(rToken);
      if (!payload?.exp) return;

      const remaining = payload.exp * 1000 - Date.now();
      if (remaining <= 0) { forceExpire(); return; }

      // Warn when < 5 minutes of refresh token life remain
      setTokenMinsLeft(remaining <= 5 * 60 * 1000 ? Math.ceil(remaining / 60000) : null);
    }

    checkToken();
    tokenIntervalRef.current = setInterval(checkToken, 30_000);
    return () => clearInterval(tokenIntervalRef.current);
  }, [forceExpire]);

  /* ── Idle timeout (resets on any user interaction) ── */
  useEffect(() => {
    function startIdleTimer() {
      clearTimeout(idleWarnTimer.current);
      clearInterval(idleCountdown.current);
      setIdleWarn(false);
      setIdleSecsLeft(null);

      idleWarnTimer.current = setTimeout(() => {
        // 25 min of inactivity — start countdown
        let secsLeft = IDLE_GRACE_S;
        setIdleWarn(true);
        setIdleSecsLeft(secsLeft);

        idleCountdown.current = setInterval(() => {
          secsLeft -= 1;
          setIdleSecsLeft(secsLeft);
          if (secsLeft <= 0) {
            clearInterval(idleCountdown.current);
            forceExpire();
          }
        }, 1_000);
      }, IDLE_WARN_MS);
    }

    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    EVENTS.forEach(e => window.addEventListener(e, startIdleTimer, { passive: true }));
    startIdleTimer(); // kick off on mount

    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, startIdleTimer));
      clearTimeout(idleWarnTimer.current);
      clearInterval(idleCountdown.current);
    };
  }, [forceExpire]);

  /* ── JSX ── */
  return (
    <>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle menu">
            <span className={`ham-line ${sidebarOpen ? "open" : ""}`} />
            <span className={`ham-line ${sidebarOpen ? "open" : ""}`} />
            <span className={`ham-line ${sidebarOpen ? "open" : ""}`} />
          </button>
          <div className="logo">Uni<em>Voice</em></div>
        </div>

        <div className="topbar-info">
          {avatar ? (
            <div className="topbar-avatar-group">
              <div className="topbar-avatar-circle">{avatar.initial}</div>
              <div className="topbar-avatar-text">
                <span className="topbar-avatar-name">{avatar.name}</span>
                <span className="topbar-avatar-role">{avatar.role}</span>
                {lastLogin && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                    Last login: {lastLogin}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="topbar-user" dangerouslySetInnerHTML={{ __html: userInfo }} />
          )}
          {backTo ? (
            <Link href={backTo} className="logout-btn">{backLabel || "← Back"}</Link>
          ) : (
            <button
              className="logout-btn"
              onClick={performLogout}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Log Out
            </button>
          )}
        </div>
      </div>

      {/* ── Refresh token expiring soon banner ── */}
      {tokenMinsLeft !== null && !sessionExpired && (
        <div style={{
          background: "#fff8e1", borderBottom: "1px solid #f9a825",
          padding: "8px 24px", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: "#6d4c00",
        }}>
          <span>
            Your session expires in{" "}
            <strong>{tokenMinsLeft} minute{tokenMinsLeft !== 1 ? "s" : ""}</strong>.
            Please save your work.
          </span>
          <button
            onClick={performLogout}
            style={{
              background: "none", border: "1px solid #6d4c00", borderRadius: 5,
              padding: "3px 12px", cursor: "pointer", fontSize: 12, color: "#6d4c00",
            }}
          >
            Log Out Now
          </button>
        </div>
      )}

      {/* ── Idle warning modal (shown after 25 min inactivity) ── */}
      {idleWarn && !sessionExpired && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "36px 40px",
            maxWidth: 380, width: "90%", textAlign: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⏳</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "var(--navy)", marginBottom: 8 }}>
              Still there?
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 6 }}>
              You&apos;ve been inactive for 25 minutes. You will be logged out in:
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#b91c1c", marginBottom: 20, fontVariantNumeric: "tabular-nums" }}>
              {fmtCountdown(idleSecsLeft ?? 0)}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={() => {
                  /* Simulate activity to reset the idle timer */
                  window.dispatchEvent(new MouseEvent("mousemove"));
                }}
              >
                Stay Logged In
              </button>
              <button
                className="btn btn-outline btn-full"
                onClick={performLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Session expired blocking modal ── */}
      {sessionExpired && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "36px 44px",
            maxWidth: 380, width: "90%", textAlign: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "var(--navy)", marginBottom: 10 }}>
              Session Expired
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24 }}>
              Your session has timed out for security reasons.
              Please log in again to continue.
            </div>
            <button className="btn btn-primary btn-full" onClick={performLogout}>
              Log In Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
