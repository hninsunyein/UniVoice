"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import {
  listAcademicYears, createAcademicYear,
  createClosureDate, updateClosureDate, toggleClosureDateStatus,
} from "@/lib/services/closures";
import { listTerms } from "@/lib/services/terms";
import { getAccessToken, getUser } from "@/lib/api";
import { useSessionGuard } from "@/lib/useSessionGuard";

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
      title: "Management",
      items: [
        { icon: "📊", label: "Reports",       href: "/admin" },
        { icon: "📅", label: "Closure Dates", href: "/admin/closure", active: true },
        { icon: "👤", label: "Users",         href: "/admin/users" },
        { icon: "🏫", label: "Faculties",     href: "/admin/faculties" },
      ],
    },
  ],
};

/* ── helpers ── */
function toLocalInput(dateStr) {
  if (!dateStr) return "";
  const d   = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// Convert datetime-local string (local time) to ISO string for API
function toISO(localStr) {
  if (!localStr) return undefined;
  return new Date(localStr).toISOString();
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateShort(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* Construct a readable label for an academic year from its dates */
function ayLabel(ay) {
  const s = ay.startDate ? new Date(ay.startDate).getFullYear() : null;
  const e = ay.endDate   ? new Date(ay.endDate).getFullYear()   : null;
  if (s && e && s !== e) return `${s} / ${e}`;
  if (s) return `${s}`;
  return ay.academicYearId?.slice(0, 8) || "Academic Year";
}

function getWindowStatus(cd) {
  if (!cd.isActive) return { label: "Inactive", cls: "b-draft", icon: "⚫" };
  const now     = new Date();
  const initial = cd.initialClosureDate ? new Date(cd.initialClosureDate) : null;
  const final   = cd.finalClosureDate   ? new Date(cd.finalClosureDate)   : null;
  if (final && now > final)     return { label: "Fully Closed",        cls: "b-red",   icon: "🔒" };
  if (initial && now > initial) return { label: "In Final Period",      cls: "b-warn",  icon: "⏳" };
  if (initial && now < initial) return { label: "Open for Submissions", cls: "b-green", icon: "✅" };
  return { label: "Active", cls: "b-blue", icon: "🔵" };
}

/* API field names confirmed from GET /api/academic-years & /api/terms-conditions:
   - Academic year: academicYearId, startDate, endDate, termsConditionsVerId  (NO name field)
   - Terms:         termsConditionsVerId, content, effectiveDate
   - Closure date:  closureDateId, academicYearId, initialClosureDate, finalClosureDate, isActive
*/

const EMPTY_CLOSURE = { academicYearId: "", initialClosureDate: "", finalClosureDate: "", isActive: true };
const EMPTY_YEAR    = { startDate: "", endDate: "", termsConditionsVerId: "" };

export default function ClosureDatesPage() {
  const router = useRouter();
  useSessionGuard("/admin/login", ["SUPER_ADMIN", "ADMIN"]);
  const [currentUser, setCurrentUser] = useState(null);

  const [academicYears, setAcademicYears] = useState([]);
  const [terms,         setTerms]         = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [saving,   setSaving]   = useState(false);

  /* editable fields keyed by closureDateId */
  const [edits, setEdits] = useState({});

  const [newYear,    setNewYear]    = useState(EMPTY_YEAR);
  const [newClosure, setNewClosure] = useState(EMPTY_CLOSURE);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/admin/login"); return; }
    setCurrentUser(getUser());
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [ayRes, termsRes] = await Promise.all([listAcademicYears(), listTerms()]);

      if (ayRes.success && Array.isArray(ayRes.data)) {
        setAcademicYears(ayRes.data);
        /* build edits from the nested closureDate inside each academic year */
        const initEdits = {};
        ayRes.data.forEach((ay) => {
          const cd = ay.closureDate;
          if (cd) {
            const key = cd.closureDateId || cd.id;
            initEdits[key] = {
              initialClosureDate: toLocalInput(cd.initialClosureDate),
              finalClosureDate:   toLocalInput(cd.finalClosureDate),
            };
          }
        });
        setEdits(initEdits);
      }

      /* terms: ID field is termsConditionsVerId */
      if (termsRes.success && Array.isArray(termsRes.data) && termsRes.data.length > 0) {
        setTerms(termsRes.data);
        setNewYear((p) => ({ ...p, termsConditionsVerId: termsRes.data[0].termsConditionsVerId }));
      }
    } catch {
      setError("Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClosure = async (cdId) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const ed  = edits[cdId];
      const res = await updateClosureDate(cdId, {
        initialClosureDate: toISO(ed.initialClosureDate),
        finalClosureDate:   toISO(ed.finalClosureDate),
      });
      if (!res.success) throw new Error(res.message || "Update failed.");
      setSuccess("Closure dates saved successfully.");
      fetchAll();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (cdId, currentActive) => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await toggleClosureDateStatus(cdId, !currentActive);
      if (!res.success) throw new Error(res.message || "Toggle failed.");
      setSuccess(`Closure date ${!currentActive ? "activated" : "deactivated"}.`);
      fetchAll();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleCreateYear = async () => {
    if (!newYear.startDate || !newYear.endDate) { setError("Start date and end date are required."); return; }
    if (!newYear.termsConditionsVerId) { setError("Please check the Terms & Conditions."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await createAcademicYear({
        startDate:            toISO(newYear.startDate),
        endDate:              toISO(newYear.endDate),
        termsConditionsVerId: newYear.termsConditionsVerId,
      });
      if (!res.success) throw new Error(res.message || "Create failed.");
      setNewYear({ startDate: "", endDate: "", termsConditionsVerId: terms[0]?.termsConditionsVerId || "" });
      setSuccess("Academic year created successfully.");
      fetchAll();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleCreateClosure = async () => {
    if (!newClosure.academicYearId) { setError("Please select an academic year."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await createClosureDate({
        academicYearId:     newClosure.academicYearId,
        initialClosureDate: toISO(newClosure.initialClosureDate),
        finalClosureDate:   toISO(newClosure.finalClosureDate),
        isActive:           newClosure.isActive,
      });
      if (!res.success) throw new Error(res.message || "Create failed.");
      setNewClosure(EMPTY_CLOSURE);
      setSuccess("Closure window created successfully.");
      fetchAll();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const avatarInfo = currentUser
    ? { initial: (currentUser.username || "A")[0].toUpperCase(), name: currentUser.username || "Admin", role: currentUser.roleName || currentUser.role || "Admin" }
    : { initial: "A", name: "Admin", role: "Administrator" };

  /* closure dates are nested inside each academic year as ay.closureDate (singular) */

  return (
    <>
      <Topbar
        userInfo="<strong>Admin</strong> · Closure Date Management"
        avatar={avatarInfo}
        backTo="/admin"
        backLabel="← Back to Reports"
      />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">

          {/* ── Page header ── */}
          <div className="pg-header">
            <div>
              <div className="pg-title">Manage Closure Dates</div>
              <div className="pg-sub">Set initial and final submission deadlines per academic year.</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={fetchAll} disabled={loading}>
              ↻ Refresh
            </button>
          </div>

          {/* ── Alerts ── */}
          {success && (
            <div className="alert succ" style={{ marginBottom: 16 }}>
              <span className="alert-icon">✅</span><div>{success}</div>
            </div>
          )}
          {error && (
            <div className="alert dang" style={{ marginBottom: 16 }}>
              <span className="alert-icon">⚠️</span><div>{error}</div>
            </div>
          )}

          <div className="alert info" style={{ marginBottom: 24 }}>
            <span className="alert-icon">📅</span>
            <div>
              <strong>Initial Closure Date:</strong> Students cannot submit new contributions after this date.&nbsp;
              <strong>Final Closure Date:</strong> No further edits are allowed after this date.
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
              Loading closure data…
            </div>
          ) : (
            <>
              {/* ── Academic-year cards ── */}
              {academicYears.length === 0 && (
                <div className="alert warn" style={{ marginBottom: 20 }}>
                  <span className="alert-icon">📂</span>
                  <div>No academic years found. Create one below to get started.</div>
                </div>
              )}

              {academicYears.map((ay) => {
                const ayId      = ay.academicYearId;
                /* closureDate is nested directly in each academic year object */
                const records   = ay.closureDate ? [ay.closureDate] : [];
                const startLbl  = fmtDateShort(ay.startDate);
                const endLbl    = fmtDateShort(ay.endDate);
                const dateRange = startLbl ? `${startLbl} – ${endLbl || "?"}` : null;

                return (
                  <div key={ayId} className="card" style={{ marginBottom: 20 }}>
                    <div className="ch">
                      <div>
                        <div className="ch-title">{ayLabel(ay)}</div>
                        <div className="ch-sub">
                          {dateRange && <span style={{ marginRight: 10 }}>📆 {dateRange}</span>}
                          {records.length} closure window{records.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    <div className="cb" style={{ padding: "16px 20px" }}>
                      {records.length === 0 ? (
                        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "8px 4px" }}>
                          No closure windows set for this year.
                        </div>
                      ) : records.map((cd, idx) => {
                        const cdId = cd.closureDateId || cd.id;
                        const ws   = getWindowStatus(cd);

                        /* left-border color per status */
                        const borderColor = ws.cls === "b-green" ? "var(--success)"
                          : ws.cls === "b-warn" ? "#e07c1a"
                          : ws.cls === "b-red"  ? "var(--danger)"
                          : ws.cls === "b-draft" ? "var(--border-dark)"
                          : "var(--blue)";

                        return (
                          <div
                            key={cdId}
                            style={{
                              marginBottom: idx < records.length - 1 ? 16 : 0,
                              borderRadius: 10,
                              border: "1px solid var(--border)",
                              borderLeft: `4px solid ${borderColor}`,
                              overflow: "hidden",
                            }}
                          >
                            {/* ── Window header ── */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--sky)", borderBottom: "1px solid var(--border)" }}>
                              <span className={`badge ${ws.cls}`} style={{ fontSize: 12.5 }}>
                                {ws.icon} {ws.label}
                              </span>
                              <button
                                className={cd.isActive ? "btn btn-outline btn-sm" : "btn btn-navy btn-sm"}
                                onClick={() => handleToggleStatus(cdId, cd.isActive)}
                                disabled={saving}
                                style={{ fontSize: 12, padding: "5px 12px" }}
                              >
                                {cd.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>

                            {/* ── Date timeline ── */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 0, padding: "14px 20px", background: "#fff" }}>
                              {/* Initial closure */}
                              <div>
                                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-muted)", marginBottom: 4 }}>
                                  📌 Initial Closure
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>
                                  {fmtDate(cd.initialClosureDate)}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                  No new submissions after this
                                </div>
                              </div>

                              {/* Arrow divider */}
                              <div style={{ textAlign: "center", padding: "0 16px", color: "var(--border-dark)", fontSize: 20, fontWeight: 300 }}>→</div>

                              {/* Final closure */}
                              <div>
                                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-muted)", marginBottom: 4 }}>
                                  🔒 Final Closure
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>
                                  {fmtDate(cd.finalClosureDate)}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                  No edits allowed after this
                                </div>
                              </div>
                            </div>

                            {/* ── Edit section ── */}
                            <div style={{ padding: "14px 20px", background: "var(--paper)", borderTop: "1px solid var(--border)" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-muted)", marginBottom: 10 }}>
                                Update Dates
                              </div>
                              <div className="date-pair" style={{ marginBottom: 12 }}>
                                <div className="fgroup" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: 12 }}>Initial Closure Date</label>
                                  <input
                                    type="datetime-local"
                                    value={edits[cdId]?.initialClosureDate || ""}
                                    onChange={(e) => setEdits((prev) => ({ ...prev, [cdId]: { ...prev[cdId], initialClosureDate: e.target.value } }))}
                                  />
                                </div>
                                <div className="fgroup" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: 12 }}>Final Closure Date</label>
                                  <input
                                    type="datetime-local"
                                    value={edits[cdId]?.finalClosureDate || ""}
                                    onChange={(e) => setEdits((prev) => ({ ...prev, [cdId]: { ...prev[cdId], finalClosureDate: e.target.value } }))}
                                  />
                                </div>
                              </div>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveClosure(cdId)}
                                disabled={saving}
                              >
                                {saving ? "Saving…" : "💾 Save Changes"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Add new closure window ── */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="ch">
                  <div>
                    <div className="ch-title">Add Closure Window</div>
                    <div className="ch-sub">Attach a closure window to an existing academic year.</div>
                  </div>
                </div>
                <div className="cb">
                  <div className="fgroup">
                    <label>Academic Year *</label>
                    <select
                      value={newClosure.academicYearId}
                      onChange={(e) => setNewClosure((p) => ({ ...p, academicYearId: e.target.value }))}
                    >
                      <option value="">— Select academic year —</option>
                      {academicYears.map((ay) => (
                        <option key={ay.academicYearId} value={ay.academicYearId}>
                          {ayLabel(ay)} {ay.startDate ? `(${fmtDateShort(ay.startDate)} – ${fmtDateShort(ay.endDate) || "?"})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="date-pair">
                    <div className="fgroup">
                      <label>Initial Closure Date</label>
                      <input type="datetime-local" value={newClosure.initialClosureDate} onChange={(e) => setNewClosure((p) => ({ ...p, initialClosureDate: e.target.value }))} />
                    </div>
                    <div className="fgroup">
                      <label>Final Closure Date</label>
                      <input type="datetime-local" value={newClosure.finalClosureDate} onChange={(e) => setNewClosure((p) => ({ ...p, finalClosureDate: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <input type="checkbox" id="new-cd-active" checked={newClosure.isActive} onChange={(e) => setNewClosure((p) => ({ ...p, isActive: e.target.checked }))} style={{ accentColor: "var(--blue)", width: 16, height: 16 }} />
                    <label htmlFor="new-cd-active" style={{ fontSize: 14, color: "var(--text-mid)", cursor: "pointer" }}>Activate immediately</label>
                  </div>
                  <button className="btn btn-navy" onClick={handleCreateClosure} disabled={saving}>
                    {saving ? "Creating…" : "+ Add Closure Window"}
                  </button>
                </div>
              </div>

              {/* ── Create new academic year ── */}
              <div className="card">
                <div className="ch">
                  <div>
                    <div className="ch-title">Create Academic Year</div>
                    <div className="ch-sub">Define the start and end dates for a new academic year.</div>
                  </div>
                </div>
                <div className="cb">
                  <div className="date-pair">
                    <div className="fgroup">
                      <label>Start Date *</label>
                      <input type="datetime-local" value={newYear.startDate} onChange={(e) => setNewYear((p) => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div className="fgroup">
                      <label>End Date *</label>
                      <input type="datetime-local" value={newYear.endDate} onChange={(e) => setNewYear((p) => ({ ...p, endDate: e.target.value }))} />
                    </div>
                  </div>

                  {/* T&C single checkbox */}
                  <div className="fgroup">
                    <label>Terms &amp; Conditions *</label>
                    {terms.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>No T&amp;C version found.</div>
                    ) : (() => {
                      const t       = terms[0];
                      const tId     = t.termsConditionsVerId;
                      const checked = newYear.termsConditionsVerId === tId;
                      return (
                        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 8, marginTop: 6, border: `1.5px solid ${checked ? "var(--blue)" : "var(--border)"}`, background: checked ? "var(--sky)" : "#fff", cursor: "pointer", transition: "all .15s" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setNewYear((p) => ({ ...p, termsConditionsVerId: checked ? "" : tId }))}
                            style={{ accentColor: "var(--blue)", width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--navy)" }}>
                              {t.content || `Terms & Conditions Version 1`}
                            </div>
                          </div>
                        </label>
                      );
                    })()}
                  </div>

                  <button className="btn btn-navy" onClick={handleCreateYear} disabled={saving}>
                    {saving ? "Creating…" : "+ Create Academic Year"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
