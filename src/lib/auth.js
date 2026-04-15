/**
 * EWSD Auth Service
 * Wraps all /api/auth/* endpoints
 */

import { BASE_URL, post, setTokens, setUser, clearTokens, getRefreshToken } from "./api";

/* Role → dashboard route mapping (handles any case/format the API returns) */
const ROLE_PATHS = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  super_admin: "/admin",
  admin: "/admin",
  MARKETING_MANAGER: "/user/manager",
  marketing_manager: "/user/manager",
  MARKETING_COORDINATOR: "/user/coordinator",
  marketing_coordinator: "/user/coordinator",
  STUDENT: "/user/student",
  student: "/user/student",
  GUEST: "/user/guest",
  guest: "/user/guest",
};

const resolveRole = (roleName = "") => {
  // Try exact match first, then uppercase match
  return ROLE_PATHS[roleName] || ROLE_PATHS[roleName?.toUpperCase()] || null;
};

/**
 * Login
 * Uses a direct fetch (bypasses apiRequest 401-redirect logic so bad
 * credentials surface as a proper thrown error instead of a page redirect).
 * Returns { requiresPasswordChange, email } OR { path, user }
 */
export const login = async (email, password, facultyId) => {
  /* Build payload — omit undefined/empty fields */
  const payload = {};
  if (email) payload.email = email;
  if (password !== undefined && password !== null && password !== "") {
    payload.password = password;
  }
  if (facultyId) payload.facultyId = facultyId;

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!data.success) {
    /* NestJS class-validator returns message as an array on 400 */
    const msg = Array.isArray(data.message)
      ? data.message[0]
      : (data.message || "Login failed. Please check your credentials.");
    throw new Error(msg);
  }

  const { accessToken, refreshToken, requiresPasswordChange, user } = data.data;

  /* First-time login: no tokens issued yet */
  if (requiresPasswordChange) {
    return { requiresPasswordChange: true, email };
  }

  setTokens(accessToken, refreshToken);
  setUser(user);
  if (typeof window !== "undefined") localStorage.setItem("loginAt", new Date().toISOString());

  const path = resolveRole(user?.roleName) || resolveRole(user?.role) || "/admin";
  if (process.env.NODE_ENV !== "production") {
    console.log("[Auth] Login success:", { roleName: user?.roleName, role: user?.role, path });
  }
  return { requiresPasswordChange: false, path, user };
};

/**
 * First-time password change (student first login)
 * Returns { path, user } after tokens are issued
 */
export const firstLoginChangePassword = async (email, currentPassword, newPassword, confirmPassword) => {
  const data = await post("/auth/first-login/change-password", {
    email,
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!data.success) {
    throw new Error(data.message || "Password change failed.");
  }

  const { accessToken, refreshToken, user } = data.data;
  setTokens(accessToken, refreshToken);
  setUser(user);
  if (typeof window !== "undefined") localStorage.setItem("loginAt", new Date().toISOString());

  const path = resolveRole(user?.roleName) || resolveRole(user?.role) || "/user/student";
  return { path, user };
};

/**
 * Request OTP for password reset
 */
export const requestPasswordReset = async (email) => {
  const data = await post("/auth/password-reset/request", { email });
  if (!data.success) throw new Error(data.message || "Could not send OTP. Check your email address.");
  return data;
};

/**
 * Verify OTP
 * Returns { resetToken } on success
 */
export const verifyOTP = async (email, otp) => {
  const data = await post("/auth/password-reset/verify", { email, otp });
  if (!data.success) throw new Error(data.message || "Invalid or expired OTP.");
  return data.data; // { resetToken }
};

/**
 * Confirm new password after OTP verification
 */
export const confirmPasswordReset = async (email, otp, newPassword, confirmPassword) => {
  const data = await post("/auth/password-reset/confirm", {
    email,
    otp,
    newPassword,
    confirmPassword,
  });
  if (!data.success) throw new Error(data.message || "Password reset failed.");
  return data;
};

/**
 * Logout - invalidates refresh token on server
 */
export const logout = async () => {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await post("/auth/logout", { refreshToken });
  } catch {
    // Silently ignore logout API errors
  } finally {
    clearTokens();
  }
};
