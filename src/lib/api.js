/**
 * EWSD API Client
 * Base URL: https://ewsdapi-production.up.railway.app/api
 *
 * Handles:
 *  - JSON and multipart/form-data requests
 *  - Automatic Authorization header injection
 *  - Automatic access-token refresh on 401
 *  - Token storage in localStorage
 */

export const BASE_URL = "https://ewsdapi-production.up.railway.app/api";

/* ─── Token helpers ─── */
export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const getRefreshToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;

export const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  // loginAt is intentionally kept — on next login it gets promoted to lastLoginAt
  // lastLoginAt is intentionally kept — used on login page (session expired) and dashboards
};

export const setUser = (user) =>
  localStorage.setItem("user", JSON.stringify(user));

export const getUser = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

/* Returns the previous login timestamp for the currently active user.
   Keyed by email so different users on the same device get their own history. */
export const getLastLoginAt = () => {
  if (typeof window === "undefined") return null;
  const email = localStorage.getItem("activeUserEmail");
  if (email) {
    const perEmail = localStorage.getItem(`lastLoginAt_${email}`);
    if (perEmail) return perEmail;
  }
  // Fallback to legacy non-keyed key (for users migrating from old storage format)
  return localStorage.getItem("lastLoginAt") || null;
};

/* ─── Token refresh ─── */
let isRefreshing = false;
let refreshSubscribers = [];

const onTokenRefreshed = (newToken) =>
  refreshSubscribers.forEach((cb) => cb(newToken));

const addRefreshSubscriber = (cb) => refreshSubscribers.push(cb);

const doRefresh = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available.");

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json();

  if (!data.success) {
    clearTokens();
    throw new Error("Session expired. Please log in again.");
  }

  const { accessToken, refreshToken: newRefresh } = data.data;
  setTokens(accessToken, newRefresh);
  return accessToken;
};

/* ─── Core request function ─── */
export const apiRequest = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, { ...options, headers });

  // Handle 401 with token refresh
  if (res.status === 401) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addRefreshSubscriber(async (newToken) => {
          try {
            headers["Authorization"] = `Bearer ${newToken}`;
            const retryRes = await fetch(url, { ...options, headers });
            const ct = retryRes.headers.get("content-type") || "";
            if (!ct.includes("application/json") || retryRes.status === 204) {
              resolve({ success: retryRes.ok, status: retryRes.status });
            } else {
              const d = await retryRes.json();
              if (!retryRes.ok) {
                const msg = (Array.isArray(d?.message) ? d.message.join(", ") : d?.message) || d?.error || `Request failed (${retryRes.status})`;
                resolve({ success: false, message: msg, status: retryRes.status, data: d });
              } else {
                resolve(typeof d?.success === "boolean" ? d : { success: true, data: d });
              }
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await doRefresh();
      isRefreshing = false;
      onTokenRefreshed(newToken);
      refreshSubscribers = [];

      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    } catch (err) {
      isRefreshing = false;
      refreshSubscribers = [];
      clearTokens();
      if (typeof window !== "undefined") {
        localStorage.setItem("sessionExpired", "true");
        const isAdmin = window.location.pathname.startsWith("/admin");
        window.location.href = isAdmin ? "/admin/login" : "/login";
      }
      throw err;
    }
  }

  // Some endpoints return 201/204 with no body
  const contentType = res.headers.get("content-type") || "";
  const hasBody = contentType.includes("application/json") || contentType.includes("text/");
  if (!hasBody || res.status === 204) {
    return { success: res.ok, status: res.status };
  }

  const data = await res.json();

  if (!res.ok) {
    // Surface the real backend error message (NestJS / Express format)
    const msg =
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ||
      data?.error ||
      `Request failed (${res.status})`;
    console.error("[API]", res.status, res.url, data);
    return { success: false, message: msg, status: res.status, data };
  }

  // Normalise success response
  if (typeof data?.success === "boolean") return data;
  return { success: true, data, status: res.status };
};

/* ─── HTTP method helpers ─── */
export const get = (path, params) => {
  const query = params
    ? "?" + new URLSearchParams(Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      )).toString()
    : "";
  return apiRequest(`${path}${query}`);
};

export const post = (path, body) =>
  apiRequest(path, { method: "POST", body: JSON.stringify(body) });

export const patch = (path, body) =>
  apiRequest(path, { method: "PATCH", body: JSON.stringify(body) });

export const del = (path) =>
  apiRequest(path, { method: "DELETE" });

export const postFormData = (path, formData) =>
  apiRequest(path, { method: "POST", body: formData });

export const patchFormData = (path, formData) =>
  apiRequest(path, { method: "PATCH", body: formData });

/* ─── Public (no-auth) GET ─── */
export const publicGet = async (path) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 204 || res.headers.get("content-length") === "0") return [];
  return res.json();
};
