"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { getUser, getAccessToken } from "@/lib/api";
import { listContributions, getContribution } from "@/lib/services/contributions";
import { getComments } from "@/lib/services/comments";
import { listAcademicYears } from "@/lib/services/closures";

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str.replace(" ", "T").replace(/\+00$/, "Z").replace(/\+00:00$/, "Z"));
  return isNaN(d.getTime()) ? null : d;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtDate(d) {
  if (!d) return "—";
  const parsed = parseDate(d) || new Date(d);
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtCommentDate(d) {
  if (!d) return "—";
  const parsed = parseDate(d) || new Date(d);
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const st = (s) => s?.toUpperCase();

function StatusBadge({ status, createdAt }) {
  const s = st(status);
  if (s === "SELECTED")                    return <span className="badge b-green">✅ Selected</span>;
  if (s === "REJECTED")                    return <span className="badge b-red">✕ Rejected</span>;
  if (s === "REVIEWED")                    return <span className="badge b-purple">🔍 Under Review</span>;
  if (s === "UPDATE" || s === "UPDATED")   return <span className="badge b-warn">✏️ Updated</span>;
  if (s === "PENDING" || s === "SUBMITTED") {
    const subDate = createdAt ? parseDate(createdAt) : null;
    const overdue = subDate ? Date.now() > subDate.getTime() + 14 * 24 * 60 * 60 * 1000 : false;
    return overdue
      ? <span className="badge b-red">⚠ Overdue</span>
      : <span className="badge b-blue">⏳ Submitted</span>;
  }
  return <span className="badge b-draft">{status || "—"}</span>;
}

const cid = (c) => c?.contributionId || c?.id || c?._id;

function StudentDashboard() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const activeTab   = searchParams.get("tab") || "dashboard";
  const [user, setUser]                             = useState(null);
  const [contributions, setContributions]           = useState([]);
  const [initialClosureDate, setInitialClosureDate] = useState(null);
  const [finalClosureDate,   setFinalClosureDate]   = useState(null);
  const [loading, setLoading]                       = useState(true);

  const [selected,      setSelected]      = useState(null);
  const [detail,        setDetail]        = useState(null);
  const [comments,      setComments]      = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error,         setError]         = useState("");
  const [loginAt,       setLoginAt]       = useState(null);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/login"); return; }
    setUser(getUser());
    setLoginAt(localStorage.getItem("loginAt") || null);
    fetchData();
  }, []);

  const parseItems = (data) =>
    Array.isArray(data?.contributions) ? data.contributions :
    Array.isArray(data?.items)         ? data.items         :
    Array.isArray(data?.content)       ? data.content       :
    Array.isArray(data?.list)          ? data.list          :
    Array.isArray(data?.result)        ? data.result        :
    Array.isArray(data)                ? data               : [];

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [contribRes, yearsRes] = await Promise.all([
        listContributions({}),
        listAcademicYears(),
      ]);

      if (contribRes.success !== false) {
        const items = parseItems(contribRes.data);
        if (items.length > 0) console.log("[Student] contribution sample:", items[0]);
        setContributions(items);
        if (items.length > 0) openDetail(items[0]);
      }

      if (yearsRes.success !== false) {
        const years = Array.isArray(yearsRes.data) ? yearsRes.data : [];
        const activeYear = years.find((y) => y.closureDate?.isActive) || years[years.length - 1];
        if (activeYear?.closureDate) {
          setInitialClosureDate(activeYear.closureDate.initialClosureDate || null);
          setFinalClosureDate(activeYear.closureDate.finalClosureDate   || null);
        }
      }

    } catch {
      setError("Could not load your contributions. The server may be starting up — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (contrib) => {
    setSelected(contrib);
    setDetail(null);
    setComments([]);
    setDetailLoading(true);
    try {
      const [detailRes, commentsRes] = await Promise.all([
        getContribution(cid(contrib)),
        getComments(cid(contrib)),
      ]);
      if (detailRes.success !== false) {
        const d = detailRes.data ?? detailRes;
        if (d && typeof d === "object" && !Array.isArray(d)) setDetail(d);
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
    setDetailLoading(false);
  };

  const avatarInfo = user
    ? { initial: (user.username || "S")[0].toUpperCase(), name: user.username || "Student", role: "Student" }
    : { initial: "S", name: "Student", role: "Student" };

  const facultyName = user?.faculty?.facultyName || user?.facultyName || "";

  const now          = Date.now();
  const initialDate  = initialClosureDate ? parseDate(initialClosureDate) : null;
  const finalDate    = finalClosureDate   ? parseDate(finalClosureDate)   : null;

  const daysToClose  = initialDate ? Math.ceil((initialDate.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
  /* students can submit NEW contributions only before initial closure date */
  const canSubmitNew = initialDate ? now < initialDate.getTime() : true;
  /* students can EDIT existing contributions until final closure date */
  const canEdit      = finalDate   ? now < finalDate.getTime()
                     : initialDate ? now < initialDate.getTime() : true;

  const total          = contributions.length;
  const magazineCount  = contributions.filter((c) =>
    (c?.status || c?.contributionStatus || c?.statusName || "").toUpperCase() === "SELECTED"
  ).length;
  /* overdue: no coordinator comment yet, and more than 14 days since submission */
  const overdueComment = contributions.filter((c) => {
    const s = (c.status || c.contributionStatus || c.statusName || "").toUpperCase();
    const notCommented = s === "SUBMITTED" || s === "PENDING";
    if (!notCommented) return false;
    const raw = c.createdAt || c.submittedAt || c.submitted_at || c.created_at || null;
    const subDate = parseDate(raw);
    return subDate ? now > subDate.getTime() + 14 * 24 * 60 * 60 * 1000 : false;
  }).length;

  const sidebarConfig = {
    profile: {
      initial: avatarInfo.initial,
      name: avatarInfo.name,
      subtitle: facultyName || "Student",
      role: "Student",
      avatarStyle: { background: "linear-gradient(135deg,#1a4a8a,#2a70c0)" },
    },
    sections: [
      {
        title: "Navigation",
        items: [
          { icon: "🏠", label: "Dashboard",       href: "/user/student",        active: activeTab === "dashboard" },
          { icon: "📝", label: "New Contribution", href: "/user/student/submit" },
        ],
      },
      {
        title: "Info",
        items: [
          { icon: "📅", label: "Deadlines", href: "/user/student?tab=deadlines", active: activeTab === "deadlines" },
        ],
      },
    ],
  };

  const displayDetail = detail || selected;

  return (
    <>
      <Topbar avatar={avatarInfo} />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">

          {/* ── DEADLINES TAB ── */}
          {activeTab === "deadlines" && (
            <>
              <div className="pg-header">
                <div>
                  <div className="pg-title">Important Deadlines</div>
                  <div className="pg-sub">{facultyName ? `${facultyName} · ` : ""}Submission & editing cutoff dates</div>
                </div>
              </div>
              {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
              ) : !(initialClosureDate || finalClosureDate) ? (
                <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
                  <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 15 }}>No deadlines set yet</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Check back later for closure dates.</div>
                </div>
              ) : (
                <div className="card">
                  <div className="ch"><div className="ch-title">📅 Important Deadlines</div></div>
                  <table className="data-table">
                    <thead>
                      <tr><th>Milestone</th><th>Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {initialClosureDate && (
                        <tr>
                          <td>Initial Closure — no new submissions after this date</td>
                          <td>{fmtDate(initialClosureDate)}</td>
                          <td>
                            {daysToClose != null && (
                              <span className={`badge ${daysToClose <= 0 ? "b-red" : daysToClose <= 7 ? "b-warn" : "b-blue"}`}>
                                {daysToClose > 0 ? `${daysToClose} days` : "Closed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                      {finalClosureDate && (
                        <tr>
                          <td>Final Closure — no further edits after this date</td>
                          <td>{fmtDate(finalClosureDate)}</td>
                          <td>
                            {(() => {
                              const d = daysUntil(finalClosureDate);
                              return d != null ? (
                                <span className={`badge ${d <= 0 ? "b-red" : d <= 14 ? "b-warn" : "b-blue"}`}>
                                  {d > 0 ? `${d} days` : "Closed"}
                                </span>
                              ) : null;
                            })()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── DASHBOARD TAB ── */}
          {activeTab === "dashboard" && <>

          {/* Page header */}
          <div className="pg-header">
            <div>
              <div className="pg-title">My Dashboard</div>
              <div className="pg-sub">
                Welcome, {avatarInfo.name}{facultyName ? ` · ${facultyName}` : ""}
                {initialClosureDate && (
                  <span style={{ marginLeft: 12, fontSize: 12, color: canSubmitNew ? "var(--warning)" : "var(--text-muted)" }}>
                    {canSubmitNew
                      ? `📅 ${daysToClose > 0 ? `${daysToClose} day${daysToClose !== 1 ? "s" : ""}` : "Today"} until new submissions close`
                      : canEdit
                        ? `🔒 New submissions closed · edits allowed until final date`
                        : `🔒 All submissions and edits closed`}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-outline btn-sm" onClick={fetchData}>↺ Refresh</button>
              {canSubmitNew
                ? <Link href="/user/student/submit" className="btn btn-primary btn-sm">+ New Submission</Link>
                : <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>🔒 New submissions closed</span>
              }
            </div>
          </div>

          {/* Last login banner */}
          {loginAt && (
            <div className="alert info" style={{ marginBottom: 16 }}>
              <span className="alert-icon">🔵</span>
              <div>Last login: <strong>{new Date(loginAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong> at <strong>{new Date(loginAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</strong></div>
            </div>
          )}

          {error && (
            <div className="alert dang" style={{ marginBottom: 18 }}>
              <span className="alert-icon">⚠️</span>
              <div>
                {error}{" "}
                <button
                  onClick={fetchData}
                  style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "inherit" }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="stats">
            <div className="stat">
              <div className="stat-n">{loading ? "…" : total}</div>
              <div className="stat-l">My Contributions</div>
            </div>
            <div className="stat green">
              <div className="stat-n">{loading ? "…" : magazineCount}</div>
              <div className="stat-l">Selected Contributions</div>
            </div>
            <div className={`stat ${daysToClose != null && daysToClose <= 7 ? "red" : "orange"}`}>
              <div className="stat-n">{loading ? "…" : daysToClose != null ? (daysToClose > 0 ? daysToClose : 0) : "—"}</div>
              <div className="stat-l">Days to Closure</div>
            </div>
            <div className={`stat ${overdueComment > 0 ? "red" : ""}`}>
              <div className="stat-n">{loading ? "…" : overdueComment}</div>
              <div className="stat-l">Overdue Comments</div>
            </div>
          </div>

          {/* Urgent closure banner */}
          {initialClosureDate && canSubmitNew && daysToClose != null && daysToClose <= 7 && (
            <div className="alert warn" style={{ marginBottom: 18 }}>
              <span className="alert-icon">⚠️</span>
              <div>
                <strong>{daysToClose > 0 ? `${daysToClose} day${daysToClose !== 1 ? "s" : ""} left` : "Closes today"}.</strong>{" "}
                Deadline: {fmtDate(initialClosureDate)}. Submit or edit your contributions before then.
              </div>
            </div>
          )}

          {/* ── Two-column: Contributions (left) + Detail (right) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start", marginBottom: 18 }}>

          {/* LEFT — contributions table */}
          <div className="card" style={{ marginBottom: 0 }}>

            {/* header */}
            <div className="ch">
              <div className="ch-title">My Contributions</div>
              <div className="ch-sub">{loading ? "Loading…" : `${total} submission${total !== 1 ? "s" : ""}`}</div>
            </div>

            {/* list body */}
            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                Loading…
              </div>
            ) : contributions.length === 0 ? (
              <div className="cb">
                <div className="alert info" style={{ margin: 0 }}>
                  <span className="alert-icon">📝</span>
                  <div>No contributions yet. <Link href="/user/student/submit" style={{ color: "var(--blue)" }}>Submit your first one →</Link></div>
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: 480, overflowY: "auto" }}>
                {contributions.map((c, i) => {
                  const isActive   = cid(c) === cid(selected);
                  const status     = st(c.status);
                  const isPending  = status === "PENDING" || status === "SUBMITTED";
                  const isSelected = status === "SELECTED";
                  const isRejected = status === "REJECTED";
                  const isUpdated  = status === "UPDATE" || status === "UPDATED";
                  const isReview   = status === "REVIEWED";
                  const leftBorder = isSelected ? "var(--success)" : isRejected ? "var(--danger)" : isUpdated ? "var(--warning)" : isReview ? "#6b21a8" : isPending ? "var(--blue-mid)" : "var(--border)";

                  return (
                    <div
                      key={cid(c) || i}
                      onClick={() => openDetail(c)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border)",
                        borderLeft: `3px solid ${leftBorder}`,
                        background: isActive ? "var(--sky)" : "#fff",
                        transition: "background .1s",
                      }}
                    >
                      <div style={{
                        fontSize: 13.5, fontWeight: 600, color: "var(--navy)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {c.contributionTitle || c.title || "Untitled"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT — detail panel (closing the two-column grid started above) */}
          <div>
            {!selected ? (
              <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 14, marginBottom: 5 }}>
                  No contribution selected
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Click a row on the left to view its details.
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="ch">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ch-title" style={{ fontSize: 15 }}>
                      {displayDetail?.contributionTitle || displayDetail?.title || "Untitled"}
                    </div>
                    <div className="ch-sub">Submitted {fmtDate(displayDetail?.createdAt)}</div>
                  </div>
                  <StatusBadge status={displayDetail?.status} createdAt={displayDetail?.createdAt} />
                </div>

                <div className="cb">
                  {detailLoading ? (
                    <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      Loading details…
                    </div>
                  ) : (
                    <>
                      {/* Meta grid */}
                      <div className="meta-grid" style={{ marginBottom: 16 }}>
                        <div className="meta-box">
                          <div className="meta-key">Faculty</div>
                          <div className="meta-val">{facultyName || "—"}</div>
                        </div>
                        <div className="meta-box">
                          <div className="meta-key">Images</div>
                          <div className="meta-val">
                            {displayDetail?.images?.length ?? displayDetail?.imageCount ?? "—"}
                          </div>
                        </div>
                        <div className="meta-box">
                          <div className="meta-key">Status</div>
                          <div className="meta-val"><StatusBadge status={displayDetail?.status} createdAt={displayDetail?.createdAt} /></div>
                        </div>
                        <div className="meta-box">
                          <div className="meta-key">Feedback</div>
                          <div className="meta-val" style={{ fontSize: 13 }}>
                            {(() => {
                              const ds = (displayDetail?.status || "").toUpperCase();
                              if (comments.length > 0 || ds === "REVIEWED") return <span style={{ color: "var(--success)" }}>✔ Received</span>;
                              if (ds === "PENDING" || ds === "SUBMITTED" || ds === "UPDATE" || ds === "UPDATED") {
                                const subDate = parseDate(displayDetail?.createdAt);
                                const isOverdue = subDate ? now > subDate.getTime() + 14 * 24 * 60 * 60 * 1000 : false;
                                return isOverdue
                                  ? <span style={{ color: "var(--danger)", fontWeight: 600 }}>⚠ Overdue Comment</span>
                                  : <span style={{ color: "var(--warning)" }}>⏳ Awaiting</span>;
                              }
                              return "—";
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {displayDetail?.description ? (
                        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-mid)", marginBottom: 16, padding: "12px 14px", background: "var(--sky)", borderRadius: 8 }}>
                          {displayDetail.description}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 16 }}>
                          No description provided.
                        </div>
                      )}

                      {/* Coordinator comments */}
                      {comments.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", marginBottom: 8 }}>
                            💬 Coordinator Feedback
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {comments.map((cm, i) => (
                              <div key={cm.commentId || i} style={{ background: "var(--sky)", borderRadius: 8, padding: "10px 12px", fontSize: 13, borderLeft: "3px solid var(--blue-mid)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <strong style={{ color: "var(--navy)" }}>
                                    {cm.commenterName || cm.commenter?.username || "Coordinator"}
                                  </strong>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtCommentDate(cm.commented_at || cm.commentedAt || cm.createdAt)}</span>
                                </div>
                                <div style={{ color: "var(--text-mid)", lineHeight: 1.5 }}>
                                  {cm.commentBody || cm.commentText || "—"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Edit button — available until final closure date, for any non-selected status */}
                      {st(displayDetail?.status) !== "SELECTED" && (
                        canEdit ? (
                          <Link
                            href={`/user/student/submit?edit=${cid(displayDetail)}`}
                            className="btn btn-navy btn-full"
                            style={{ textDecoration: "none", display: "block", textAlign: "center" }}
                          >
                            ✏️ Edit Contribution
                          </Link>
                        ) : (
                          <div className="alert warn" style={{ marginBottom: 0 }}>
                            <span className="alert-icon">🔒</span>
                            <div>Editing closed — final closure date has passed.</div>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          </div>{/* end two-column grid */}

          </> /* end dashboard tab */}

        </main>
      </div>
    </>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense>
      <StudentDashboard />
    </Suspense>
  );
}
