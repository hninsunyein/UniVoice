"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { getUser, getAccessToken } from "@/lib/api";
import { listContributions, getContribution, selectContribution } from "@/lib/services/contributions";
import { addComment, getComments } from "@/lib/services/comments";
import { listFaculties } from "@/lib/services/faculties";
import { listAcademicYears } from "@/lib/services/closures";

/* ── helpers ── */
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtCommentDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function daysAgo(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d)) / (1000 * 60 * 60 * 24));
}
const cid = (c) =>
  c?.contributionId  ||
  c?.id              ||
  c?.contribution_id ||
  c?._id             || undefined;

/* Read status from whichever field the API uses */
const getStatus = (c) =>
  (c?.status || c?.contributionStatus || c?.statusName || "").toUpperCase();

const isContribSelected = (c) => getStatus(c) === "SELECTED";
const isContribPending  = (c) => !isContribSelected(c) && getStatus(c) !== "REJECTED";

const isNotReviewed = (c) => {
  const s = getStatus(c);
  return s === "SUBMITTED" || s === "PENDING" || s === "UPDATE" || s === "UPDATED" || s === "";
};
const isReviewed = (c) => {
  const s = getStatus(c);
  return s === "REVIEWED" || s === "SELECTED";
};

function StatusBadge({ c, daysOld }) {
  const s = getStatus(c);
  if (s === "SELECTED")                  return <span className="badge b-green">✅ Selected</span>;
  if (s === "REJECTED")                  return <span className="badge b-red">✕ Rejected</span>;
  if (s === "REVIEWED")                  return <span className="badge b-purple">🔍 Under Review</span>;
  if (s === "UPDATE" || s === "UPDATED") return <span className="badge b-warn">✏️ Updated</span>;
  if (daysOld > 14)                      return <span className="badge b-red">⚠ {daysOld}d overdue</span>;
  return <span className="badge b-blue">⏳ Submitted</span>;
}

