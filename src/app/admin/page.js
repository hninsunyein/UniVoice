"use client";
import { useState, useEffect } from "react";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import {
  getDashboardSummary,
  getStatistics,
  getMissingComments,
  getOverdueComments,
} from "@/lib/services/reports";
import { listAcademicYears } from "@/lib/services/closures";
import { listFaculties } from "@/lib/services/faculties";
import { listContributions } from "@/lib/services/contributions";
import { getUser, getAccessToken, getLastLoginAt } from "@/lib/api";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

const sidebarConfig = {
  profile: {
    initial: "A",
    name: "Admin",
    subtitle: "System Administrator",
    role: "Admin",
    avatarStyle: { background: "linear-gradient(135deg,#1a3a6a,#2a5fa8)" },
  },
  sections: [
    {
      title: "Reports",
      items: [
        { icon: "📊", label: "Statistics", href: "/admin", active: true },
        { icon: "⚠️", label: "Exception Reports", href: "/admin" },
      ],
    },
    {
      title: "Management",
      items: [
        { icon: "📅", label: "Closure Dates", href: "/admin/closure" },
        { icon: "👤", label: "Users", href: "/admin/users" },
        { icon: "🏫", label: "Faculties", href: "/admin/faculties" },
      ],
    },
  ],
};

function detectBrowser() {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Mozilla Firefox";
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Safari";
  if (/Chrome\//.test(ua)) return "Google Chrome";
  return "Other";
}

/* Extract the faculty array from GET /reports/statistics response.
   Normalises field names so the rest of the code uses consistent keys. */
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
      totalContributions: f.numberOfContributions   ?? f.totalContributions ?? f.contributions  ?? f.contributionCount ?? 0,
      totalContributors:  f.numberOfContributors    ?? f.totalContributors  ?? f.contributors   ?? f.contributorCount  ?? null,
      totalSelected:      f.totalSelected           ?? f.selected           ?? f.selectedCount  ?? 0,
      percentage:         f.percentageOfContributions ?? f.percentage       ?? f.percentageContributions ?? null,
    }))
    .sort((a, b) => b.totalContributions - a.totalContributions);

  /* Top-level summary fields the API may include alongside faculties */
  const s = Array.isArray(data) ? null : data;
  const summary = s ? {
    totalContributions: s.totalContributions   ?? s.contributions,
    totalContributors:  s.totalContributors    ?? s.contributors,
    totalSelected:      s.selectedContributions ?? s.totalSelected ?? s.selected,
    totalUsers:         s.totalUsers           ?? s.users,
    totalFaculties:     s.totalFaculties       ?? (typeof s.faculties === "number" ? s.faculties : null),
  } : null;

  return { faculties, summary };
}

function ayLabel(ay) {
  const s = ay.startDate ? new Date(ay.startDate).getFullYear() : null;
  const e = ay.endDate   ? new Date(ay.endDate).getFullYear()   : null;
  if (s && e && s !== e) return `${s}-${e}`;
  if (s) return String(s);
  return ay.academicYearName || ay.name || ay.academicYearId?.slice(0, 8) || "Academic Year";
}

