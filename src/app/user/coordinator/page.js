"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { getUser, getAccessToken, BASE_URL, get, getLastLoginAt } from "@/lib/api";
import { listContributions, getContribution, selectContribution } from "@/lib/services/contributions";
import { addComment, getComments } from "@/lib/services/comments";
import { listFaculties } from "@/lib/services/faculties";
import { listAcademicYears } from "@/lib/services/closures";
import { getOverdueComments } from "@/lib/services/reports";
import mammoth from "mammoth";

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

/* Fetch a file and return { blobUrl, mimeType, blob } or { error, status }.
   Accepts either a full HTTP URL (e.g. MinIO presigned) or an API-relative path. */
async function fetchBlobUrl(endpointOrUrl) {
  const isFullUrl = /^https?:\/\//.test(endpointOrUrl);
  const buildUrl  = (ep) => isFullUrl ? ep : `${BASE_URL}${ep}`;

  const doFetch = async (withAuth) => {
    let token = getAccessToken();
    const headers = withAuth && token ? { Authorization: `Bearer ${token}` } : {};
    let res = await fetch(buildUrl(endpointOrUrl), { headers });

    /* 401 — attempt one token refresh then retry */
    if (res.status === 401 && withAuth) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }),
        });
        const refreshData = await refreshRes.json();
        if (refreshData?.data?.accessToken) {
          token = refreshData.data.accessToken;
          localStorage.setItem("accessToken", token);
          res = await fetch(buildUrl(endpointOrUrl), {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch { /* refresh failed */ }
    }
    return res;
  };

  try {
    /* Full URLs: try without auth first (presigned/public), then with auth on 401 */
    let res = await doFetch(!isFullUrl);
    if (!res.ok && isFullUrl && res.status === 401) {
      res = await doFetch(true);
    }

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          msg = j?.message || msg;
        }
      } catch {}
      return { error: msg, status: res.status };
    }

    const blob = await res.blob();
    if (blob.size === 0) return { error: "File is empty", status: 200 };
    return { blobUrl: URL.createObjectURL(blob), mimeType: blob.type, blob };
  } catch (err) {
    return { error: err.message || "Network error", status: 0 };
  }
}

