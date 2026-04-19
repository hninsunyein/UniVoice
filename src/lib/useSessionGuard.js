"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, clearTokens } from "@/lib/api";

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
 * - Auto-logs out after INACTIVITY_MS of no user activity.
 * - Re-checks on tab focus (catches sessions expired on other devices).
 */
export function useSessionGuard(loginPath = "/login") {
  const router = useRouter();
  const timerRef = useRef(null);

  const signOut = useCallback(() => {
    clearTokens();
    localStorage.setItem("sessionExpired", "true");
    router.push(loginPath);
  }, [loginPath, router]);

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

    resetTimer();

    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const t = getAccessToken();
        if (!t || isJwtExpired(t)) signOut();
        else resetTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [signOut, resetTimer]);
}
