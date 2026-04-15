/**
 * EWSD Users Service - Admin only
 */
import { get, post, patch, del } from "../api";

/** List users with optional filters */
export const listUsers = (params) => get("/users", params);

/** Get single user */
export const getUser = (id) => get(`/users/${id}`);

/** Create new user */
export const createUser = (body) => post("/users", body);

/** Create guest user (no password required) */
export const createGuestUser = (body) => post("/users/guest", body);

/** Update user account details */
export const updateUser = (id, body) => patch(`/users/${id}/account`, body);

/** Toggle user active/inactive */
export const setUserStatus = (id, isActive) =>
  patch(`/users/${id}/status`, { isActive });

/** Unlock locked user */
export const unlockUser = (id) => patch(`/users/${id}/unlock`, {});

/** Admin manually sets a new password */
export const setUserPassword = (id, newPassword, confirmPassword) =>
  patch(`/users/${id}/password`, { newPassword, confirmPassword });

/** Generate and send a temporary password */
export const resetUserTempPassword = (id) =>
  post(`/users/${id}/password/reset-temp`, {});

/** Delete user */
export const deleteUser = (id) => del(`/users/${id}`);

/** Get current logged-in user's profile */
export const getMe = () => get("/users/me");

/** Update current logged-in user's profile */
export const updateMe = (body) => patch("/users/me", body);

/** Get guest faculty login records (correct endpoint) */
export const getGuestLogins = (params) => get("/users/guest-logins", params);