export default function CoordinatorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [contributions,    setContributions]    = useState([]);
  const [allContributions, setAllContributions] = useState([]);
  const [selected,         setSelected]         = useState(null);
  const [fullDetail,       setFullDetail]       = useState(null);
  const [showDetail,       setShowDetail]       = useState(false);
  const [comments,         setComments]         = useState([]);
  const [commentText,      setCommentText]      = useState("");
  const [statusFilter,     setStatusFilter]     = useState("");
  const [search,           setSearch]           = useState("");
  const [activeTab,        setActiveTab]        = useState("all");

  const [facultyMap,       setFacultyMap]       = useState({});
  const [finalClosureDate, setFinalClosureDate] = useState(null);

  const [loading,        setLoading]        = useState(true);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");
  const [loginAt,        setLoginAt]        = useState(null);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/login"); return; }
    setUser(getUser());
    setLoginAt(localStorage.getItem("loginAt") || null);
    fetchLookups();
    fetchContributions();
  }, []);

  const fetchLookups = async () => {
    try {
      const [facultiesRes, yearsRes] = await Promise.all([listFaculties(), listAcademicYears()]);
      if (facultiesRes.success !== false) {
        const list = Array.isArray(facultiesRes.data) ? facultiesRes.data
          : Array.isArray(facultiesRes) ? facultiesRes : [];
        const map = {};
        list.forEach((f) => { if (f.facultyId || f.id) map[f.facultyId || f.id] = f; });
        setFacultyMap(map);
      }
      if (yearsRes.success !== false) {
        const years = Array.isArray(yearsRes.data) ? yearsRes.data : [];
        const active = years.find((y) => y.closureDate?.isActive) || years[years.length - 1];
        if (active?.closureDate?.finalClosureDate) {
          setFinalClosureDate(active.closureDate.finalClosureDate);
        }
      }
    } catch {}
  };

  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    fetchContributions();
  }, [statusFilter]);

  const parseItems = (data) => {
    const raw = data;
    return (
      Array.isArray(raw?.contributions) ? raw.contributions :
      Array.isArray(raw?.items)         ? raw.items         :
      Array.isArray(raw?.content)       ? raw.content       :
      Array.isArray(raw?.list)          ? raw.list          :
      Array.isArray(raw?.result)        ? raw.result        :
      Array.isArray(raw)                ? raw               : []
    );
  };

  const fetchAllPages = async (params = {}) => {
    const res = await listContributions(params);
    if (res.success === false) throw new Error(res.message || "Failed to load contributions.");
    return parseItems(res.data);
  };

  const fetchContributions = async () => {
    setLoading(true);
    setError("");
    try {
      const allItems = await fetchAllPages({});
      setAllContributions(allItems);
      const filtered = statusFilter
        ? allItems.filter((c) => (c.status || "").toLowerCase() === statusFilter.toLowerCase())
        : allItems;
      setContributions(filtered);
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (contrib) => {
    setSelected(contrib);
    setShowDetail(true);
    setFullDetail(null);
    setComments([]);
    setCommentText("");
    setError("");
    setSuccess("");
    setDetailLoading(true);
    try {
      const [detailRes, commentsRes] = await Promise.all([
        getContribution(cid(contrib)),
        getComments(cid(contrib)),
      ]);
      if (detailRes.success !== false) {
        const d = detailRes.data ?? detailRes;
        if (d && typeof d === "object" && !Array.isArray(d)) {
          const localStatus = contrib?.status;
          setFullDetail(localStatus ? { ...d, status: localStatus } : d);
        }
      }
      if (commentsRes.success !== false) {
        const cd = commentsRes.data;
        setComments(
          Array.isArray(cd)           ? cd          :
          Array.isArray(cd?.items)    ? cd.items    :
          Array.isArray(cd?.comments) ? cd.comments : []
        );
      }
    } catch {}
    finally { setDetailLoading(false); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selected) return;
    const contributionId = cid(fullDetail) || cid(selected);
    if (!contributionId) { setError("Cannot resolve contribution ID."); return; }
    setCommentLoading(true);
    setError("");
    try {
      const res = await addComment(contributionId, commentText.trim());
      if (res.success === false) throw new Error(res.message || "Comment failed.");
      setCommentText("");
      setSuccess("Comment added.");
      const reviewedContrib = { ...(fullDetail || selected), status: "reviewed" };
      setSelected((prev)   => prev ? { ...prev, status: "reviewed" } : prev);
      setFullDetail((prev) => prev ? { ...prev, status: "reviewed" } : prev);
      setContributions((prev) =>
        prev.map((c) => cid(c) === contributionId ? { ...c, status: "reviewed" } : c)
      );
      setAllContributions((prev) =>
        prev.map((c) => cid(c) === contributionId ? { ...c, status: "reviewed" } : c)
      );
      const [cr] = await Promise.all([
        getComments(contributionId),
        fetchContributions(),
      ]);
      if (cr.success !== false) {
        const cd = cr.data;
        setComments(
          Array.isArray(cd)           ? cd          :
          Array.isArray(cd?.items)    ? cd.items    :
          Array.isArray(cd?.comments) ? cd.comments : []
        );
      }
    } catch (err) {
      setError(err.message);
    } finally { setCommentLoading(false); }
  };

  const handleSelect = async (isSelected) => {
    if (!selected) return;
    const contributionId = cid(fullDetail) || cid(selected);
    if (!contributionId) { setError("Cannot resolve contribution ID."); return; }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await selectContribution(contributionId, isSelected);
      if (res.success === false) throw new Error(res.message || "Action failed.");
      setSuccess(isSelected ? "✓ Contribution selected for publication." : "Contribution unselected.");
      const newStatus = isSelected ? "Selected" : "Submitted";
      const updateList = (prev) =>
        prev.map((c) => cid(c) === contributionId ? { ...c, status: newStatus } : c);
      setContributions(updateList);
      setAllContributions(updateList);
      setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
      setFullDetail((prev) => prev ? { ...prev, status: newStatus } : prev);
      fetchContributions();
    } catch (err) {
      setError(err.message);
    } finally { setActionLoading(false); }
  };

  const resolveStudent = (c) =>
    c?.user?.username || c?.studentName || c?.student?.username || c?.submittedByName || null;

  const resolveFaculty = (c) => {
    const fid = c?.facultyId || c?.faculty?.facultyId || c?.user?.facultyId || c?.student?.facultyId;
    const f   = fid ? facultyMap[fid] : null;
    return f?.facultyName || c?.facultyName || c?.faculty?.facultyName || c?.user?.faculty?.facultyName || null;
  };

  /* ── filtered list (search only — status filter applied server-side via fetchContributions) ── */
  const filtered = contributions.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.contributionTitle || c.title || "").toLowerCase().includes(q) ||
      (resolveStudent(c) || "").toLowerCase().includes(q) ||
      (resolveFaculty(c) || "").toLowerCase().includes(q)
    );
  });

  const getSubmitDate = (c) => c.createdAt || c.submittedAt || c.submitted_at || c.created_at || null;

  /* ── counts derived entirely from filtered ── */
  const total           = filtered.length;
  const notReviewedList = filtered.filter(isNotReviewed);
  const reviewedList    = filtered.filter(isReviewed);
  const pendingTabCount = notReviewedList.length;
  const reviewedTabCount = reviewedList.length;
  const selCount        = filtered.filter(isContribSelected).length;
  const overdue         = filtered.filter((c) => getStatus(c) === "SUBMITTED" && daysAgo(getSubmitDate(c)) > 14).length;

  const tabFiltered =
    activeTab === "reviewed" ? reviewedList :
    activeTab === "pending"  ? notReviewedList :
    filtered;

  const parsedFinal = finalClosureDate ? new Date(finalClosureDate.replace(" ", "T").replace(/\+00$/, "Z").replace(/\+00:00$/, "Z")) : null;
  const pastFinal   = parsedFinal ? Date.now() > parsedFinal.getTime() : false;

  const statBase = allContributions.length > 0 ? allContributions : contributions;
  const totalAll = statBase.length;
  const overdueAll = statBase.filter((c) => getStatus(c) === "SUBMITTED" && daysAgo(getSubmitDate(c)) > 14).length;
  const selectedAll = statBase.filter(isContribSelected).length;

  const avatarInfo = user
    ? { initial: (user.username || "C")[0].toUpperCase(), name: user.username || "Coordinator", role: "Coordinator" }
    : { initial: "C", name: "Coordinator", role: "Coordinator" };

  const facultyName = user?.faculty?.facultyName || user?.facultyName || "Your Faculty";

  const sidebarConfig = {
    profile: {
      initial: avatarInfo.initial,
      name: avatarInfo.name,
      subtitle: facultyName,
      role: "Coordinator",
      avatarStyle: { background: "linear-gradient(135deg,#1a4a8a,#2a70c0)" },
    },
    sections: [
      {
        title: "Contributions",
        items: [
          { icon: "🗂", label: "All Contributions", href: "/user/coordinator", active: true, badge: totalAll > 0 ? String(totalAll) : undefined, badgeColor: "blue" },
          { icon: "⚠️", label: "Overdue", href: "#", badge: overdueAll > 0 ? String(overdueAll) : undefined, badgeColor: "red" },
        ],
      },
    ],
  };

  const detail = fullDetail || selected;

  return (
    <>
      <Topbar avatar={avatarInfo} />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">

          {/* Page header */}
          <div className="pg-header">
            <div>
              <div className="pg-title">
                {showDetail && selected
                  ? <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={() => { setShowDetail(false); setSelected(null); setFullDetail(null); setError(""); setSuccess(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--blue)", padding: 0, lineHeight: 1 }}
                        title="Back to list"
                      >←</button>
                      Review Contribution
                    </span>
                  : "Review Contributions"
                }
              </div>
              <div className="pg-sub">{facultyName} · {totalAll} submission{totalAll !== 1 ? "s" : ""}</div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => fetchContributions()}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {/* Last login banner */}
          {loginAt && (
            <div className="alert info" style={{ marginBottom: 16 }}>
              <span className="alert-icon">🔵</span>
              <div>Last login: <strong>{new Date(loginAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong> at <strong>{new Date(loginAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</strong></div>
            </div>
          )}

          {/* Stats */}
          <div className="stats" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 20 }}>
            <div className="stat">
              <div className="stat-n">{loading ? "…" : totalAll}</div>
              <div className="stat-l">Total</div>
            </div>
            <div className="stat orange">
              <div className="stat-n">{loading ? "…" : statBase.filter(isNotReviewed).length}</div>
              <div className="stat-l">Not Yet Reviewed</div>
            </div>
            <div className="stat green">
              <div className="stat-n">{loading ? "…" : statBase.filter(isReviewed).length}</div>
              <div className="stat-l">Reviewed</div>
            </div>
            <div className="stat green">
              <div className="stat-n">{loading ? "…" : selectedAll}</div>
              <div className="stat-l">Selected</div>
            </div>
            <div className="stat red">
              <div className="stat-n">{loading ? "…" : overdueAll}</div>
              <div className="stat-l">Overdue (&gt;14d)</div>
            </div>
          </div>

          {/* Overdue alert */}

          {/* Alerts */}
          {success && (
            <div className="alert succ" style={{ marginBottom: 12 }}>
              <span className="alert-icon">✅</span><div>{success}</div>
            </div>
          )}
          {error && (
            <div className="alert dang" style={{ marginBottom: 12 }}>
              <span className="alert-icon">⚠️</span><div>{error}</div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {!showDetail && (
            <>
              {/* Search + Filter */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <div className="adm-search-box" style={{ flex: 1, minWidth: 200 }}>
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by title or student name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); }}
                  style={{ border: "1.5px solid var(--border)", borderRadius: 7, padding: "8px 12px", fontFamily: "inherit", fontSize: 13, color: "var(--text)" }}
                >
                  <option value="">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="Update">Updated</option>
                  <option value="Selected">Selected</option>
                </select>
                {(search || statusFilter) && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => { setSearch(""); setStatusFilter(""); }}
                  >Clear</button>
                )}
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <div className="ch">
                  <div>
                    <div className="ch-title">Contributions</div>
                    <div className="ch-sub">
                      {loading ? "Loading…" : `${tabFiltered.length} result${tabFiltered.length !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 8px", background: "var(--sky)" }}>
                  {[
                    { key: "all",      label: "All",              count: total,          badgeCls: "b-draft" },
                    { key: "pending",  label: "Not Yet Reviewed", count: pendingTabCount, badgeCls: "b-blue" },
                    { key: "reviewed", label: "Reviewed",         count: reviewedTabCount, badgeCls: "b-green" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        padding: "10px 14px",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontSize: 12.5,
                        fontWeight: activeTab === tab.key ? 700 : 500,
                        color: activeTab === tab.key ? "var(--blue)" : "var(--text-muted)",
                        borderBottom: activeTab === tab.key ? "2px solid var(--blue)" : "2px solid transparent",
                        marginBottom: -1,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`badge ${tab.badgeCls}`} style={{ padding: "1px 7px", fontSize: 10 }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    Loading contributions…
                  </div>
                ) : tabFiltered.length === 0 ? (
                  <div className="cb">
                    <div className="alert info" style={{ margin: 0 }}>
                      <span className="alert-icon">📂</span>
                      <div>
                        {search || statusFilter
                          ? "No contributions match your search."
                          : activeTab === "all"
                            ? "No contributions submitted yet."
                            : activeTab === "pending"
                              ? "No pending contributions."
                              : "No reviewed contributions yet."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {tabFiltered.map((c, i) => {
                      const days   = daysAgo(c.createdAt);
                      const isOver = isNotReviewed(c) && days > 14;
                      const student   = resolveStudent(c);
                      const faculty   = resolveFaculty(c);
                      return (
                        <div
                          key={cid(c) || i}
                          onClick={() => openDetail(c)}
                          style={{
                            padding: "12px 16px",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--border)",
                            background: isOver ? "#fff8f8" : "#fff",
                            borderLeft: isOver ? "3px solid var(--danger)" : "3px solid transparent",
                            transition: "background .1s",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--navy)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.contributionTitle || c.title || "Untitled"}
                              </div>
                              {(student || faculty) && (
                                <div style={{ fontSize: 12, color: "var(--text-mid)", marginBottom: 2 }}>
                                  {student && <span style={{ fontWeight: 500 }}>{student}</span>}
                                  {student && faculty && " · "}
                                  {faculty && <span>{faculty}</span>}
                                </div>
                              )}
                              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                                {fmtDate(c.createdAt)}
                              </div>
                            </div>
                            <StatusBadge c={c} daysOld={days} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── DETAIL VIEW ── */}
          {showDetail && selected && (
            <div className="card">
              <div className="ch">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ch-title" style={{ fontSize: 15 }}>
                    {detail?.contributionTitle || detail?.title || "Untitled Contribution"}
                  </div>
                  <div className="ch-sub">
                    {resolveStudent(detail)
                      ? <>{resolveStudent(detail)} · Submitted {fmtDate(detail?.createdAt)}</>
                      : detail?.createdAt ? <>Submitted {fmtDate(detail.createdAt)}</> : null
                    }
                  </div>
                </div>
                <StatusBadge c={detail} daysOld={daysAgo(detail?.createdAt)} />
              </div>

              <div className="cb">
                {detailLoading ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Loading details…
                  </div>
                ) : (
                  <>
                    {/* Meta grid */}
                    {(resolveStudent(detail) || resolveFaculty(detail) || detail?.createdAt || detail?.updatedAt) && (
                      <div className="meta-grid" style={{ marginBottom: 16 }}>
                        {resolveStudent(detail) && (
                          <div className="meta-box">
                            <div className="meta-key">Student</div>
                            <div className="meta-val">{resolveStudent(detail)}</div>
                          </div>
                        )}
                        {resolveFaculty(detail) && (
                          <div className="meta-box">
                            <div className="meta-key">Faculty</div>
                            <div className="meta-val">{resolveFaculty(detail)}</div>
                          </div>
                        )}
                        {detail?.createdAt && (
                          <div className="meta-box">
                            <div className="meta-key">Submitted</div>
                            <div className="meta-val">{fmtDate(detail.createdAt)}</div>
                          </div>
                        )}
                        {detail?.updatedAt && (
                          <div className="meta-box">
                            <div className="meta-key">Last Updated</div>
                            <div className="meta-val">{fmtDate(detail.updatedAt)}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {detail?.description ? (
                      <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-mid)", marginBottom: 16, padding: "12px 14px", background: "var(--sky)", borderRadius: 8 }}>
                        {detail.description}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 16 }}>
                        No description provided.
                      </div>
                    )}

                    {/* File download */}
                    {(detail?.fileUrl || detail?.file?.url || detail?.documentUrl) && (
                      <div style={{ marginBottom: 16 }}>
                        <a
                          href={detail.fileUrl || detail.file?.url || detail.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          📄 Download Document
                        </a>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                      <button
                        className="btn btn-success"
                        onClick={() => handleSelect(true)}
                        disabled={actionLoading || isContribSelected(detail)}
                        style={{ opacity: isContribSelected(detail) ? 0.5 : 1 }}
                      >
                        ✓ Select for Magazine
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleSelect(false)}
                        disabled={actionLoading || isContribPending(detail)}
                        style={{ opacity: isContribPending(detail) ? 0.5 : 1 }}
                      >
                        ✕ Unselect
                      </button>
                    </div>

                    {/* Comments */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", marginBottom: 10 }}>
                        💬 Comments {comments.length > 0 && `(${comments.length})`}
                      </div>

                      {comments.length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 12 }}>
                          No comments yet.
                        </div>
                      ) : (
                        <div style={{ marginBottom: 12, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                          {comments.map((cm, i) => (
                            <div
                              key={cm.commentId || i}
                              style={{ background: "var(--sky)", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <strong style={{ color: "var(--navy)" }}>
                                  {cm.commenterName || cm.commenter?.username || "Coordinator"}
                                </strong>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  {fmtCommentDate(cm.commented_at || cm.commentedAt || cm.createdAt)}
                                </span>
                              </div>
                              <div style={{ color: "var(--text-mid)", lineHeight: 1.5 }}>
                                {cm.commentBody || cm.commentText || "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add comment — disabled after final closure */}
                      {pastFinal ? (
                        <div className="alert warn" style={{ marginBottom: 0 }}>
                          <span className="alert-icon">🔒</span>
                          <div>Comments are closed — the final closure date has passed. You can still select contributions for publication.</div>
                        </div>
                      ) : (
                        <>
                      <div className="fgroup" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 12 }}>Add Comment / Feedback</label>
                        <textarea
                          style={{ minHeight: 72, resize: "vertical" }}
                          placeholder="Write editorial feedback for this contribution…"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          disabled={commentLoading}
                        />
                      </div>
                      <button
                        className="btn btn-primary btn-full"
                        onClick={handleAddComment}
                        disabled={commentLoading || !commentText.trim()}
                        style={{ opacity: !commentText.trim() ? 0.6 : 1 }}
                      >
                        {commentLoading ? "Saving…" : "💬 Save Comment"}
                      </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
