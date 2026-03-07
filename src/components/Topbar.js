"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { logout } from "@/lib/auth";
import { getUser, getAccessToken, clearTokens } from "@/lib/api";

/* Decode the JWT exp claim without any library */
function parseJwtExpiry(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function fmtLoginTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function Topbar({ userInfo, backTo, backLabel, avatar }) {
  const [minsLeft,      setMinsLeft]      = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastLogin,     setLastLogin]     = useState(null);
  const intervalRef = useRef(null);

  /* Read last login time once on mount (client only) */
  useEffect(() => {
    setLastLogin(fmtLoginTime(localStorage.getItem("loginAt")));
  }, []);

  /* Proactive session monitoring — checks every 30 s */
  useEffect(() => {
    function checkSession() {
      const token = getAccessToken();
      if (!token) return;
      const expiry = parseJwtExpiry(token);
      if (!expiry) return;

      const remaining = expiry - Date.now();

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setSessionExpired(true);
        /* Clear tokens immediately so no further API calls succeed */
        clearTokens();
        return;
      }

      /* Warn when less than 5 minutes remain */
      setMinsLeft(remaining <= 5 * 60 * 1000 ? Math.ceil(remaining / 60000) : null);
    }

    checkSession();
    intervalRef.current = setInterval(checkSession, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const performLogout = async () => {
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
  };

  return (
    <>
      <div className="topbar">
        <div className="logo">Uni<em>Voice</em></div>
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

      {/* Session expiring soon — warning banner */}
      {minsLeft !== null && !sessionExpired && (
        <div style={{
          background: "#fff8e1", borderBottom: "1px solid #f9a825",
          padding: "8px 24px", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: "#6d4c00",
        }}>
          <span>
            Your session expires in{" "}
            <strong>{minsLeft} minute{minsLeft !== 1 ? "s" : ""}</strong>.
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

      {/* Session expired — blocking modal */}
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
