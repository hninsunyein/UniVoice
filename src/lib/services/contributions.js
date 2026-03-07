/**
 * EWSD Contributions Service
 */
import { get, patch, postFormData, patchFormData } from "../api";

/** Submit new contribution - Student, multipart/form-data */
export const submitContribution = (academicYearId, contributionTitle, description, file, image = null) => {
  const formData = new FormData();
  formData.append("academicYearId", academicYearId);
  formData.append("contributionTitle", contributionTitle);
  formData.append("description", description || "");
  formData.append("file", file);
  if (image) formData.append("image", image);

  return postFormData("/contributions", formData);
};

/** Update contribution - multipart/form-data */
export const updateContribution = (id, fields, file, image = null) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) formData.append(k, v); });
  if (file) formData.append("file", file);
  if (image) formData.append("image", image);
  return patchFormData(`/contributions/${id}`, formData);
};

/** List contributions with filters */
export const listContributions = (params) => get("/contributions", params);

/** Get single contribution */
export const getContribution = (id) => get(`/contributions/${id}`);

/** Select/unselect contribution - Coordinator */
export const selectContribution = (id, isSelected) =>
  patch(`/contributions/${id}/select`, { isSelected: Boolean(isSelected) });

/** Download selected contributions as ZIP - Manager */
export const getExportUrl = (academicYearId) =>
  `https://ewsdapi-production.up.railway.app/api/contributions/export/${academicYearId}`;