function downloadCSV(rows, filename) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  // Prepend UTF-8 BOM so Excel opens the file correctly on Windows
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function StatCard({ value, label, color, loading, sub }) {
  return (
    <div className={`stat ${color || ""}`}>
      <div className="stat-n" style={{ opacity: loading ? 0.35 : 1 }}>
        {loading ? "…" : (value ?? "—")}
      </div>
      <div className="stat-l">{label}</div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ExceptionTable({ items, showDays, emptyMessage }) {
  if (items.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
        <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 15, marginBottom: 6 }}>
          All contributions are on track
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{emptyMessage}</div>
      </div>
    );
  }

  const now = Date.now();
  const sorted = showDays
    ? [...items].sort((a, b) => {
        const da = a.createdAt || a.submittedAt;
        const db = b.createdAt || b.submittedAt;
        return (da ? new Date(da).getTime() : now) - (db ? new Date(db).getTime() : now);
      })
    : items;

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
    <table className="data-table">
      <thead>
        <tr>
          <th>Contribution Title</th>
          <th>Student</th>
          <th>Faculty</th>
          <th>Submitted</th>
          {showDays && <th>Days Since Submission</th>}
        </tr>
      </thead>
      <tbody>
        {sorted.map((c, i) => {
          const d    = c.createdAt || c.submittedAt;
          const days = d ? Math.floor((now - new Date(d).getTime()) / 86400000) : null;
          const critical = showDays && days != null && days >= 30;
          return (
            <tr key={c.contributionId || c.id || i} style={{ background: critical ? "#fff5f5" : "inherit" }}>
              <td><strong>{c.contributionTitle || c.title || "—"}</strong></td>
              <td>
                {c.student?.user?.username || c.student?.user?.name ||
                 c.studentName             || c.student?.username   ||
                 c.user?.username          || "—"}
              </td>
              <td>
                {c.student?.user?.faculty?.facultyName ||
                 c.facultyName || c.faculty?.facultyName ||
                 c.user?.faculty?.facultyName || "—"}
              </td>
              <td>
                {d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </td>
              {showDays && (
                <td>
                  <span className={`badge ${critical ? "b-red" : "b-warn"}`}>
                    {days != null ? `${days} day${days !== 1 ? "s" : ""}` : "—"}
                  </span>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  useSessionGuard("/admin/login");
  const [user,            setUser]           = useState(null);
  const [lastLoginAt,     setLastLoginAt]    = useState(null);
  const [activeTab,       setActiveTab]      = useState("statistics");

  /* Data */
  const [summary,         setSummary]        = useState(null);
  const [academicYears,   setAcademicYears]  = useState([]);
  const [selectedYearId,  setSelectedYearId] = useState("");
  const [statistics,      setStatistics]     = useState([]);   // normalised faculty rows
  const [missingComments, setMissingComments]= useState([]);
  const [overdueComments, setOverdueComments]= useState([]);
  const [facultyCount,     setFacultyCount]    = useState(null);
  const [statsContributors, setStatsContributors] = useState(null);
  const [statsSelected,    setStatsSelected]  = useState(null);
  const [selectedCount,    setSelectedCount]  = useState(null);

  /* Faculty filter for bar chart */
  const [facultyFilter,    setFacultyFilter]   = useState("");
  const [selectedByFaculty,setSelectedByFaculty] = useState({});

  /* Browser tracking */
  const [browserSessions, setBrowserSessions] = useState([]);
  const [currentBrowser,  setCurrentBrowser]  = useState("");

  /* Loading flags */
  const [loadingStats,        setLoadingStats]        = useState(true);
  const [loadingExceptions,   setLoadingExceptions]   = useState(true);
  const [exportingMissing,    setExportingMissing]    = useState(false);
  const [exportingOverdue,    setExportingOverdue]    = useState(false);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/admin/login"); return; }
    setUser(getUser());
    setLastLoginAt(getLastLoginAt());
    const browser = detectBrowser();
    setCurrentBrowser(browser);
    const existing = JSON.parse(localStorage.getItem("browserSessions") || "[]");
    const updated  = [...existing, { browser, date: new Date().toISOString() }].slice(-100);
    localStorage.setItem("browserSessions", JSON.stringify(updated));
    setBrowserSessions(updated);
    loadAcademicYears().then((yearId) => fetchAll(yearId));
  }, []);

  /* ── Helpers ── */
  const toArray = (data) => {
    if (Array.isArray(data))                 return data;
    if (Array.isArray(data?.academicYears))  return data.academicYears;
    if (Array.isArray(data?.items))          return data.items;
    if (Array.isArray(data?.content))        return data.content;
    if (Array.isArray(data?.list))           return data.list;
    if (Array.isArray(data?.result))         return data.result;
    if (Array.isArray(data?.data))           return data.data;
    return [];
  };

  /* Unwrap contributions from a reports response.
     Handles both single-level { data: [...] } and double-wrapped
     { data: [{ success, data: [...] }] } shapes. */
  const extractContributions = (res) => {
    const d = res?.data;
    if (!d) return [];
    // Double-wrapped: data is an array of API response objects
    if (Array.isArray(d) && d.length > 0 && typeof d[0]?.success === "boolean") {
      return d.flatMap((r) => Array.isArray(r?.data) ? r.data : []);
    }
    if (Array.isArray(d))            return d;
    if (Array.isArray(d?.data))      return d.data;
    if (Array.isArray(d?.items))     return d.items;
    return [];
  };

  /* Load academic years → auto-select latest → return its ID */
  const loadAcademicYears = async () => {
    const res = await listAcademicYears().catch(() => ({ success: false }));
    if (!res.success) return "";
    const years = toArray(res.data);
    if (!years.length) return "";
    setAcademicYears(years);
    const sorted   = [...years].sort((a, b) =>
      new Date(b.endDate || b.startDate || 0) - new Date(a.endDate || a.startDate || 0)
    );
    const latestId = sorted[0]?.academicYearId || "";
    setSelectedYearId(latestId);
    return latestId;
  };

  /* Fetch all dashboard data for the given academic year */
  const fetchAll = async (yearId) => {
    setLoadingStats(true);
    setLoadingExceptions(true);
    try {
      const [summaryRes, statsRes, missingRes, overdueRes, facRes] = await Promise.all([
        getDashboardSummary().catch(()              => ({ success: false })),
        getStatistics(yearId || undefined).catch(() => ({ success: false })),
        getMissingComments().catch(()               => ({ success: false })),
        getOverdueComments().catch(()               => ({ success: false })),
        listFaculties().catch(()                    => ({ success: false, data: [] })),
      ]);

      /* Faculty count — from /faculties table */
      const facList = toArray(Array.isArray(facRes) ? facRes : facRes.data);
      if (facList.length > 0) setFacultyCount(facList.length);

      /* Parse statistics response */
      const { faculties, summary: statsSummary } = statsRes.success
        ? parseStatistics(statsRes.data)
        : { faculties: [], summary: null };
      setStatistics(faculties);

      /* Store top-level contributor & selected counts from statistics (authoritative) */
      if (statsSummary?.totalContributors != null) setStatsContributors(statsSummary.totalContributors);
      if (statsSummary?.totalSelected     != null) setStatsSelected(statsSummary.totalSelected);

      /* Populate summary: prefer /dashboard-summary, fall back to stats top-level */
      if (summaryRes.success && summaryRes.data != null) {
        setSummary(summaryRes.data);
      } else if (statsSummary) {
        setSummary(statsSummary);
      }

      setMissingComments(missingRes.success ? extractContributions(missingRes) : []);
      setOverdueComments(overdueRes.success ? extractContributions(overdueRes) : []);
    } finally {
      setLoadingStats(false);
      setLoadingExceptions(false);
    }
    /* Fetch year-filtered selected count (non-blocking) */
    fetchSelectedCount(yearId);
  };

  /* Count selected contributions for a specific year directly from the contributions API.
     This is the accurate year-filtered count — dashboard-summary returns a global total. */
  const fetchSelectedCount = async (yearId) => {
    try {
      const params = {};
      if (yearId) params.academicYearId = yearId;
      const res = await listContributions(params).catch(() => ({ success: false }));
      if (res.success !== false) {
        const raw = res.data;
        const items =
          Array.isArray(raw?.contributions) ? raw.contributions :
          Array.isArray(raw?.items)         ? raw.items         :
          Array.isArray(raw)                ? raw               : [];
        const selectedItems = items.filter((c) =>
          (c.status || c.contributionStatus || c.statusName || "").toUpperCase() === "SELECTED"
        );
        setSelectedCount(selectedItems.length);
        const byFac = {};
        selectedItems.forEach((c) => {
          const fid = c.facultyId || c.faculty?.facultyId || c.student?.user?.facultyId;
          const fname = c.facultyName || c.faculty?.facultyName || c.student?.user?.faculty?.facultyName;
          const key = fid || fname || "__unknown";
          byFac[key] = (byFac[key] || 0) + 1;
        });
        setSelectedByFaculty(byFac);
      }
    } catch {}
  };

  /* Re-fetch statistics + year-filtered selected count when year changes */
  const fetchStatistics = async (yearId) => {
    setLoadingStats(true);
    try {
      const statsRes = await getStatistics(yearId || undefined).catch(() => ({ success: false }));
      if (statsRes.success) {
        const { faculties, summary: statsSummary } = parseStatistics(statsRes.data);
        setStatistics(faculties);
        if (statsSummary?.totalContributors != null) setStatsContributors(statsSummary.totalContributors);
        if (statsSummary?.totalSelected     != null) setStatsSelected(statsSummary.totalSelected);
        if (statsSummary) setSummary((prev) => prev ?? statsSummary);
      }
    } finally {
      setLoadingStats(false);
    }
    /* Fetch accurate selected count for this year (non-blocking) */
    fetchSelectedCount(yearId);
  };

  const handleYearChange = (yearId) => {
    setSelectedYearId(yearId);
    setSelectedCount(null); // reset while re-fetching
    fetchStatistics(yearId);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  /* ── CSV exports ── */
  const exportStatisticsCSV = () => {
    const yearLabel = selectedYearId
      ? ayLabel(academicYears.find((y) => y.academicYearId === selectedYearId) || {})
      : "All Years";
    downloadCSV(
      [
        [`Faculty Statistics — ${yearLabel}`],
        ["Faculty", "Contributions", "% of Total", "Contributors"],
        ...statistics.map((f) => [
          f.facultyName || "—",
          f.totalContributions,
          grandTotal > 0 ? ((f.totalContributions / grandTotal) * 100).toFixed(1) + "%" : "0%",
          f.totalContributors ?? "—",
        ]),
        ["Total", totalContribAll, "100%", totalContributors || "—"],
      ],
      `faculty-statistics-${yearLabel.replace(/\s*\/\s*/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  const pickItems = (res) => {
    const d = res?.data;
    if (Array.isArray(d))               return d;
    if (Array.isArray(d?.items))        return d.items;
    if (Array.isArray(d?.data))         return d.data;
    if (Array.isArray(d?.contributions)) return d.contributions;
    return [];
  };

  const exportMissingCSV = async () => {
    setExportingMissing(true);
    try {
      const res = await getMissingComments();
      console.log("[Export Missing] raw res:", res);
      const items = pickItems(res);
      console.log("[Export Missing] items count:", items.length, "| first:", items[0]);
      if (items.length === 0) {
        alert("No data returned from server.\n\nResponse: " + JSON.stringify(res?.data));
        return;
      }
      const rows = items.map((c) => [
        c.contributionTitle,
        c.student?.user?.username,
        c.student?.user?.faculty?.facultyName,
        c.submittedAt ? new Date(c.submittedAt).toLocaleDateString("en-GB") : "",
      ]);
      downloadCSV(
        [["Contribution Title", "Student", "Faculty", "Submitted Date"], ...rows],
        `missing-comments-${new Date().toISOString().split("T")[0]}.csv`,
      );
    } catch (err) {
      alert("Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExportingMissing(false);
    }
  };

  const exportOverdueCSV = async () => {
    setExportingOverdue(true);
    try {
      const res = await getOverdueComments();
      console.log("[Export Overdue] raw res:", res);
      const items = pickItems(res);
      console.log("[Export Overdue] items count:", items.length, "| first:", items[0]);
      if (items.length === 0) {
        alert("No data returned from server.\n\nResponse: " + JSON.stringify(res?.data));
        return;
      }
      const now = Date.now();
      const rows = items.map((c) => {
        const days = c.submittedAt ? Math.floor((now - new Date(c.submittedAt).getTime()) / 86400000) : "";
        return [
          c.contributionTitle,
          c.student?.user?.username,
          c.student?.user?.faculty?.facultyName,
          c.submittedAt ? new Date(c.submittedAt).toLocaleDateString("en-GB") : "",
          days,
        ];
      });
      downloadCSV(
        [["Contribution Title", "Student", "Faculty", "Submitted Date", "Days Since Submission"], ...rows],
        `overdue-comments-${new Date().toISOString().split("T")[0]}.csv`,
      );
    } catch (err) {
      alert("Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExportingOverdue(false);
    }
  };

  /* ── Derived totals (field names confirmed from API docs) ──
     Statistics API:       array of { facultyName, numberOfContributions, numberOfContributors, percentageOfContributions }
     Dashboard Summary API: { totalUsers, faculties, academicYears, totalContributions, selectedContributions, pendingComments }
  */

  /* Total contributions: sum per-faculty from statistics, fall back to dashboard-summary.totalContributions */
  const totalContribAll = statistics.reduce((s, f) => s + (f.totalContributions || 0), 0)
                          || summary?.totalContributions || 0;

  /* Contributors: sum per-faculty numberOfContributors (students belong to one faculty, no double-count) */
  const totalContributors = statistics.length > 0
    ? statistics.reduce((s, f) => s + (f.totalContributors || 0), 0)
    : null;

  /* Selected: year-filtered count from contributions API (most accurate),
     fall back to dashboard-summary.selectedContributions (global, not year-filtered) */
  const totalSelectedAll = selectedCount ?? summary?.selectedContributions ?? statsSelected ?? 0;

  /* Faculty count: from /faculties list (authoritative), fall back to summary.faculties */
  const totalFaculties = facultyCount ?? summary?.faculties ?? null;
  const grandTotal       = totalContribAll || 1;
  const maxContributions = statistics.reduce((m, f) => Math.max(m, f.totalContributions || 0), 1);

  const barColors    = ["#2a5fa8", "#1a8a5a", "#7030a0", "#c07020", "#c0202a", "#0078d4"];
  const browserColors = {
    "Google Chrome": "#1a73e8", "Mozilla Firefox": "#e66000",
    "Microsoft Edge": "#0078d4", "Safari": "#006cbe",
    "Opera": "#cc0f16", "Other": "#888",
  };
  const browserTally   = browserSessions.reduce((acc, s) => { acc[s.browser] = (acc[s.browser] || 0) + 1; return acc; }, {});
  const browserTotal   = browserSessions.length || 1;
  const browserEntries = Object.entries(browserTally).sort((a, b) => b[1] - a[1]);
  const selectedYear   = academicYears.find((y) => y.academicYearId === selectedYearId);
  const yearLabel      = selectedYear ? ayLabel(selectedYear) : "All Academic Years";
  const avatarInfo     = user
    ? { initial: (user.username || user.email || "A")[0].toUpperCase(), name: user.username || "Admin", role: user.roleName || "Admin" }
    : { initial: "A", name: "Admin", role: "Administrator" };

  return (
    <>
      <Topbar userInfo={`<strong>${avatarInfo.name}</strong> · System Administrator`} avatar={avatarInfo} />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">

          {/* Page header */}
          <div className="pg-header">
            <div>
              <div className="pg-title">System Reports &amp; Analytics</div>
              <div className="pg-sub" suppressHydrationWarning>
                {yearLabel} · Updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={() => fetchAll(selectedYearId)}>↺ Refresh</button>
            </div>
          </div>

          <div className="alert info" style={{ marginBottom: 16 }}>
            <span className="alert-icon">🔵</span>
            {lastLoginAt ? (
              <div>Last login: <strong>{new Date(lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, {new Date(lastLoginAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</strong></div>
            ) : (
              <div>Welcome! 🎉 This is your <strong>first time</strong> logging in.</div>
            )}
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", marginBottom: 24, borderBottom: "2px solid var(--border)" }}>
            {[
              { key: "statistics", label: "📊  Statistics" },
              { key: "exceptions", label: "⚠️  Exception Reports" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "9px 22px", background: "none", border: "none",
                  borderBottom: activeTab === tab.key ? "2px solid var(--blue)" : "2px solid transparent",
                  marginBottom: -2, fontFamily: "inherit", fontSize: 13.5,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  color: activeTab === tab.key ? "var(--blue)" : "var(--text-mid)",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── STATISTICS TAB ── */}
          {activeTab === "statistics" && (
            <>
              {/* ── Summary Cards ── */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="ch">
                  <div>
                    <div className="ch-title">Summary</div>
                    <div className="ch-sub">{yearLabel}</div>
                  </div>
                </div>
                <div className="cb" style={{ paddingTop: 0 }}>
                  <div className="stats" style={{ marginBottom: 0 }}>
                    <div className="stat">
                      <div className="stat-n">{loadingStats ? "…" : totalContribAll ?? "—"}</div>
                      <div className="stat-l">Total Contributions</div>
                    </div>
                    <div className="stat blue">
                      <div className="stat-n">{loadingStats ? "…" : totalContributors ?? "—"}</div>
                      <div className="stat-l">Contributors</div>
                    </div>
                    <div className="stat green">
                      <div className="stat-n">{loadingStats ? "…" : totalSelectedAll ?? "—"}</div>
                      <div className="stat-l">Selected</div>
                    </div>
                    <div className="stat">
                      <div className="stat-n">{loadingStats ? "…" : summary?.totalUsers ?? "—"}</div>
                      <div className="stat-l">Total Users</div>
                    </div>
                    <div className="stat">
                      <div className="stat-n">{loadingStats ? "…" : totalFaculties ?? "—"}</div>
                      <div className="stat-l">Faculties</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contributions by Faculty */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="ch" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ch-title">Contributions by Faculty</div>
                    <div className="ch-sub">
                      {yearLabel} · {totalContribAll} contribution{totalContribAll !== 1 ? "s" : ""} · {totalContributors || "?"} contributor{totalContributors !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      value={selectedYearId}
                      onChange={(e) => { setFacultyFilter(""); handleYearChange(e.target.value); }}
                      style={{ border: "1.5px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontFamily: "inherit", fontSize: 13 }}
                    >
                      {academicYears.map((y) => (
                        <option key={y.academicYearId} value={y.academicYearId}>{ayLabel(y)}</option>
                      ))}
                    </select>
                    <select
                      value={facultyFilter}
                      onChange={(e) => setFacultyFilter(e.target.value)}
                      style={{ border: "1.5px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontFamily: "inherit", fontSize: 13 }}
                    >
                      <option value="">All Faculties</option>
                      {statistics.map((f) => (
                        <option key={f.facultyId || f.facultyName} value={f.facultyId || f.facultyName}>{f.facultyName}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={exportStatisticsCSV}
                      disabled={statistics.length === 0 || loadingStats}
                    >
                      {loadingStats ? "Loading…" : "Export CSV"}
                    </button>
                  </div>
                </div>

                {loadingStats ? (
                  <div className="cb" style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0" }}>
                    Loading statistics…
                  </div>
                ) : statistics.length > 0 ? (() => {
                  const displayedStats = facultyFilter
                    ? statistics.filter((f) => f.facultyId === facultyFilter || f.facultyName === facultyFilter)
                    : statistics;
                  const displayTotal = displayedStats.reduce((s, f) => s + (f.totalContributions || 0), 0);
                  const displayMax   = displayedStats.reduce((m, f) => Math.max(m, f.totalContributions || 0), 1);
                  return (
                  <>
                    {/* Bar chart */}
                    <div className="cb" style={{ paddingBottom: 0 }}>
                      <div className="bar-rows">
                        {displayedStats.map((f, i) => {
                          const count = f.totalContributions || 0;
                          const pct   = ((count / grandTotal) * 100).toFixed(1);
                          const barW  = Math.round((count / displayMax) * 100);
                          return (
                            <div key={f.facultyId || i} className="brow">
                              <div className="blbl">{f.facultyName}</div>
                              <div className="btrack">
                                <div className="bfill" style={{ width: `${barW}%`, background: barColors[i % barColors.length] }}>
                                  {count}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 44, textAlign: "right" }}>
                                {pct}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Statistics table */}
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="data-table" style={{ marginTop: 4 }}>
                      <thead>
                        <tr>
                          <th>Faculty</th>
                          <th style={{ textAlign: "center" }}>Contributions</th>
                          <th style={{ textAlign: "center" }}>% of Total</th>
                          <th style={{ textAlign: "center" }}>Contributors</th>
                          <th style={{ textAlign: "center" }}>Selected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedStats.map((f, i) => {
                          const count = f.totalContributions || 0;
                          const pct   = ((count / grandTotal) * 100).toFixed(1);
                          const selCnt = selectedByFaculty[f.facultyId] || selectedByFaculty[f.facultyName] || 0;
                          return (
                            <tr key={f.facultyId || i}>
                              <td><strong>{f.facultyName || "—"}</strong></td>
                              <td style={{ textAlign: "center" }}>{count}</td>
                              <td style={{ textAlign: "center" }}>
                                <span className="badge b-blue" style={{ fontSize: 11 }}>{pct}%</span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {f.totalContributors ?? "—"}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {selCnt > 0
                                  ? <span className="badge b-green" style={{ fontSize: 11 }}>{selCnt}</span>
                                  : <span style={{ color: "var(--text-muted)" }}>0</span>}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: "var(--sky)", fontWeight: 700 }}>
                          <td>Total</td>
                          <td style={{ textAlign: "center" }}>{displayTotal}</td>
                          <td style={{ textAlign: "center" }}>{facultyFilter ? ((displayTotal / grandTotal) * 100).toFixed(1) + "%" : "100%"}</td>
                          <td style={{ textAlign: "center" }}>{facultyFilter ? (displayedStats[0]?.totalContributors ?? "—") : (totalContributors ?? "—")}</td>
                          <td style={{ textAlign: "center" }}>{facultyFilter ? (selectedByFaculty[facultyFilter] || 0) : totalSelectedAll}</td>
                        </tr>
                      </tbody>
                    </table>
                    </div>
                  </>
                  );
                })() : (
                  <div className="cb" style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
                    No statistics available for the selected academic year.
                  </div>
                )}
              </div>

              {/* Browser Usage */}
              {browserEntries.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="ch">
                    <div>
                      <div className="ch-title">Browser Usage</div>
                      <div className="ch-sub" suppressHydrationWarning>
                        {browserSessions.length} session{browserSessions.length !== 1 ? "s" : ""} recorded
                      </div>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Browser</th>
                        <th style={{ textAlign: "center" }}>Sessions</th>
                        <th style={{ textAlign: "center" }}>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {browserEntries.map(([browser, count]) => {
                        const pct   = ((count / browserTotal) * 100).toFixed(1);
                        const color = browserColors[browser] || "#888";
                        return (
                          <tr key={browser}>
                            <td>
                              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color, marginRight: 8, verticalAlign: "middle" }} />
                              {browser}
                              {browser === currentBrowser && (
                                <span className="badge b-blue" style={{ fontSize: 10, marginLeft: 8 }}>current</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>{count}</td>
                            <td style={{ textAlign: "center" }}>{pct}%</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: "var(--sky)", fontWeight: 700 }}>
                        <td>Total</td>
                        <td style={{ textAlign: "center" }}>{browserSessions.length}</td>
                        <td style={{ textAlign: "center" }}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>
              )}

            </>
          )}

          {/* ── EXCEPTION REPORTS TAB ── */}
          {activeTab === "exceptions" && (
            <>
              {loadingExceptions ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading exception reports…
                </div>
              ) : (
                <>
                  {/* Contributions without any comment */}
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="ch">
                      <div>
                        <div className="ch-title">Contributions Without a Comment</div>
                        <div className="ch-sub">Submitted contributions that have not received any coordinator comment</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {missingComments.length > 0 && (
                          <span className="badge b-warn" style={{ fontSize: 12, padding: "4px 10px" }}>
                            {missingComments.length} pending
                          </span>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={exportMissingCSV} disabled={exportingMissing}>
                          {exportingMissing ? "Exporting…" : "Export CSV"}
                        </button>
                      </div>
                    </div>
                    <ExceptionTable items={missingComments} emptyMessage="All submitted contributions have received a coordinator comment." />
                  </div>

                  {/* Contributions without a comment after 14 days */}
                  <div className="card">
                    <div className="ch">
                      <div>
                        <div className="ch-title">Contributions Without a Comment After 14 Days</div>
                        <div className="ch-sub">Contributions submitted more than 14 days ago with no coordinator comment</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {overdueComments.length > 0 && (
                          <span className="badge b-red" style={{ fontSize: 12, padding: "4px 10px" }}>
                            {overdueComments.length} overdue
                          </span>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={exportOverdueCSV} disabled={exportingOverdue}>
                          {exportingOverdue ? "Exporting…" : "Export CSV"}
                        </button>
                      </div>
                    </div>
                    {overdueComments.length > 0 && (
                      <div style={{ margin: "0 16px 14px", background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 8, padding: "11px 14px", fontSize: 13, color: "#b91c1c", display: "flex", gap: 10 }}>
                        <span>⚠</span>
                        <div>
                          <strong>{overdueComments.length} contribution{overdueComments.length !== 1 ? "s" : ""}</strong>{" "}
                          {overdueComments.length !== 1 ? "have" : "has"} not received a coordinator comment within 14 days.
                        </div>
                      </div>
                    )}
                    <ExceptionTable items={overdueComments} showDays emptyMessage="No contributions are overdue. All have received coordinator comments within 14 days." />
                  </div>
                </>
              )}
            </>
          )}

        </main>
      </div>
    </>
  );
}
