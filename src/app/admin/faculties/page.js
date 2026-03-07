"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { listFaculties, createFaculty, updateFaculty } from "@/lib/services/faculties";
import { getAccessToken, getUser } from "@/lib/api";

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
        { icon: "📅", label: "Closure Dates", href: "/admin/closure" },
        { icon: "👤", label: "Users",         href: "/admin/users" },
        { icon: "🏫", label: "Faculties",     href: "/admin/faculties", active: true },
      ],
    },
  ],
};

export default function FacultiesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);

  const [faculties,      setFaculties]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");
  const [saving,         setSaving]         = useState(false);
  const [newFacultyName, setNewFacultyName] = useState("");

  /* edit modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFaculty,   setEditFaculty]   = useState(null);
  const [editName,      setEditName]      = useState("");

  useEffect(() => {
    if (!getAccessToken()) { router.push("/admin/login"); return; }
    setCurrentUser(getUser());
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listFaculties();
      if (res.success && Array.isArray(res.data)) setFaculties(res.data);
      else setError(res.message || "Failed to load faculties.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newFacultyName.trim()) { setError("Faculty name is required."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await createFaculty(newFacultyName.trim());
      if (!res.success) throw new Error(res.message || "Create failed.");
      setNewFacultyName("");
      setSuccess("Faculty created successfully.");
      fetchFaculties();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (fac) => {
    setEditFaculty(fac);
    setEditName(fac.facultyName);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editName.trim()) { setError("Faculty name is required."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await updateFaculty(editFaculty.facultyId || editFaculty.id, editName.trim());
      if (!res.success) throw new Error(res.message || "Update failed.");
      setShowEditModal(false);
      setSuccess("Faculty updated successfully.");
      fetchFaculties();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const avatarInfo = currentUser
    ? { initial: (currentUser.username || "A")[0].toUpperCase(), name: currentUser.username || "Admin", role: currentUser.roleName || currentUser.role || "Admin" }
    : { initial: "A", name: "Admin", role: "Administrator" };

  return (
    <>
      <Topbar
        userInfo="<strong>Admin</strong> · Faculty Management"
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
              <div className="pg-title">Manage Faculties</div>
              <div className="pg-sub">Create and update the university faculties available on the platform.</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={fetchFaculties} disabled={loading}>
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

          {/* ── Faculties table card ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch">
              <div>
                <div className="ch-title">All Faculties</div>
                <div className="ch-sub">{loading ? "Loading…" : `${faculties.length} facult${faculties.length === 1 ? "y" : "ies"} registered`}</div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
                Loading faculties…
              </div>
            ) : faculties.length === 0 ? (
              <div className="cb">
                <div className="alert warn" style={{ margin: 0 }}>
                  <span className="alert-icon">🏫</span>
                  <div>No faculties found. Add one below to get started.</div>
                </div>
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Faculty Name</th>
                      <th>Faculty ID</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculties.map((fac, i) => (
                      <tr key={fac.facultyId || fac.id || i}>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{i + 1}</td>
                        <td><strong>{fac.facultyName}</strong></td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {fac.facultyId || fac.id}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="adm-btn-icon" onClick={() => openEdit(fac)} title="Edit faculty">
                            ✏️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="adm-table-footer">
                  <div>{faculties.length} facult{faculties.length === 1 ? "y" : "ies"}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Create faculty card ── */}
          <div className="card">
            <div className="ch">
              <div>
                <div className="ch-title">Add New Faculty</div>
                <div className="ch-sub">Enter a name to register a new faculty on the platform.</div>
              </div>
            </div>
            <div className="cb">
              <div className="fgroup">
                <label>Faculty Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Faculty of Computing"
                  value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  disabled={saving}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-navy" onClick={handleCreate} disabled={saving || !newFacultyName.trim()}>
                  {saving ? "Creating…" : "+ Add Faculty"}
                </button>
                {newFacultyName && (
                  <button className="btn btn-outline" onClick={() => setNewFacultyName("")} disabled={saving}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* ── Edit Faculty Modal ── */}
      {showEditModal && editFaculty && (
        <div
          className="adm-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div className="adm-modal-card" style={{ maxWidth: 420 }}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">Edit Faculty</div>
              <button className="adm-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label>Faculty ID</label>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", padding: "6px 0" }}>
                  {editFaculty.facultyId || editFaculty.id}
                </div>
              </div>
              <div className="adm-field">
                <label>Faculty Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                  autoFocus
                  disabled={saving}
                />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-navy" onClick={handleUpdate} disabled={saving || !editName.trim()}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
