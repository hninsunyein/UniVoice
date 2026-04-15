"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { getUser, getAccessToken, BASE_URL } from "@/lib/api";
import { listContributions, getContribution } from "@/lib/services/contributions";
import mammoth from "mammoth";
import { getDashboardSummary, getStatistics } from "@/lib/services/reports";
import { listAcademicYears } from "@/lib/services/closures";
import { listFaculties } from "@/lib/services/faculties";

/* ── helpers ── */
function ayLabel(ay) {
  const s = ay.startDate ? new Date(ay.startDate).getFullYear() : null;
  const e = ay.endDate   ? new Date(ay.endDate).getFullYear()   : null;
  if (s && e && s !== e) return `${s} / ${e}`;
  if (s) return String(s);
  return ay.academicYearName || ay.name || "Academic Year";
}

function parseStatistics(data) {
  if (!data) return { faculties: [], summary: null };
  const arr =
    Array.isArray(data)            ? data :
    Array.isArray(data.faculties)  ? data.faculties :
    Array.isArray(data.statistics) ? data.statistics :
    Array.isArray(data.data)       ? data.data : [];

  const faculties = arr
    .filter((f) => f.facultyId || f.facultyName)
    .map((f) => ({
      facultyId:          f.facultyId,
      facultyName:        f.facultyName,
      totalContributions: f.numberOfContributions ?? f.totalContributions ?? f.contributions ?? 0,
      totalContributors:  f.numberOfContributors  ?? f.totalContributors  ?? f.contributors  ?? null,
      totalSelected:      f.totalSelected         ?? f.selected           ?? f.selectedCount ?? 0,
      percentage:         f.percentageOfContributions ?? f.percentage     ?? null,
    }))
    .sort((a, b) => b.totalContributions - a.totalContributions);

  const s = Array.isArray(data) ? null : data;
  const summary = s ? {
    totalContributions: s.totalContributions ?? s.contributions,
    totalContributors:  s.totalContributors  ?? s.contributors,
    totalSelected:      s.selectedContributions ?? s.totalSelected ?? s.selected,
  } : null;

  return { faculties, summary };
}

const barColors = ["#2a5fa8", "#1a8a5a", "#7030a0", "#c07020", "#c0202a", "#0078d4"];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const cid = (c) => c?.contributionId || c?.id || c?._id;

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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName || "Document"}</title><style>body{font-family:Calibri,Arial,sans-serif;max-width:860px;margin:0 auto;padding:0 24px 40px;line-height:1.7;color:#222}h1,h2,h3,h4{margin-top:1.2em}p{margin:.6em 0}img{max-width:100%}.doc-toolbar{position:sticky;top:0;background:#f0f4fa;border-bottom:1px solid #ccd6e8;padding:10px 0;margin:0 -24px 24px;display:flex;align-items:center;gap:12px;padding-left:24px;z-index:10}.doc-toolbar button{background:#1a4a8a;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:13px;cursor:pointer;font-family:inherit}.doc-toolbar button.outline{background:none;color:#1a4a8a;border:1.5px solid #1a4a8a}.doc-toolbar .doc-name{font-size:13px;font-weight:600;color:#1a4a8a;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style></head><body><div class="doc-toolbar"><button class="outline" onclick="window.close()">← Close Tab</button><span class="doc-name">📄 ${fileName || "Document"}</span><button onclick="window.print()">🖨 Print</button></div>${result.value}</body></html>`;
    const htmlBlob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(htmlBlob), "_blank");
  } catch {
    window.open(URL.createObjectURL(blob), "_blank");
  }
}

async function fetchBlobUrl(endpoint) {
  try {
    let token = getAccessToken();
    let res = await fetch(`${BASE_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      try {
        const r = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }),
        });
        const d = await r.json();
        if (d?.data?.accessToken) {
          token = d.data.accessToken;
          localStorage.setItem("accessToken", token);
          res = await fetch(`${BASE_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      } catch {}
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const ct = res.headers.get("content-type") || ""; if (ct.includes("application/json")) { const j = await res.json(); msg = j?.message || msg; } } catch {}
      return { error: msg, status: res.status };
    }
    const blob = await res.blob();
    if (blob.size === 0) return { error: "File is empty", status: 200 };
    return { blobUrl: URL.createObjectURL(blob), blob };
  } catch (err) {
    return { error: err.message || "Network error", status: 0 };
  }
}

function ManagerContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const activeTab   = searchParams.get("tab") || "selected";

  const [user, setUser] = useState(null);

  /* Selected contributions tab */
  const [contributions,       setContributions]       = useState([]);
  const [summary,             setSummary]             = useState(null);
  const [academicYears,       setAcademicYears]       = useState([]);
  const [selectedYear,        setSelectedYear]        = useState("");
  const [facultyCount,        setFacultyCount]        = useState(null);
  const [overdueCount,        setOverdueCount]        = useState(null);
  const [totalUsers,          setTotalUsers]          = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [contributionsLoading,setContributionsLoading]= useState(true);
  const [downloadLoading,     setDownloadLoading]     = useState(false);
  const [downloadError,       setDownloadError]       = useState("");

  /* Statistics tab */
  const [statistics,    setStatistics]    = useState([]);
  const [statsYear,     setStatsYear]     = useState("");
  const [statsLoading,  setStatsLoading]  = useState(false);
  const [statsSummary,  setStatsSummary]  = useState(null);

  /* Contribution detail */
  const [selectedContrib, setSelectedContrib] = useState(null);
  const [detailData,      setDetailData]      = useState(null);
  const [detailLoading,   setDetailLoading]   = useState(false);
  const [docBlob,         setDocBlob]         = useState(null);
  const [imgBlob,         setImgBlob]         = useState(null);
  const [filesLoading,    setFilesLoading]    = useState(false);
  const [fileErr,         setFileErr]         = useState("");
  const [imgErr,          setImgErr]          = useState("");
  const [facultyFilter,   setFacultyFilter]   = useState("");

  useEffect(() => {
    if (!getAccessToken()) { router.push("/login"); return; }
    setUser(getUser());
    fetchInit();
  }, []);

  useEffect(() => {
    if (selectedYear) fetchContributions();
  }, [selectedYear]);

  useEffect(() => {
    if (activeTab === "statistics" && academicYears.length > 0 && !statistics.length) {
      fetchStatistics(statsYear);
    }
  }, [activeTab, academicYears]);

  const fetchInit = async () => {
    try {
      const [yearsRes, summaryRes, facultiesRes, allContribRes] = await Promise.all([
        listAcademicYears(),
        getDashboardSummary(),
        listFaculties(),
        listContributions({}),
      ]);
      if (yearsRes.success && Array.isArray(yearsRes.data)) {
        setAcademicYears(yearsRes.data);
        const firstId = yearsRes.data[0]?.academicYearId || yearsRes.data[0]?.id || "";
        setSelectedYear(firstId);
        setStatsYear(firstId);
      }
      if (summaryRes.success) setSummary(summaryRes.data);
      const facList =
        Array.isArray(facultiesRes?.data) ? facultiesRes.data :
        Array.isArray(facultiesRes)       ? facultiesRes       : [];
      setFacultyCount(facList.length);

      if (allContribRes.success !== false) {
        const all =
          Array.isArray(allContribRes.data?.contributions) ? allContribRes.data.contributions :
          Array.isArray(allContribRes.data?.items)         ? allContribRes.data.items         :
          Array.isArray(allContribRes.data)                ? allContribRes.data               : [];
        const now = Date.now();
        const overdue = all.filter((c) => {
          const s = (c.status || c.contributionStatus || c.statusName || "").toUpperCase();
          if (s !== "SUBMITTED" && s !== "PENDING") return false;
          const d = c.createdAt || c.submittedAt || null;
          return d ? now - new Date(d).getTime() > 14 * 24 * 60 * 60 * 1000 : false;
        });
        setOverdueCount(overdue.length);
      }
      if (summaryRes.success) setTotalUsers(summaryRes.data?.totalUsers ?? null);
    } catch {}
    setLoading(false);
  };

  const fetchContributions = async () => {
    setContributionsLoading(true);
    try {
      const res = await listContributions(selectedYear ? { academicYearId: selectedYear } : {});
      if (res.success !== false) {
        const all =
          Array.isArray(res.data?.contributions) ? res.data.contributions :
          Array.isArray(res.data?.items)         ? res.data.items         :
          Array.isArray(res.data)                ? res.data               : [];
        setContributions(all.filter(c =>
          (c?.status || c?.contributionStatus || c?.statusName || "").toUpperCase() === "SELECTED"
        ));
      }
    } catch {}
    setContributionsLoading(false);
  };

  const fetchStatistics = async (yearId) => {
    setStatsLoading(true);
    try {
      const res = await getStatistics(yearId || undefined).catch(() => ({ success: false }));
      if (res.success) {
        const { faculties, summary: sm } = parseStatistics(res.data);
        setStatistics(faculties);
        if (sm) setStatsSummary(sm);
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const handleStatsYearChange = (yearId) => {
    setStatsYear(yearId);
    fetchStatistics(yearId);
  };

  const handleDownload = async () => {
    if (!selectedYear) return;
    setDownloadLoading(true);
    setDownloadError("");
    try {
      const token = getAccessToken();
      const res = await fetch(`${BASE_URL}/contributions/export/${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected-contributions.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err.message || "Download failed. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const clearBlobs = () => {
    if (docBlob?.blobUrl) URL.revokeObjectURL(docBlob.blobUrl);
    if (imgBlob?.blobUrl) URL.revokeObjectURL(imgBlob.blobUrl);
    setDocBlob(null); setImgBlob(null); setFileErr(""); setImgErr("");
  };

  const loadFiles = async (id) => {
    setFilesLoading(true); setFileErr(""); setImgErr("");
    const [doc, img] = await Promise.all([
      fetchBlobUrl(`/contributions/${id}/file`),
      fetchBlobUrl(`/contributions/${id}/image`),
    ]);
    if (doc?.blobUrl) setDocBlob(doc); else { setDocBlob(null); setFileErr(doc?.error || "Could not load document."); }
    if (img?.blobUrl) setImgBlob(img); else { setImgBlob(null); setImgErr(img?.error || "Could not load image."); }
    setFilesLoading(false);
  };

  const openDetail = async (contrib) => {
    clearBlobs();
    setSelectedContrib(contrib);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await getContribution(cid(contrib));
      if (res.success !== false) {
        const d = res.data ?? res;
        if (d && typeof d === "object" && !Array.isArray(d)) setDetailData(d);
      }
    } catch {}
    setDetailLoading(false);
    loadFiles(cid(contrib));
  };

  const resolveStudent = (c) =>
    c?.student?.user?.username || c?.student?.user?.name ||
    c?.student?.username       || c?.student?.name       ||
    c?.user?.username          || c?.user?.name          ||
    c?.studentName             || c?.submittedByName     ||
    c?.author?.username        || null;

  const avatarInfo = user
    ? { initial: (user.username || "M")[0].toUpperCase(), name: user.username || "Manager", role: "Mkt Manager" }
    : { initial: "M", name: "Manager", role: "Mkt Manager" };

  const sidebarConfig = {
    profile: {
      initial: avatarInfo.initial,
      name: avatarInfo.name,
      subtitle: "University-wide",
      role: "Mkt Manager",
      avatarStyle: { background: "linear-gradient(135deg,#0e5090,#1a6fc4)" },
    },
    sections: [
      {
        title: "Magazine",
        items: [
          { icon: "✅", label: "All Selected", href: "/user/manager", active: activeTab === "selected" },
        ],
      },
      {
        title: "Analytics",
        items: [
          { icon: "📊", label: "Statistics", href: "/user/manager?tab=statistics", active: activeTab === "statistics" },
        ],
      },
    ],
  };

  /* Unique faculties from selected contributions (for filter dropdown) */
  const faculties = [...new Set(
    contributions.map((c) => c.facultyName || c.faculty?.facultyName || "").filter(Boolean)
  )].sort();

  const filteredContributions = facultyFilter
    ? contributions.filter((c) => (c.facultyName || c.faculty?.facultyName || "") === facultyFilter)
    : contributions;

  /* derived */
  const grandTotal     = statistics.reduce((s, f) => s + (f.totalContributions || 0), 0) || 1;
  const maxContribs    = statistics.reduce((m, f) => Math.max(m, f.totalContributions || 0), 1);
  const statsYearLabel = academicYears.find((y) => (y.academicYearId || y.id) === statsYear);

  return (
    <>
      <Topbar avatar={avatarInfo} />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">

          {/* ── ALL SELECTED TAB ── */}
          {activeTab === "selected" && (
            <>
              <div className="pg-header">
                <div>
                  <div className="pg-title">Marketing Manager Dashboard</div>
                  <div className="pg-sub">University-wide · Read-only access to all selected contributions</div>
                </div>
              </div>

              <div className="download-cta">
                <div className="dl-text">
                  <h3>📦 Download All Selected Contributions</h3>
                  <p>All selected articles and images packaged as a single ZIP file for external transfer. Available after final closure date.</p>
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleDownload}
                  disabled={downloadLoading || !selectedYear}
                >
                  {downloadLoading ? "Preparing…" : "⬇ Download ZIP"}
                </button>
              </div>
              {downloadError && (
                <div className="alert dang" style={{ marginBottom: 16 }}>
                  <span className="alert-icon">⚠️</span>
                  <div>{downloadError}</div>
                </div>
              )}

              <div className="stats">
                <div className="stat green"><div className="stat-n">{contributionsLoading ? "…" : contributions.length}</div><div className="stat-l">Selected Contributions</div></div>
                <div className="stat"><div className="stat-n">{loading ? "…" : summary?.totalContributions ?? "—"}</div><div className="stat-l">Total Contributions</div></div>
                <div className="stat"><div className="stat-n">{loading ? "…" : facultyCount ?? "—"}</div><div className="stat-l">Total Faculties</div></div>
                <div className="stat"><div className="stat-n">{loading ? "…" : totalUsers ?? summary?.totalUsers ?? "—"}</div><div className="stat-l">Total Users</div></div>
                <div className="stat red"><div className="stat-n">{loading ? "…" : overdueCount ?? "—"}</div><div className="stat-l">Overdue Comments</div></div>
              </div>

              <div className="two-col">

              {/* LEFT — contributions list */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="ch" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ch-title">All Selected Contributions</div>
                    <div className="ch-sub">University-wide · {filteredContributions.length} contribution{filteredContributions.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select
                      value={selectedYear}
                      onChange={(e) => { setSelectedYear(e.target.value); setFacultyFilter(""); }}
                      style={{ border: "1.5px solid var(--border)", borderRadius: 7, padding: "7px 12px", fontFamily: "inherit", fontSize: 13 }}
                    >
                      {academicYears.map((ay, i) => (
                        <option key={ay.academicYearId || ay.id || i} value={ay.academicYearId || ay.id}>
                          {ayLabel(ay)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={facultyFilter}
                      onChange={(e) => setFacultyFilter(e.target.value)}
                      style={{ border: "1.5px solid var(--border)", borderRadius: 7, padding: "7px 12px", fontFamily: "inherit", fontSize: 13 }}
                    >
                      <option value="">All Faculties</option>
                      {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                {contributionsLoading ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
                ) : filteredContributions.length === 0 ? (
                  <div className="cb">
                    <div className="alert info" style={{ margin: 0 }}>
                      <span className="alert-icon">📂</span>
                      <div>{facultyFilter ? `No selected contributions for ${facultyFilter}.` : "No selected contributions found for this academic year."}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ maxHeight: 520, overflowY: "auto" }}>
                    {filteredContributions.map((c, i) => {
                      const isActive = cid(c) === cid(selectedContrib);
                      return (
                        <div
                          key={cid(c) || i}
                          onClick={() => openDetail(c)}
                          style={{
                            padding: "12px 16px", cursor: "pointer",
                            borderBottom: "1px solid var(--border)",
                            borderLeft: `3px solid var(--success)`,
                            background: isActive ? "var(--sky)" : "#fff",
                            transition: "background .1s",
                          }}
                        >
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.contributionTitle || c.title || "Untitled"}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, display: "flex", flexWrap: "wrap", gap: "0 8px" }}>
                            <span>👤 {resolveStudent(c) || "—"}</span>
                            <span>🏫 {c.facultyName || c.faculty?.facultyName || "—"}</span>
                            <span>📅 {fmtDate(c.submittedAt || c.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT — detail panel */}
              <div>
                {!selectedContrib ? (
                  <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                    <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 14, marginBottom: 5 }}>No contribution selected</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Click a row on the left to view its details.</div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="ch">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ch-title" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            onClick={() => { clearBlobs(); setSelectedContrib(null); setDetailData(null); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--blue)", padding: 0, lineHeight: 1 }}
                            title="Back to list"
                          >←</button>
                          {(detailData || selectedContrib)?.contributionTitle || (detailData || selectedContrib)?.title || "Untitled"}
                        </div>
                        <div className="ch-sub">
                          {resolveStudent(detailData || selectedContrib)
                            ? <><strong>{resolveStudent(detailData || selectedContrib)}</strong> · Submitted {fmtDate((detailData || selectedContrib)?.submittedAt || (detailData || selectedContrib)?.createdAt)}</>
                            : fmtDate((detailData || selectedContrib)?.createdAt)
                          }
                        </div>
                      </div>
                      <span className="badge b-green">✅ Selected</span>
                    </div>

                    <div className="cb">
                      {detailLoading ? (
                        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading details…</div>
                      ) : (
                        <>
                          <div className="meta-grid" style={{ marginBottom: 16 }}>
                            <div className="meta-box">
                              <div className="meta-key">Author</div>
                              <div className="meta-val" style={{ fontWeight: 600 }}>
                                {resolveStudent(detailData || selectedContrib) || "—"}
                              </div>
                            </div>
                            <div className="meta-box">
                              <div className="meta-key">Faculty</div>
                              <div className="meta-val">
                                {(detailData || selectedContrib)?.facultyName || (detailData || selectedContrib)?.faculty?.facultyName || "—"}
                              </div>
                            </div>
                            <div className="meta-box">
                              <div className="meta-key">Submitted</div>
                              <div className="meta-val">
                                {fmtDate((detailData || selectedContrib)?.submittedAt || (detailData || selectedContrib)?.createdAt) || "—"}
                              </div>
                            </div>
                            {(detailData || selectedContrib)?.updatedAt && (
                              <div className="meta-box">
                                <div className="meta-key">Last Updated</div>
                                <div className="meta-val">{fmtDate((detailData || selectedContrib).updatedAt)}</div>
                              </div>
                            )}
                          </div>

                          {(detailData || selectedContrib)?.description ? (
                            <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-mid)", marginBottom: 16, padding: "12px 14px", background: "var(--sky)", borderRadius: 8 }}>
                              {(detailData || selectedContrib).description}
                            </div>
                          ) : null}

                          {/* Attached files */}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", marginBottom: 10 }}>📎 Attached Files</div>
                            {filesLoading ? (
                              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading files…</div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                {/* Document */}
                                <div style={{ background: "var(--sky)", borderRadius: 8, padding: "12px 14px" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ fontSize: 20 }}>📄</span>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                                          {(detailData || selectedContrib)?.originalFileName || (detailData || selectedContrib)?.fileName || "Article Document"}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Word Document (.doc / .docx)</div>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                      {docBlob ? (
                                        <>
                                          <button className="btn btn-outline btn-sm"
                                            onClick={() => viewDocument(docBlob.blob, (detailData || selectedContrib)?.originalFileName || (detailData || selectedContrib)?.fileName || "document.docx")}>
                                            👁 View
                                          </button>
                                          <button className="btn btn-navy btn-sm"
                                            onClick={() => {
                                              const student  = resolveStudent(detailData || selectedContrib) || "student";
                                              const origName = (detailData || selectedContrib)?.originalFileName || (detailData || selectedContrib)?.fileName || `contribution-${cid(selectedContrib)}.docx`;
                                              triggerDownload(docBlob.blobUrl, `${student}_${origName}`);
                                            }}>
                                            ⬇ Download
                                          </button>
                                        </>
                                      ) : (
                                        <span style={{ fontSize: 11, color: "var(--danger, #b52a2a)" }}>{fileErr || "Not available"}</span>
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
                                          {(detailData || selectedContrib)?.imageName || (detailData || selectedContrib)?.imageFileName || "Supporting Image"}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Image</div>
                                      </div>
                                    </div>
                                    {imgBlob ? (
                                      <button className="btn btn-navy btn-sm"
                                        onClick={() => {
                                          const student  = resolveStudent(detailData || selectedContrib) || "student";
                                          const origName = (detailData || selectedContrib)?.imageName || (detailData || selectedContrib)?.imageFileName || `image-${cid(selectedContrib)}`;
                                          triggerDownload(imgBlob.blobUrl, `${student}_${origName}`);
                                        }}>
                                        ⬇ Download
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: 11, color: "var(--danger, #b52a2a)" }}>{imgErr || "Not available"}</span>
                                    )}
                                  </div>
                                  {imgBlob && (
                                    <img src={imgBlob.blobUrl} alt="Supporting image"
                                      style={{ width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 6, background: "#fff", display: "block" }} />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              </div>{/* end two-col */}
            </>
          )}

          {/* ── STATISTICS TAB ── */}
          {activeTab === "statistics" && (
            <>
              <div className="pg-header">
                <div>
                  <div className="pg-title">Statistics</div>
                  <div className="pg-sub">
                    {statsYearLabel ? ayLabel(statsYearLabel) : "All Academic Years"} · Contributions by Faculty
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => fetchStatistics(statsYear)}>↺ Refresh</button>
              </div>

              {/* Summary stat cards */}
              <div className="stats" style={{ marginBottom: 20 }}>
                <div className="stat">
                  <div className="stat-n">{statsLoading ? "…" : (statsSummary?.totalContributions ?? (statistics.reduce((s, f) => s + (f.totalContributions || 0), 0) || "—"))}</div>
                  <div className="stat-l">Total Contributions</div>
                </div>
                <div className="stat">
                  <div className="stat-n">{statsLoading ? "…" : (statsSummary?.totalContributors ?? "—")}</div>
                  <div className="stat-l">Total Contributors</div>
                </div>
                <div className="stat green">
                  <div className="stat-n">{statsLoading ? "…" : (statsSummary?.totalSelected ?? (statistics.reduce((s, f) => s + (f.totalSelected || 0), 0) || "—"))}</div>
                  <div className="stat-l">Selected</div>
                </div>
                <div className="stat">
                  <div className="stat-n">{statsLoading ? "…" : statistics.length || "—"}</div>
                  <div className="stat-l">Faculties</div>
                </div>
              </div>

              {/* Faculty breakdown card */}
              <div className="card">
                <div className="ch">
                  <div>
                    <div className="ch-title">Contributions by Faculty</div>
                    <div className="ch-sub">
                      {statsYearLabel ? ayLabel(statsYearLabel) : "All Academic Years"} · {statistics.reduce((s, f) => s + (f.totalContributions || 0), 0)} contributions
                    </div>
                  </div>
                  <select
                    value={statsYear}
                    onChange={(e) => handleStatsYearChange(e.target.value)}
                    style={{ fontSize: 13, padding: "5px 10px", border: "1.5px solid var(--border)", borderRadius: 6, color: "var(--text)", background: "#fff", fontFamily: "inherit" }}
                  >
                    <option value="">All Academic Years</option>
                    {academicYears.map((y) => (
                      <option key={y.academicYearId || y.id} value={y.academicYearId || y.id}>{ayLabel(y)}</option>
                    ))}
                  </select>
                </div>

                {statsLoading ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading statistics…</div>
                ) : statistics.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    No statistics available for the selected period.
                  </div>
                ) : (
                  <>
                    {/* Bar chart */}
                    <div className="cb" style={{ paddingBottom: 0 }}>
                      <div className="bar-rows">
                        {statistics.map((f, i) => {
                          const count = f.totalContributions || 0;
                          const pct   = ((count / grandTotal) * 100).toFixed(1);
                          const barW  = Math.round((count / maxContribs) * 100);
                          return (
                            <div key={f.facultyId || i} className="brow">
                              <div className="blbl">{f.facultyName}</div>
                              <div className="btrack">
                                <div className="bfill" style={{ width: `${barW}%`, background: barColors[i % barColors.length] }}>
                                  {count}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 44, textAlign: "right" }}>{pct}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="data-table" style={{ marginTop: 4 }}>
                      <thead>
                        <tr>
                          <th>Faculty</th>
                          <th style={{ textAlign: "right" }}>Contributions</th>
                          <th style={{ textAlign: "right" }}>% of Total</th>
                          <th style={{ textAlign: "right" }}>Contributors</th>
                          <th style={{ textAlign: "right" }}>Selected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.map((f, i) => {
                          const count = f.totalContributions || 0;
                          const pct   = ((count / grandTotal) * 100).toFixed(1);
                          return (
                            <tr key={f.facultyId || i}>
                              <td><strong>{f.facultyName || "—"}</strong></td>
                              <td style={{ textAlign: "right" }}>{count}</td>
                              <td style={{ textAlign: "right" }}>
                                <span className="badge b-blue" style={{ fontSize: 11 }}>{pct}%</span>
                              </td>
                              <td style={{ textAlign: "right" }}><strong>{f.totalContributors ?? "—"}</strong></td>
                              <td style={{ textAlign: "right" }}>
                                {f.totalSelected > 0
                                  ? <span className="badge b-green" style={{ fontSize: 11 }}>{f.totalSelected}</span>
                                  : <span style={{ color: "var(--text-muted)" }}>—</span>}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: "var(--sky)", fontWeight: 700 }}>
                          <td>Total</td>
                          <td style={{ textAlign: "right" }}>{statistics.reduce((s, f) => s + (f.totalContributions || 0), 0)}</td>
                          <td style={{ textAlign: "right" }}>100%</td>
                          <td style={{ textAlign: "right" }}>{statsSummary?.totalContributors ?? "—"}</td>
                          <td style={{ textAlign: "right" }}>{statsSummary?.totalSelected ?? statistics.reduce((s, f) => s + (f.totalSelected || 0), 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </>
  );
}

export default function ManagerPage() {
  return (
    <Suspense>
      <ManagerContent />
    </Suspense>
  );
}