function triggerDownload(blobUrl, fileName) {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function viewDocument(blob, fileName) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fileName || "Document"}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 0 24px 40px; line-height: 1.7; color: #222; }
    h1,h2,h3,h4 { margin-top: 1.2em; }
    p { margin: 0.6em 0; }
    img { max-width: 100%; }
    .doc-toolbar { position: sticky; top: 0; background: #f0f4fa; border-bottom: 1px solid #ccd6e8; padding: 10px 0; margin: 0 -24px 24px; display: flex; align-items: center; gap: 12px; padding-left: 24px; z-index: 10; }
    .doc-toolbar button { background: #1a4a8a; color: #fff; border: none; border-radius: 6px; padding: 6px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
    .doc-toolbar button.outline { background: none; color: #1a4a8a; border: 1.5px solid #1a4a8a; }
    .doc-toolbar .doc-name { font-size: 13px; font-weight: 600; color: #1a4a8a; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="doc-toolbar">
    <button class="outline" onclick="window.close()">← Close Tab</button>
    <span class="doc-name">📄 ${fileName || "Document"}</span>
    <button onclick="window.print()">🖨 Print</button>
  </div>
  ${result.value}
</body>
</html>`;
    const htmlBlob = new Blob([html], { type: "text/html" });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    window.open(htmlUrl, "_blank");
  } catch {
    /* fallback: just open the raw blob url — browser may still download it */
    window.open(URL.createObjectURL(blob), "_blank");
  }
}

export default function CoordinatorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [activePage,       setActivePage]       = useState("contributions"); // "contributions" | "guests"

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

  /* guest visitors page */
  const [guestSearch,  setGuestSearch]  = useState("");

  const [facultyMap,       setFacultyMap]       = useState({});
  const [finalClosureDate, setFinalClosureDate] = useState(null);

  const [loading,        setLoading]        = useState(true);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");
  const [lastLoginAt,    setLastLoginAt]    = useState(null);

  /* blob URLs for the currently-open contribution's files */
  const [docBlob,      setDocBlob]      = useState(null); // { blobUrl, mimeType } | null
  const [imgBlob,      setImgBlob]      = useState(null); // { blobUrl, mimeType } | null
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileErr,      setFileErr]      = useState("");   // error from doc endpoint
  const [imgErr,       setImgErr]       = useState("");   // error from image endpoint

  /* guest visitors */
  const [guestLogins,     setGuestLogins]     = useState([]);
  const [guestLoading,    setGuestLoading]    = useState(false);

  /* overdue comments count from backend */
  const [overdueCount,    setOverdueCount]    = useState(null);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/login"); return; }
    const u = getUser();
    setUser(u);
    setLastLoginAt(getLastLoginAt());
    fetchLookups();
    fetchContributions();
    fetchGuestLogins();
    fetchOverdueCount();
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

  const fetchGuestLogins = async (q = guestSearch) => {
    setGuestLoading(true);
    try {
      const params = { page: 1, pageSize: 100 };
      if (q) params.search = q;
      const res = await get("/users/guest-logins", params);
      if (res?.success) {
        let items = res.data?.items ?? res.data?.data ?? [];

        /* Safety filter: keep only guests whose faculty matches this coordinator's faculty.
           The API should already scope by faculty for coordinator tokens, but we
           enforce it client-side to ensure no cross-faculty data leaks through. */
        const me = getUser();
        const myFacultyId = me?.facultyId || me?.faculty?.facultyId;
        if (myFacultyId) {
          items = items.filter(g => g.faculty?.facultyId === myFacultyId);
        }

        setGuestLogins(items);
      }
    } catch {}
    finally { setGuestLoading(false); }
  };

  const fetchOverdueCount = async () => {
    try {
      const res = await getOverdueComments();
      const items = Array.isArray(res?.data) ? res.data : [];
      setOverdueCount(items.length);
    } catch {
      setOverdueCount(null);
    }
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
        ? allItems.filter((c) => getStatus(c) === statusFilter)
        : allItems;
      setContributions(filtered);
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  /* Revoke old blob URLs to free memory */
  const clearBlobs = () => {
    if (docBlob?.blobUrl) URL.revokeObjectURL(docBlob.blobUrl);
    if (imgBlob?.blobUrl) URL.revokeObjectURL(imgBlob.blobUrl);
    setDocBlob(null);
    setImgBlob(null);
    setFileErr("");
    setImgErr("");
  };

  /* Load (or reload) file + image for the given contribution ID */
  const loadFiles = async (id) => {
    setFilesLoading(true);
    setFileErr("");
    setImgErr("");
    const [doc, img] = await Promise.all([
      fetchBlobUrl(`/contributions/${id}/file`),
      fetchBlobUrl(`/contributions/${id}/image`),
    ]);
    if (doc?.blobUrl) {
      setDocBlob(doc);
    } else {
      setDocBlob(null);
      setFileErr(doc?.error || "Could not load document.");
    }
    if (img?.blobUrl) {
      setImgBlob(img);
    } else {
      setImgBlob(null);
      setImgErr(img?.error || "Could not load image.");
    }
    setFilesLoading(false);
  };

  const openDetail = async (contrib) => {
    clearBlobs();
    setSelected(contrib);
    setShowDetail(true);
    setFullDetail(null);
    setComments([]);
    setCommentText("");
    setError("");
    setSuccess("");
    setDetailLoading(true);

    const id = cid(contrib);

    try {
      const [detailRes, commentsRes] = await Promise.all([
        getContribution(id),
        getComments(id),
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

    loadFiles(id);
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
    c?.student?.user?.username || c?.student?.user?.name  ||   // confirmed API path
    c?.student?.username       || c?.student?.name        ||
    c?.user?.username          || c?.user?.name           || c?.user?.fullName  ||
    c?.studentName             || c?.studentUsername      || c?.submittedByName ||
    c?.submittedBy?.username   || c?.submittedBy?.name    ||
    c?.author?.username        || c?.author?.name         ||
    c?.createdBy?.username     || c?.createdBy?.name      || null;

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
  const total            = filtered.length;
  const notReviewedList  = filtered.filter(isNotReviewed);
  const reviewedList     = filtered.filter(isReviewed);
  const overdueList      = filtered.filter((c) => isNotReviewed(c) && daysAgo(getSubmitDate(c)) > 14);
  const pendingTabCount  = notReviewedList.length;
  const reviewedTabCount = reviewedList.length;
  const overdueTabCount  = overdueList.length;
  const selCount         = filtered.filter(isContribSelected).length;
  const overdue          = overdueList.length;

  const tabFiltered =
    activeTab === "reviewed" ? reviewedList :
    activeTab === "pending"  ? notReviewedList :
    activeTab === "overdue"  ? overdueList :
    filtered;

  const parsedFinal = finalClosureDate ? new Date(finalClosureDate.replace(" ", "T").replace(/\+00$/, "Z").replace(/\+00:00$/, "Z")) : null;
  const pastFinal   = parsedFinal ? Date.now() > parsedFinal.getTime() : false;

  const statBase = allContributions.length > 0 ? allContributions : contributions;
  const totalAll = statBase.length;
  const overdueAll = statBase.filter((c) => isNotReviewed(c) && daysAgo(getSubmitDate(c)) > 14).length;
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
          {
            icon: "🗂",
            label: "All Contributions",
            active: activePage === "contributions",
            badge: totalAll > 0 ? String(totalAll) : undefined,
            badgeColor: "blue",
            onClick: () => setActivePage("contributions"),
          },
        ],
      },
      {
        title: "Activity",
        items: [
          {
            icon: "👥",
            label: "Guest Visitors",
            active: activePage === "guests",
            badge: guestLogins.length > 0 ? String(guestLogins.length) : undefined,
            badgeColor: "orange",
            onClick: () => {
              setActivePage("guests");
              fetchGuestLogins(guestSearch);
            },
          },
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

          {/* ══════════════════════════════════════════
               GUEST VISITORS PAGE
          ══════════════════════════════════════════ */}
          {activePage === "guests" && (
            <>
              <div className="pg-header">
                <div>
                  <div className="pg-title">Guest Visitors</div>
                  <div className="pg-sub">{facultyName} · {guestLogins.length} guest{guestLogins.length !== 1 ? "s" : ""} visited your faculty magazine</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => fetchGuestLogins(guestSearch)} disabled={guestLoading}>
                  ↺ Refresh
                </button>
              </div>

              {/* Search */}
              <div className="adm-search-box" style={{ marginBottom: 16 }}>
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search by guest email…"
                  value={guestSearch}
                  onChange={(e) => { setGuestSearch(e.target.value); fetchGuestLogins(e.target.value); }}
                />
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <div className="ch">
                  <div className="ch-title">Guest Login Records</div>
                  <div className="ch-sub">Guests who accessed your faculty&apos;s magazine</div>
                </div>

                {guestLoading ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading…</div>
                ) : guestLogins.length === 0 ? (
                  <div className="cb">
                    <div className="alert info" style={{ margin: 0 }}>
                      <span className="alert-icon">👥</span>
                      <div>No guest visitors yet. Guests will appear here when they access your faculty magazine.</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Email</th>
                          <th>Username</th>
                          <th>Faculty</th>
                          <th>Visited</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guestLogins.map((g, i) => {
                          const email    = g.email || g.user?.email || "—";
                          const username = g.user?.username || "—";
                          const faculty  = g.faculty?.facultyName || "—";
                          const date     = g.createdAt
                            ? new Date(g.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—";
                          return (
                            <tr key={g.guestFacultyLoginId || i}>
                              <td style={{ color: "var(--text-muted)", width: 40 }}>{i + 1}</td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 18 }}>👤</span>
                                  <span style={{ fontWeight: 600 }}>{email}</span>
                                </div>
                              </td>
                              <td style={{ color: "var(--text-muted)" }}>{username}</td>
                              <td><span className="badge b-blue">{faculty}</span></td>
                              <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {guestLogins.length > 0 && (
                  <div style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
                    {guestLogins.length} guest visitor{guestLogins.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════
               CONTRIBUTIONS PAGE
          ══════════════════════════════════════════ */}
          {activePage === "contributions" && (<>

          {/* Page header */}
          <div className="pg-header">
            <div>
              <div className="pg-title">
                {showDetail && selected
                  ? <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={() => { clearBlobs(); setShowDetail(false); setSelected(null); setFullDetail(null); setError(""); setSuccess(""); }}
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


          {/* Last login / first-time welcome banner */}
          <div className="alert info" style={{ marginBottom: 16 }}>
            <span className="alert-icon">🔵</span>
            {lastLoginAt ? (
              <div>Last login: <strong>{new Date(lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, {new Date(lastLoginAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</strong></div>
            ) : (
              <div>Welcome! 🎉 This is your <strong>first time</strong> logging in.</div>
            )}
          </div>

          {/* Stats + Overdue alert — hidden in detail view */}
          {!showDetail && (
            <>
              <div className="stats-5">
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
                  <div className="stat-n">{overdueCount === null ? "…" : overdueCount}</div>
                  <div className="stat-l">Overdue Comments</div>
                </div>
              </div>

              {overdueCount > 0 && (
                <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #b91c1c" }}>
                  <div className="cb" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
                    <div style={{ fontSize: 32 }}>⏰</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#b91c1c", marginBottom: 2 }}>
                        {overdueCount} Overdue Comment{overdueCount !== 1 ? "s" : ""}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {overdueCount === 1 ? "1 student contribution has" : `${overdueCount} student contributions have`} been waiting more than 14 days without a coordinator comment.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

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
                  <option value="SUBMITTED">Submitted</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="UPDATED">Updated</option>
                  <option value="SELECTED">Selected</option>
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
                    { key: "all",      label: "All",              count: total,           badgeCls: "b-draft" },
                    { key: "pending",  label: "Not Yet Reviewed", count: pendingTabCount,  badgeCls: "b-blue" },
                    { key: "reviewed", label: "Reviewed",         count: reviewedTabCount, badgeCls: "b-green" },
                    { key: "overdue",  label: "Overdue",          count: overdueTabCount,  badgeCls: "b-red" },
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
                              : activeTab === "overdue"
                                ? "No overdue contributions. All submissions have been commented on within 14 days."
                                : "No reviewed contributions yet."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {tabFiltered.map((c, i) => {
                      const days    = daysAgo(c.createdAt);
                      const isOver  = isNotReviewed(c) && days > 14;
                      const student = resolveStudent(c)
                        || c?.user?.email || c?.email || c?.studentEmail || "Unknown Student";
                      const faculty = resolveFaculty(c);
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
                              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--navy)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.contributionTitle || c.title || "Untitled"}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-mid)", marginBottom: 3 }}>
                                <span>👤</span>
                                <span style={{ fontWeight: 600, color: "var(--navy)" }}>{student}</span>
                                {faculty && <><span style={{ color: "var(--text-muted)" }}>·</span><span>{faculty}</span></>}
                              </div>
                              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                                📅 {fmtDate(c.createdAt || c.submittedAt)}
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
                      ? <><strong>{resolveStudent(detail)}</strong> · Submitted {fmtDate(detail?.submittedAt || detail?.createdAt)}</>
                      : (detail?.submittedAt || detail?.createdAt) ? <>Submitted {fmtDate(detail?.submittedAt || detail?.createdAt)}</> : null
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
                    {/* ── Author + submission info (always visible) ── */}
                    <div className="meta-grid" style={{ marginBottom: 16 }}>
                      <div className="meta-box">
                        <div className="meta-key">Author</div>
                        <div className="meta-val" style={{ fontWeight: 600 }}>
                          {resolveStudent(detail) || "—"}
                        </div>
                      </div>
                      {resolveFaculty(detail) && (
                        <div className="meta-box">
                          <div className="meta-key">Faculty</div>
                          <div className="meta-val">{resolveFaculty(detail)}</div>
                        </div>
                      )}
                      <div className="meta-box">
                        <div className="meta-key">Submitted</div>
                        <div className="meta-val">
                          {fmtDate(detail?.submittedAt || detail?.createdAt) || "—"}
                        </div>
                      </div>
                      {detail?.updatedAt && detail.updatedAt !== detail.createdAt && (
                        <div className="meta-box">
                          <div className="meta-key">Last Updated</div>
                          <div className="meta-val">{fmtDate(detail.updatedAt)}</div>
                        </div>
                      )}
                    </div>

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

                    {/* ── Attached files ── */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", marginBottom: 10 }}>
                        📎 Attached Files
                      </div>

                      {filesLoading ? (
                        <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>Loading files…</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                          {/* Document */}
                          <div style={{ background: "var(--sky)", borderRadius: 8, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 20 }}>📄</span>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                                    {detail?.originalFileName || detail?.fileName || detail?.file?.name || "Article Document"}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Word Document (.doc / .docx)</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {docBlob ? (
                                  <>
                                    <button
                                      className="btn btn-outline btn-sm"
                                      onClick={() => {
                                        const origName = detail?.originalFileName || detail?.fileName || "document.docx";
                                        viewDocument(docBlob.blob, origName);
                                      }}
                                    >
                                      👁 View
                                    </button>
                                    <button
                                      className="btn btn-navy btn-sm"
                                      onClick={() => {
                                        const student  = resolveStudent(detail) || "student";
                                        const origName = detail?.originalFileName || detail?.fileName || `contribution-${cid(detail)}.docx`;
                                        triggerDownload(docBlob.blobUrl, `${student}_${origName}`);
                                      }}
                                    >
                                      ⬇ Download
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontSize: 11, color: "var(--danger, #b52a2a)" }}>{fileErr || "Failed to load"}</span>
                                    <button
                                      className="btn btn-outline btn-sm"
                                      onClick={() => loadFiles(cid(detail))}
                                    >↻ Retry</button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Image */}
                          <div style={{ background: "var(--sky)", borderRadius: 8, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: imgBlob ? 10 : 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 20 }}>🖼️</span>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                                    {detail?.imageName || detail?.imageFileName || detail?.image?.name || "Supporting Image"}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Image</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {imgBlob ? (
                                  <button
                                    className="btn btn-navy btn-sm"
                                    onClick={() => {
                                      const student  = resolveStudent(detail) || "student";
                                      const origName = detail?.imageName || detail?.imageFileName || `contribution-image-${cid(detail)}`;
                                      triggerDownload(imgBlob.blobUrl, `${student}_${origName}`);
                                    }}
                                  >
                                    ⬇ Download
                                  </button>
                                ) : (
                                  <>
                                    <span style={{ fontSize: 11, color: "var(--danger, #b52a2a)" }}>{imgErr || "Failed to load"}</span>
                                    <button
                                      className="btn btn-outline btn-sm"
                                      onClick={() => loadFiles(cid(detail))}
                                    >↻ Retry</button>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Inline image preview */}
                            {imgBlob && (
                              <img
                                src={imgBlob.blobUrl}
                                alt="Supporting image"
                                style={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 6, background: "#fff", display: "block" }}
                              />
                            )}
                          </div>

                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="action-grid">
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

          </>)} {/* end activePage === "contributions" */}

        </main>
      </div>
    </>
  );
}
