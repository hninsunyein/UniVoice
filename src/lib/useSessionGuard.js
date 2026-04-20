"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, clearTokens, getUser } from "@/lib/api";

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

function isJwtExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? Date.now() >= payload.exp * 1000 : false;
  } catch {
    return false;
  }
}

/**
 * Protects a dashboard page.
 * - Redirects to loginPath if no token or JWT is expired.
 * - If allowedRoles is provided, redirects to /403 if the user's role is not allowed.
 * - Auto-logs out after INACTIVITY_MS of no user activity.
 * - Re-checks on tab focus (catches sessions expired on other devices).
 *
 * @param {string} loginPath  - where to redirect unauthenticated users (default: "/login")
 * @param {string[]|null} allowedRoles - roles permitted to access this page (null = any authenticated user)
 */
export function useSessionGuard(loginPath = "/login", allowedRoles = null) {
  const router = useRouter();
  const timerRef = useRef(null);

  const signOut = useCallback(() => {
    clearTokens();
    localStorage.setItem("sessionExpired", "true");
    router.push(loginPath);
  }, [loginPath, router]);

  const checkRole = useCallback(() => {
    if (!allowedRoles) return true;
    const user = getUser();
    const role = (user?.roleName || user?.role || "").toUpperCase();
    return !!role && allowedRoles.includes(role);
  }, [allowedRoles]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(signOut, INACTIVITY_MS);
  }, [signOut]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || isJwtExpired(token)) {
      signOut();
      return;
    }

    // Role check — redirect to /403 if the user lacks the required role
    if (!checkRole()) {
      router.replace("/403");
      return;
    }

    resetTimer();

    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const t = getAccessToken();
        if (!t || isJwtExpired(t)) signOut();
        else if (!checkRole()) router.replace("/403");
        else resetTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [signOut, resetTimer, checkRole, router]);
}
