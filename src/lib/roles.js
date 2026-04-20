/** Canonical role names — must match what the backend JWT returns */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MARKETING_MANAGER: "MARKETING_MANAGER",
  MARKETING_COORDINATOR: "MARKETING_COORDINATOR",
  STUDENT: "STUDENT",
  GUEST: "GUEST",
};

/** Route prefix → roles that may access it */
export const ROUTE_PERMISSIONS = {
  "/admin":            ["SUPER_ADMIN", "ADMIN"],
  "/user/student":     ["STUDENT"],
  "/user/coordinator": ["MARKETING_COORDINATOR"],
  "/user/manager":     ["MARKETING_MANAGER"],
  "/user/guest":       ["GUEST"],
  "/magazine":         ["GUEST", "MARKETING_COORDINATOR", "MARKETING_MANAGER", "SUPER_ADMIN", "ADMIN"],
};

/** Default home page per role after login */
export const ROLE_HOME = {
  SUPER_ADMIN:          "/admin",
  ADMIN:                "/admin",
  MARKETING_MANAGER:    "/user/manager",
  MARKETING_COORDINATOR:"/user/coordinator",
  STUDENT:              "/user/student",
  GUEST:                "/user/guest",
};

/** Public routes — no auth cookie required */
export const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/admin/login",
  "/forgot-password",
  "/change-password",
  "/email",
  "/403",
]);
