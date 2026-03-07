/**
 * EWSD Faculties Service
 */
import { publicGet, post, patch } from "../api";

/** List all faculties - public endpoint */
export const listFaculties = () => publicGet("/faculties");

/** Create new faculty - Admin only */
export const createFaculty = (facultyName) =>
  post("/faculties", { facultyName });

/** Update faculty - Admin only */
export const updateFaculty = (id, facultyName) =>
  patch(`/faculties/${id}`, { facultyName });
