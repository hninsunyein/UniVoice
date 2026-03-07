/**
 * EWSD Comments Service
 */
import { get, post } from "../api";

/** Add comment to a contribution */
export const addComment = (contributionId, commentBody) =>
  post("/comments", { contributionId, commentBody });

/** Get all comments for a contribution */
export const getComments = (contributionId) =>
  get(`/comments/contribution/${contributionId}`);
