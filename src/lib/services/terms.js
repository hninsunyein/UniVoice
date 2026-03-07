/**
 * EWSD Terms & Conditions Service
 */
import { get, post } from "../api";

/** List all terms & conditions versions */
export const listTerms = () => get("/terms-conditions");

/** Create a new terms & conditions version - Admin only */
export const createTerms = (content) => post("/terms-conditions", { content });
