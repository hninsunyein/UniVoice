"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { getUser, getAccessToken, BASE_URL, getLastLoginAt } from "@/lib/api";
import { listContributions, getContribution } from "@/lib/services/contributions";
import mammoth from "mammoth";
import JSZip from "jszip";
import { getDashboardSummary } from "@/lib/services/reports";
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
  const [lastLoginAt, setLastLoginAt] = useState(null);

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
  const [statistics,         setStatistics]         = useState([]);
  const [statsYear,          setStatsYear]          = useState("");
  const [statsLoading,       setStatsLoading]       = useState(false);
  const [statsSummary,       setStatsSummary]       = useState(null);
  const [statsSelectedCount, setStatsSelectedCount] = useState(0);
  const [statsOverdueCount,  setStatsOverdueCount]  = useState(0);

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
  const [faculties,       setFaculties]       = useState([]);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/login"); return; }
    setUser(getUser());
    setLastLoginAt(getLastLoginAt());
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
        const sorted = [...yearsRes.data].sort((a, b) =>
          new Date(b.endDate || b.startDate || 0) - new Date(a.endDate || a.startDate || 0)
        );
        const latestId = sorted[0]?.academicYearId || sorted[0]?.id || "";
        setSelectedYear(latestId);
        setStatsYear(latestId);
      }
      if (summaryRes.success) setSummary(summaryRes.data);
      const facList =
        Array.isArray(facultiesRes?.data) ? facultiesRes.data :
        Array.isArray(facultiesRes)       ? facultiesRes       : [];
      setFacultyCount(facList.length);
      setFaculties(facList);

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
      const params = {};
      if (selectedYear) params.academicYearId = selectedYear;
      const res = await listContributions(params);
      if (res.success !== false) {
        const all =
          Array.isArray(res.data?.contributions) ? res.data.contributions :
          Array.isArray(res.data?.items)         ? res.data.items         :
          Array.isArray(res.data)                ? res.data               : [];
        const selected = all.filter(c =>
          c.isSelected === true ||
          (c?.status || c?.contributionStatus || c?.statusName || "").toUpperCase() === "SELECTED"
        );
        setContributions(selected);
      }
    } catch {}
    setContributionsLoading(false);
  };

  const fetchStatistics = async (yearId) => {
    setStatsLoading(true);
    setStatistics([]);
    setStatsSummary(null);
    setStatsSelectedCount(0);
    setStatsOverdueCount(0);
    try {
      const params = {};
      if (yearId) params.academicYearId = yearId;
      const res = await listContributions(params);
      if (res.success !== false) {
        const all =
          Array.isArray(res.data?.contributions) ? res.data.contributions :
          Array.isArray(res.data?.items)         ? res.data.items         :
          Array.isArray(res.data)                ? res.data               : [];

        /* Group by faculty */
        const byFaculty = {};
        all.forEach((c) => {
          const fid   = resolveFacultyId(c) || "__unknown";
          const fname = resolveFacultyName(c) || "Unknown Faculty";
          if (!byFaculty[fid]) byFaculty[fid] = { facultyId: fid, facultyName: fname, totalContributions: 0, studentIds: new Set() };
          byFaculty[fid].totalContributions++;
          const sid = c.student?.studentId || c.student?.id || c.studentId || c.userId;
          if (sid) byFaculty[fid].studentIds.add(sid);
        });

        const faculties = Object.values(byFaculty)
          .map((f) => ({
            facultyId:         f.facultyId,
            facultyName:       f.facultyName,
            totalContributions: f.totalContributions,
            totalContributors:  f.studentIds.size,
          }))
          .sort((a, b) => b.totalContributions - a.totalContributions);

        const total = all.length;
        const uniqueStudents = new Set(all.map(c => c.student?.studentId || c.student?.id || c.studentId).filter(Boolean));
        const selectedCount = all.filter((c) =>
          c.isSelected === true ||
          (c?.status || c?.contributionStatus || c?.statusName || "").toUpperCase() === "SELECTED"
        ).length;
        const now = Date.now();
        const overdueInYear = all.filter((c) => {
          const s = (c.status || c.contributionStatus || c.statusName || "").toUpperCase();
          if (s !== "SUBMITTED" && s !== "PENDING") return false;
          const d = c.createdAt || c.submittedAt || null;
          return d ? now - new Date(d).getTime() > 14 * 24 * 60 * 60 * 1000 : false;
        }).length;
        setStatistics(faculties);
        setStatsSummary({ totalContributions: total, totalContributors: uniqueStudents.size });
        setStatsSelectedCount(selectedCount);
        setStatsOverdueCount(overdueInYear);
      }
    } catch {}
    setStatsLoading(false);
  };

  const handleStatsYearChange = (yearId) => {
    setStatsYear(yearId);
    fetchStatistics(yearId);
  };

  const handleDownload = async () => {
    if (!contributions.length) return;
    setDownloadLoading(true);
    setDownloadError("");
    try {
      const zip  = new JSZip();
      const token = getAccessToken();

      await Promise.all(contributions.map(async (c) => {
        const id      = cid(c);
        const title   = (c.contributionTitle || c.title || id || "contribution")
                          .replace(/[/\\?%*:|"<>]/g, "-").trim();
        const faculty = (resolveFacultyName(c) || "unknown").replace(/[/\\?%*:|"<>]/g, "-");
        const folder  = zip.folder(`${faculty}/${title}`);

        const fetchFile = async (endpoint) => {
          const res = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return null;
          return res.blob();
        };

        const [docBlob, imgBlob] = await Promise.all([
          fetchFile(`/contributions/${id}/file`),
          fetchFile(`/contributions/${id}/image`),
        ]);

        if (docBlob && docBlob.size > 0) {
          const ext = docBlob.type.includes("pdf") ? "pdf" : "docx";
          folder.file(`${title}.${ext}`, docBlob);
        }
        if (imgBlob && imgBlob.size > 0) {
          const ext = imgBlob.type.split("/")[1] || "png";
          folder.file(`${title}_image.${ext}`, imgBlob);
        }
      }));

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected-contributions-${selectedYear}.zip`;
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

  const resolveFacultyId = (c) =>
    c.facultyId || c.faculty?.facultyId || c.student?.user?.facultyId || null;

  const resolveFacultyName = (c) =>
    c.facultyName || c.faculty?.facultyName || c.student?.user?.faculty?.facultyName || null;

  const filteredContributions = facultyFilter
    ? contributions.filter((c) => resolveFacultyId(c) === facultyFilter || resolveFacultyName(c) === facultyFilter)
    : contributions;

  /* final closure date for selected academic year */
  const selectedAY        = academicYears.find((y) => (y.academicYearId || y.id) === selectedYear);
  const finalClosureDate  = selectedAY?.closureDate?.finalClosureDate || null;
  const afterFinalClosure = finalClosureDate ? new Date() >= new Date(finalClosureDate) : false;

  /* selected counts derived from contributions state (statistics API doesn't return this) */
  const totalSelectedCount = contributions.length;
  const selectedByFaculty = contributions.reduce((acc, c) => {
    const fid = resolveFacultyId(c) || resolveFacultyName(c) || "__unknown";
    acc[fid] = (acc[fid] || 0) + 1;
    return acc;
  }, {});

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

              {!selectedContrib && (
                <div className="alert info" style={{ marginBottom: 16 }}>
                  <span className="alert-icon">🔵</span>
                  {lastLoginAt ? (
                    <div>Last login: <strong>{new Date(lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, {new Date(lastLoginAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</strong></div>
                  ) : (
                    <div>Welcome! 🎉 This is your <strong>first time</strong> logging in.</div>
                  )}
                </div>
              )}

              {!selectedContrib && (
                <>
                  <div className="download-cta">
                    <div className="dl-text">
                      <h3>📦 Download All Selected Contributions</h3>
                      <p>All selected articles and images packaged as a single ZIP file for external transfer.{finalClosureDate ? ` Available after final closure date (${fmtDate(finalClosureDate)}).` : ""}</p>
                    </div>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleDownload}
                      disabled={downloadLoading || !selectedYear || !afterFinalClosure}
                      title={!afterFinalClosure ? `Downloads are available after the final closure date${finalClosureDate ? ` (${fmtDate(finalClosureDate)})` : ""}` : ""}
                    >
                      {downloadLoading ? "Preparing…" : "⬇ Download ZIP"}
                    </button>
                  </div>
                  {!afterFinalClosure && finalClosureDate && (
                    <div className="alert warn" style={{ marginBottom: 16 }}>
                      <span className="alert-icon">🔒</span>
                      <div>Downloads are locked until after the final closure date: <strong>{fmtDate(finalClosureDate)}</strong></div>
                    </div>
                  )}
                  {downloadError && (
                    <div className="alert dang" style={{ marginBottom: 16 }}>
                      <span className="alert-icon">⚠️</span>
                      <div>{downloadError}</div>
                    </div>
                  )}
                </>
              )}


              {/* ── Contribution detail (full page, no card) ── */}
              {selectedContrib ? (
                <div>
                  <button
                    onClick={() => { clearBlobs(); setSelectedContrib(null); setDetailData(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--navy)", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    ← Back to List
                  </button>

                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                    <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 22, color: "var(--navy)", margin: 0, lineHeight: 1.3 }}>
                      {(detailData || selectedContrib)?.contributionTitle || (detailData || selectedContrib)?.title || "Untitled"}
                    </h2>
                    <span className="badge b-green">✅ Selected</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
                    {resolveStudent(detailData || selectedContrib)
                      ? <><strong>{resolveStudent(detailData || selectedContrib)}</strong> · Submitted {fmtDate((detailData || selectedContrib)?.submittedAt || (detailData || selectedContrib)?.createdAt)}</>
                      : fmtDate((detailData || selectedContrib)?.createdAt)
                    }
                  </div>

                  {detailLoading ? (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "24px 0" }}>Loading details…</div>
                  ) : (
                    <>
                      <div className="meta-grid" style={{ marginBottom: 20 }}>
                        <div className="meta-box">
                          <div className="meta-key">Author</div>
                          <div className="meta-val" style={{ fontWeight: 600 }}>{resolveStudent(detailData || selectedContrib) || "—"}</div>
                        </div>
                        <div className="meta-box">
                          <div className="meta-key">Faculty</div>
                          <div className="meta-val">{resolveFacultyName(detailData || selectedContrib) || "—"}</div>
                        </div>
                        <div className="meta-box">
                          <div className="meta-key">Submitted</div>
                          <div className="meta-val">{fmtDate((detailData || selectedContrib)?.submittedAt || (detailData || selectedContrib)?.createdAt) || "—"}</div>
                        </div>
                        {(detailData || selectedContrib)?.updatedAt && (
                          <div className="meta-box">
                            <div className="meta-key">Last Updated</div>
                            <div className="meta-val">{fmtDate((detailData || selectedContrib).updatedAt)}</div>
                          </div>
                        )}
                      </div>

                      {(detailData || selectedContrib)?.description && (
                        <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-mid)", marginBottom: 24 }}>
                          {(detailData || selectedContrib).description}
                        </div>
                      )}

                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", marginBottom: 12 }}>📎 Attached Files</div>
                      {filesLoading ? (
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading files…</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {/* Document row */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px", background: "var(--sky)", borderRadius: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 20 }}>📄</span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                                  {(detailData || selectedContrib)?.originalFileName || (detailData || selectedContrib)?.fileName || "Article Document"}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Word Document (.doc / .docx)</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {docBlob ? (
                                <>
                                  <button className="btn btn-outline btn-sm"
                                    onClick={() => viewDocument(docBlob.blob, (detailData || selectedContrib)?.originalFileName || (detailData || selectedContrib)?.fileName || "document.docx")}>
                                    👁 View
                                  </button>
                                  <button className="btn btn-navy btn-sm"
                                    disabled={!afterFinalClosure}
                                    title={!afterFinalClosure ? `Available after ${fmtDate(finalClosureDate)}` : ""}
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
                          {/* Image row */}
                          <div style={{ padding: "12px 14px", background: "var(--sky)", borderRadius: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: imgBlob ? 12 : 0 }}>
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
                                  disabled={!afterFinalClosure}
                                  title={!afterFinalClosure ? `Available after ${fmtDate(finalClosureDate)}` : ""}
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
                                style={{ width: "100%", maxHeight: 400, objectFit: "contain", borderRadius: 6, background: "#fff", display: "block" }} />
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* ── Contributions list ── */
                <div className="card">
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
                        {faculties.map((f) => (
                          <option key={f.facultyId} value={f.facultyId}>{f.facultyName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {contributionsLoading ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
                  ) : filteredContributions.length === 0 ? (
                    <div className="cb">
                      <div className="alert info" style={{ margin: 0 }}>
                        <span className="alert-icon">📂</span>
                        <div>{facultyFilter ? `No selected contributions for ${faculties.find(f => f.facultyId === facultyFilter)?.facultyName || facultyFilter}.` : "No selected contributions found for this academic year."}</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {filteredContributions.map((c, i) => (
                        <div
                          key={cid(c) || i}
                          onClick={() => openDetail(c)}
                          style={{
                            padding: "14px 16px", cursor: "pointer",
                            borderBottom: "1px solid var(--border)",
                            borderLeft: "3px solid var(--success)",
                            background: "#fff", transition: "background .1s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--sky)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                        >
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--navy)", marginBottom: 4 }}>
                            {c.contributionTitle || c.title || "Untitled"}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                            <span>👤 {resolveStudent(c) || "—"}</span>
                            <span>🏫 {resolveFacultyName(c) || "—"}</span>
                            <span>📅 {fmtDate(c.submittedAt || c.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── STATISTICS TAB ── */}
          {activeTab === "statistics" && (
            <>
              <div className="pg-header">
                <div>
                  <div className="pg-title">Statistics</div>
                  <div className="pg-sub">
                    {statsYearLabel ? ayLabel(statsYearLabel) : ""} · Contributions by Faculty
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => fetchStatistics(statsYear)}>↺ Refresh</button>
              </div>

              {/* Summary stat cards */}
              <div className="stats" style={{ marginBottom: 20 }}>
                <div className="stat">
                  <div className="stat-n">{statsLoading ? "…" : (statsSummary?.totalContributions ?? statistics.reduce((s, f) => s + (f.totalContributions || 0), 0))}</div>
                  <div className="stat-l">Total Contributions</div>
                </div>
                <div className="stat">
                  <div className="stat-n">{statsLoading ? "…" : (statsSummary?.totalContributors ?? statistics.reduce((s, f) => s + (f.totalContributors || 0), 0))}</div>
                  <div className="stat-l">Total Contributors</div>
                </div>
                <div className="stat green">
                  <div className="stat-n">{statsLoading ? "…" : statsSelectedCount}</div>
                  <div className="stat-l">Selected</div>
                </div>
                <div className="stat">
                  <div className="stat-n">{statsLoading ? "…" : statistics.length}</div>
                  <div className="stat-l">Faculties</div>
                </div>
                <div className="stat red">
                  <div className="stat-n">{statsLoading ? "…" : statsOverdueCount}</div>
                  <div className="stat-l">Overdue Comments</div>
                </div>
              </div>

              {/* Faculty breakdown card */}
              <div className="card">
                <div className="ch">
                  <div>
                    <div className="ch-title">Contributions by Faculty</div>
                    <div className="ch-sub">
                      {statsYearLabel ? ayLabel(statsYearLabel) : ""} · {statistics.reduce((s, f) => s + (f.totalContributions || 0), 0)} contributions
                    </div>
                  </div>
                  <select
                    value={statsYear}
                    onChange={(e) => handleStatsYearChange(e.target.value)}
                    style={{ fontSize: 13, padding: "5px 10px", border: "1.5px solid var(--border)", borderRadius: 6, color: "var(--text)", background: "#fff", fontFamily: "inherit" }}
                  >
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
                    {(() => {
                      const hasSelected = totalSelectedCount > 0;
                      return (
                      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                      <table className="data-table" style={{ marginTop: 4 }}>
                        <thead>
                          <tr>
                            <th>Faculty</th>
                            <th style={{ textAlign: "right" }}>Contributions</th>
                            <th style={{ textAlign: "right" }}>% of Total</th>
                            <th style={{ textAlign: "right" }}>Contributors</th>
                            {hasSelected && <th style={{ textAlign: "right" }}>Selected</th>}
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
                                {hasSelected && (
                                  <td style={{ textAlign: "right" }}>
                                    {(() => {
                                      const cnt = selectedByFaculty[f.facultyId] || selectedByFaculty[f.facultyName] || 0;
                                      return cnt > 0
                                        ? <span className="badge b-green" style={{ fontSize: 11 }}>{cnt}</span>
                                        : <span style={{ color: "var(--text-muted)" }}>0</span>;
                                    })()}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          <tr style={{ background: "var(--sky)", fontWeight: 700 }}>
                            <td>Total</td>
                            <td style={{ textAlign: "right" }}>{statistics.reduce((s, f) => s + (f.totalContributions || 0), 0)}</td>
                            <td style={{ textAlign: "right" }}>100%</td>
                            <td style={{ textAlign: "right" }}>{(statsSummary?.totalContributors ?? statistics.reduce((s, f) => s + (f.totalContributors || 0), 0)) || "—"}</td>
                            {hasSelected && <td style={{ textAlign: "right" }}>{totalSelectedCount}</td>}
                          </tr>
                        </tbody>
                      </table>
                      </div>
                      );
                    })()}
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
