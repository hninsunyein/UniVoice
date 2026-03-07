/**
 * EWSD Academic Years & Closure Dates Service
 */
import { get, post, patch } from "../api";

/** List all academic years */
export const listAcademicYears = () => get("/academic-years");

/** Create academic year - Admin */
export const createAcademicYear = (body) => post("/academic-years", body);

/** Update academic year - Admin */
export const updateAcademicYear = (id, body) => patch(`/academic-years/${id}`, body);

/** List all closure dates */
export const listClosureDates = () => get("/closure-dates");

/** Create closure date - Admin */
export const createClosureDate = (body) => post("/closure-dates", body);

/** Update closure date - Admin */
export const updateClosureDate = (id, body) => patch(`/closure-dates/${id}`, body);

/** Toggle closure date active/inactive - Admin */
export const toggleClosureDateStatus = (id, isActive) => patch(`/closure-dates/${id}/status`, { isActive });
