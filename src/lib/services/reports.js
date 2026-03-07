/**
 * EWSD Reports & Statistics Service
 */
import { get } from "../api";

/** Dashboard summary counts */
export const getDashboardSummary = () => get("/reports/dashboard-summary");

/** Faculty-level statistics */
export const getStatistics = (academicYearId) =>
  get("/reports/statistics", academicYearId ? { academicYearId } : undefined);

/** Export statistics as CSV - returns a URL to trigger download */
export const getStatisticsExportUrl = (academicYearId) =>
  `https://ewsdapi-production.up.railway.app/api/reports/statistics/export${academicYearId ? `?academicYearId=${academicYearId}` : ""}`;

/** Contributions missing comments */
export const getMissingComments = () =>
  get("/reports/exceptions/missing-comments");

/** Contributions overdue (>14 days without comment) */
export const getOverdueComments = () =>
  get("/reports/exceptions/overdue-comments");
