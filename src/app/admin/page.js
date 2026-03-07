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
import { listUsers } from "@/lib/services/users";
import { getUser, getAccessToken } from "@/lib/api";
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
  if (s && e && s !== e) return `${s} / ${e}`;
  if (s) return String(s);
  return ay.academicYearName || ay.name || ay.academicYearId?.slice(0, 8) || "Academic Year";
}

function downloadCSV(rows, filename) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
              <td>{c.studentName || c.user?.username || c.student?.username || "—"}</td>
              <td>{c.facultyName || c.user?.faculty?.facultyName || c.faculty?.facultyName || "—"}</td>
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
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user,            setUser]           = useState(null);
  const [activeTab,       setActiveTab]      = useState("statistics");

  /* Data */
  const [summary,         setSummary]        = useState(null);
  const [academicYears,   setAcademicYears]  = useState([]);
  const [selectedYearId,  setSelectedYearId] = useState("");
  const [statistics,      setStatistics]     = useState([]);   // normalised faculty rows
  const [missingComments, setMissingComments]= useState([]);
  const [overdueComments, setOverdueComments]= useState([]);
  const [facultyCount,     setFacultyCount]    = useState(null); // from /faculties
  const [statsContributors, setStatsContributors] = useState(null); // top-level from /reports/statistics
  const [statsSelected,    setStatsSelected]  = useState(null); // top-level from /reports/statistics
  const [selectedCount,    setSelectedCount]  = useState(null);
  const [guestCount,       setGuestCount]     = useState(null);

  /* Browser tracking */
  const [browserSessions, setBrowserSessions] = useState([]);
  const [currentBrowser,  setCurrentBrowser]  = useState("");

  /* Loading flags */
  const [loadingStats,      setLoadingStats]      = useState(true);
  const [loadingExceptions, setLoadingExceptions] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/admin/login"); return; }
    setUser(getUser());
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
      const [summaryRes, statsRes, missingRes, overdueRes, facRes, guestRes] = await Promise.all([
        getDashboardSummary().catch(()              => ({ success: false })),
        getStatistics(yearId || undefined).catch(() => ({ success: false })),
        getMissingComments().catch(()               => ({ success: false })),
        getOverdueComments().catch(()               => ({ success: false })),
        listFaculties().catch(()                    => ({ success: false, data: [] })),
        listUsers({ role: "GUEST" }).catch(()       => ({ success: false })),
      ]);

      /* Faculty count — from /faculties table */
      const facList = toArray(Array.isArray(facRes) ? facRes : facRes.data);
      if (facList.length > 0) setFacultyCount(facList.length);

      /* Guest user count — from /users?role=GUEST (users table) */
      if (guestRes.success) {
        const raw = guestRes.data;
        const meta = raw?.pagination ?? raw?.meta ?? {};
        const total = meta.totalCount ?? meta.total ?? raw?.totalCount ?? raw?.total ?? null;
        const list =
          Array.isArray(raw?.users)   ? raw.users   :
          Array.isArray(raw?.items)   ? raw.items   :
          Array.isArray(raw?.content) ? raw.content :
          Array.isArray(raw?.list)    ? raw.list    :
          Array.isArray(raw)          ? raw         : [];
        const uniqueCount = new Set(list.map((u) => (u.email || "").toLowerCase()).filter(Boolean)).size;
        setGuestCount(total ?? (uniqueCount > 0 ? uniqueCount : 0));
      }

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

      setMissingComments(missingRes.success ? toArray(missingRes.data) : []);
      setOverdueComments(overdueRes.success ? toArray(overdueRes.data) : []);
    } finally {
      setLoadingStats(false);
      setLoadingExceptions(false);
    }
  };

  /* Re-fetch only statistics when year filter changes */
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
  };

  const handleYearChange = (yearId) => {
    setSelectedYearId(yearId);
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

  const exportMissingCSV = () =>
    downloadCSV(
      [
        ["Contribution Title", "Student", "Faculty", "Submitted Date"],
        ...missingComments.map((c) => {
          const d = c.createdAt || c.submittedAt;
          return [
            c.contributionTitle || c.title || "—",
            c.studentName || c.user?.username || c.student?.username || "—",
            c.facultyName || c.user?.faculty?.facultyName || c.faculty?.facultyName || "—",
            d ? new Date(d).toLocaleDateString("en-GB") : "—",
          ];
        }),
      ],
      `missing-comments-${new Date().toISOString().split("T")[0]}.csv`,
    );

  const exportOverdueCSV = () => {
    const now = Date.now();
    downloadCSV(
      [
        ["Contribution Title", "Student", "Faculty", "Submitted Date", "Days Since Submission"],
        ...overdueComments.map((c) => {
          const d    = c.createdAt || c.submittedAt;
          const days = d ? Math.floor((now - new Date(d).getTime()) / 86400000) : "—";
          return [
            c.contributionTitle || c.title || "—",
            c.studentName || c.user?.username || c.student?.username || "—",
            c.facultyName || c.user?.faculty?.facultyName || c.faculty?.facultyName || "—",
            d ? new Date(d).toLocaleDateString("en-GB") : "—",
            days,
          ];
        }),
      ],
      `overdue-comments-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  /* ── Derived totals ── */
  const totalContribAll = statistics.reduce((s, f) => s + (f.totalContributions || 0), 0)
                          || summary?.totalContributions || summary?.contributions || 0;

  /* Contributors: top-level from /reports/statistics (unique student IDs, server-counted).
     Never sum per-faculty — that double-counts cross-faculty contributors. */
  const totalContributors = statsContributors
                            ?? summary?.totalContributors
                            ?? summary?.contributors
                            ?? (statistics.length > 0
                                ? statistics.reduce((s, f) => s + (f.totalContributors || 0), 0)
                                : null);

  /* Selected: top-level from /reports/statistics, then summary */
  const totalSelectedAll = selectedCount
                           ?? statsSelected
                           ?? summary?.selectedContributions
                           ?? summary?.totalSelected
                           ?? summary?.selected
                           ?? statistics.reduce((s, f) => s + (f.totalSelected || 0), 0);
  /* Faculty count: from /faculties table, then statistics rows, then summary */
  const totalFaculties   = facultyCount ?? (statistics.length || summary?.totalFaculties || summary?.faculties || null);
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
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>Log Out</button>
            </div>
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
              {/* Contributions by Faculty */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="ch">
                  <div>
                    <div className="ch-title">Contributions by Faculty</div>
                    <div className="ch-sub">
                      {yearLabel} · {totalContribAll} contribution{totalContribAll !== 1 ? "s" : ""} · {totalContributors || "?"} contributor{totalContributors !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      value={selectedYearId}
                      onChange={(e) => handleYearChange(e.target.value)}
                      style={{ fontSize: 13, padding: "5px 10px", border: "1.5px solid var(--border)", borderRadius: 6, color: "var(--text)", background: "#fff", fontFamily: "inherit" }}
                    >
                      <option value="">All Academic Years</option>
                      {academicYears.map((y) => (
                        <option key={y.academicYearId} value={y.academicYearId}>{ayLabel(y)}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={exportStatisticsCSV}
                      disabled={statistics.length === 0}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                {loadingStats ? (
                  <div className="cb" style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0" }}>
                    Loading statistics…
                  </div>
                ) : statistics.length > 0 ? (
                  <>
                    {/* Bar chart */}
                    <div className="cb" style={{ paddingBottom: 0 }}>
                      <div className="bar-rows">
                        {statistics.map((f, i) => {
                          const count = f.totalContributions || 0;
                          const pct   = ((count / grandTotal) * 100).toFixed(1);
                          const barW  = Math.round((count / maxContributions) * 100);
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

                    {/* Statistics table: Faculty · Contributions · % · Contributors */}
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
                              <td style={{ textAlign: "right" }}>
                                <strong>{f.totalContributors ?? "—"}</strong>
                              </td>
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
                          <td style={{ textAlign: "right" }}>{totalContribAll}</td>
                          <td style={{ textAlign: "right" }}>100%</td>
                          <td style={{ textAlign: "right" }}>{totalContributors || "—"}</td>
                          <td style={{ textAlign: "right" }}>{totalSelectedAll || "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="cb" style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
                    No statistics available for the selected academic year.
                  </div>
                )}
              </div>

              {/* Quick Summary + Browser Usage */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="ch">
                    <div className="ch-title">Quick Summary</div>
                    <div className="ch-sub">{yearLabel}</div>
                  </div>
                  <div className="cb">
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Total Contributions", value: totalContribAll,   color: "var(--navy)" },
                        { label: "Total Contributors",  value: totalContributors, color: "var(--blue)" },
                        { label: "Selected",            value: totalSelectedAll,  color: "var(--success)" },
                        { label: "Total Users",         value: summary?.totalUsers ?? summary?.users,  color: "var(--navy)" },
                        { label: "Guest Users",         value: guestCount,                            color: "var(--blue)" },
                        { label: "Total Faculties",     value: totalFaculties,                        color: "var(--navy)" },
                      ].filter((r) => r.value !== undefined && r.value !== null).map((row) => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                          <span style={{ color: "var(--text-mid)" }}>{row.label}</span>
                          <strong style={{ color: row.color }}>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="ch">
                    <div className="ch-title">Browser Usage</div>
                    <div className="ch-sub">{browserSessions.length} session{browserSessions.length !== 1 ? "s" : ""} tracked</div>
                  </div>
                  <div className="cb">
                    {browserEntries.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {browserEntries.map(([browser, count]) => {
                          const pct       = Math.round((count / browserTotal) * 100);
                          const color     = browserColors[browser] || "#888";
                          const isCurrent = browser === currentBrowser;
                          return (
                            <div key={browser}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                                <span style={{ color: "var(--text-mid)", display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                                  {browser}
                                  {isCurrent && <span className="badge b-blue" style={{ fontSize: 10, padding: "1px 6px" }}>current</span>}
                                </span>
                                <span style={{ fontWeight: 600, color: "var(--navy)" }}>{count} · {pct}%</span>
                              </div>
                              <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .4s" }} />
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                          Tracked via browser sessions on this device.
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>
                        No sessions tracked yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                        <button className="btn btn-outline btn-sm" onClick={exportMissingCSV} disabled={missingComments.length === 0}>
                          Export CSV
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
                        <button className="btn btn-outline btn-sm" onClick={exportOverdueCSV} disabled={overdueComments.length === 0}>
                          Export CSV
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
