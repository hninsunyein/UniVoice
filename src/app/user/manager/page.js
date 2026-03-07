"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { getUser, getAccessToken, BASE_URL } from "@/lib/api";
import { listContributions } from "@/lib/services/contributions";
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

              <div className="card">
                <div className="ch">
                  <div>
                    <div className="ch-title">All Selected Contributions — University-wide</div>
                    <div className="ch-sub">View only · Final selections made by Faculty Coordinators</div>
                  </div>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{ border: "1.5px solid var(--border)", borderRadius: 7, padding: "7px 12px", fontFamily: "inherit", fontSize: 13 }}
                  >
                    {academicYears.map((ay, i) => (
                      <option key={ay.academicYearId || ay.id || i} value={ay.academicYearId || ay.id}>
                        {ayLabel(ay)}
                      </option>
                    ))}
                  </select>
                </div>
                {contributionsLoading ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Title</th><th>Student</th><th>Faculty</th><th>Selected On</th></tr>
                    </thead>
                    <tbody>
                      {contributions.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>No selected contributions found.</td></tr>
                      ) : contributions.map((c, i) => (
                        <tr key={c.contributionId || c.id || c._id || i}>
                          <td><strong>{c.contributionTitle || c.title || "—"}</strong></td>
                          <td>{c.studentName || c.student?.username || "—"}</td>
                          <td>{c.facultyName || c.faculty?.facultyName || "—"}</td>
                          <td>{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("en-GB") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {contributions.length > 0 && (
                  <div style={{ padding: "10px 16px", fontSize: "12px", color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
                    Showing {contributions.length} selected contribution{contributions.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
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
