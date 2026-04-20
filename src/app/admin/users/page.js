"use client";
import { useState, useEffect, useCallback } from "react";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import PasswordInput from "@/components/PasswordInput";
import {
  listUsers, createUser, updateUser,
  setUserStatus, setUserPassword,
  deleteUser, unlockUser, getUser as fetchUserById,
  getGuestLogins,
} from "@/lib/services/users";
import { listFaculties } from "@/lib/services/faculties";
import { listTerms } from "@/lib/services/terms";
import { getUser as getLocalUser, getAccessToken } from "@/lib/api";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { useRouter } from "next/navigation";

const ROLES = [
  { label: "Student",           value: "STUDENT" },
  { label: "Coordinator",       value: "MARKETING_COORDINATOR" },
  { label: "Marketing Manager", value: "MARKETING_MANAGER" },
  { label: "Guest",             value: "GUEST" },
  { label: "Admin",             value: "ADMIN" },
];

const sidebarConfig = {
  profile: {
    initial: "A", name: "Admin",
    subtitle: "System Administrator", role: "Admin",
    avatarStyle: { background: "linear-gradient(135deg,#1a3a6a,#2a5fa8)" },
  },
  sections: [
    { title: "Reports", items: [{ icon: "📊", label: "Statistics", href: "/admin" }] },
    {
      title: "Management",
      items: [
        { icon: "📅", label: "Closure Dates", href: "/admin/closure" },
        { icon: "👤", label: "Users",         href: "/admin/users", active: true },
        { icon: "🏫", label: "Faculties",     href: "/admin/faculties" },
      ],
    },
  ],
};

const EMPTY_FORM = { username: "", email: "", password: "", roleName: "STUDENT", facultyId: "" };
const PAGE_SIZE = 20;

export default function UsersPage() {
  const router = useRouter();
  useSessionGuard("/admin/login", ["SUPER_ADMIN", "ADMIN"]);
  const [currentUser, setCurrentUser] = useState(null);

  /* ── data ── */
  const [users,      setUsers]      = useState([]);
  const [faculties,  setFaculties]  = useState([]);
  const [terms,      setTerms]      = useState([]);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  /* ── tabs ── */
  const [activeTab,  setActiveTab]  = useState("users");

  /* ── guest accounts ── */
  const [guestUsers,   setGuestUsers]   = useState([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestSearch,  setGuestSearch]  = useState("");

  /* ── search / filter ── */
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  /* ── ui ── */
  const [loading,     setLoading]     = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [apiError,    setApiError]    = useState("");
  const [success,     setSuccess]     = useState("");
  const [saving,      setSaving]      = useState(false);

  /* ── modals ── */
  const [showCreateModal,   setShowCreateModal]   = useState(false);
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showResetAlert,    setShowResetAlert]    = useState(false);
  const [showResetSuccess,  setShowResetSuccess]  = useState(false);
  const [showDeleteAlert,   setShowDeleteAlert]   = useState(false);
  const [showUnlockAlert,   setShowUnlockAlert]   = useState(false);
  const [editUser,          setEditUser]          = useState(null);

  /* ── forms ── */
  const [createForm,  setCreateForm]  = useState(EMPTY_FORM);
  const [editForm,    setEditForm]    = useState({});
  const [formError,   setFormError]   = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError,      setResetError]      = useState("");

  /* ─────────── mount ─────────── */
  useEffect(() => {
    if (!getAccessToken()) { router.push("/admin/login"); return; }
    setCurrentUser(getLocalUser());
    Promise.all([listFaculties(), listTerms()]).then(([fRes, tRes]) => {
      if (fRes.success && Array.isArray(fRes.data)) setFaculties(fRes.data);
      if (tRes.success && Array.isArray(tRes.data)) setTerms(tRes.data);
    }).catch(() => {});
  }, []);

  /* ─────────── fetch users ─────────── */
  const fetchUsers = useCallback(async (pg = page, role = roleFilter, q = search) => {
    setLoading(true);
    setApiError("");
    try {
      const params = { page: pg, pageSize: PAGE_SIZE };
      if (role) params.role   = role;
      if (q)    params.search = q;
      const res = await listUsers(params);
      if (res.status === 403) {
        setLoading(false);
        router.replace("/admin/login");
        return;
      }
      if (res.success) {
        const raw = res.data;
        const list =
          Array.isArray(raw?.users)   ? raw.users   :
          Array.isArray(raw?.items)   ? raw.items   :
          Array.isArray(raw?.content) ? raw.content :
          Array.isArray(raw?.list)    ? raw.list    :
          Array.isArray(raw?.result)  ? raw.result  :
          Array.isArray(raw)          ? raw         : [];
        setUsers(list);
        const meta = raw?.pagination ?? raw?.meta ?? raw ?? {};
        setTotalPages(meta.totalPages ?? raw?.totalPages ?? 1);
        setTotalCount(meta.totalCount ?? meta.total ?? raw?.totalCount ?? raw?.total ?? list.length);
      } else {
        setApiError(res.message || "Failed to load users.");
      }
    } catch (err) {
      setApiError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => { fetchUsers(page, roleFilter, search); }, [page, roleFilter]);

  /* ─────────── fetch guests ─────────────────────────────────────
   * Uses GET /api/users/guest-logins
   * Response: { data: { items: [...], total, page, totalPages } }
   * Each item: { guestFacultyLoginId, email, createdAt, faculty, user }
   * ──────────────────────────────────────────────────────────── */
  const fetchGuests = useCallback(async (q = guestSearch) => {
    setGuestLoading(true);
    try {
      const params = { page: 1, pageSize: 100 };
      if (q) params.search = q;
      const res = await getGuestLogins(params);
      if (res?.success) {
        const items = res.data?.items ?? res.data?.data ?? [];
        const normalised = items.map(r => ({
          id:        r.guestFacultyLoginId || r.user?.userId,
          userId:    r.user?.userId,
          username:  r.user?.username,
          email:     r.email || r.user?.email,
          isActive:  r.user?.isActive ?? true,
          createdAt: r.createdAt,
          faculty:   r.faculty || null,
          facultyId: r.faculty?.facultyId || null,
          _raw:      r,
        }));
        setGuestUsers(normalised);
      } else {
        setGuestUsers([]);
      }
    } catch {
      setGuestUsers([]);
    } finally {
      setGuestLoading(false);
    }
  }, [guestSearch]);

  useEffect(() => { fetchGuests(); }, []);  // load badge count on mount
  useEffect(() => { if (activeTab === "guests") fetchGuests(); }, [activeTab]);

  /* ─────────── search / filter ─────────── */
  const handleSearch    = () => { setPage(1); fetchUsers(1, roleFilter, search); };
  const handleRoleFilter = (v) => { setRoleFilter(v); setPage(1); };

  /* ─────────── helpers ─────────── */
  const uid = (u) => u?.id ?? u?.userId ?? u?.user_id ?? u?.accountId ?? u?._id ?? u?.uid;

  const buildForm = (u) => {
    const roleName = (
      u.roleName ||
      u.role?.roleName ||
      u.role?.name ||
      u.role ||
      "STUDENT"
    ).toUpperCase();

    const facultyId =
      u.facultyId ||
      u.faculty?.facultyId ||
      u.facultyDetails?.facultyId ||
      "";

    return {
      username:  u.username || u.name || "",
      email:     u.email    || "",
      roleName,
      facultyId,
      isActive:  u.isActive ?? true,
    };
  };

  /* ─────────── edit open ─────────── */
  const openEdit = async (user) => {
    setEditUser(user);
    setEditForm(buildForm(user));
    setFormError("");
    setEditLoading(true);
    setShowEditModal(true);
    try {
      const res = await fetchUserById(uid(user));
      if (res.success && res.data) {
        setEditUser(res.data);
        setEditForm(buildForm(res.data));
      } else if (!res.success) {
        setFormError(res.message || "Could not load full user details.");
      }
    } catch {
      setFormError("Network error — showing partial data.");
    } finally {
      setEditLoading(false);
    }
  };

  /* ─────────── notify ─────────── */
  const notify = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); };

  /* ─────────── CREATE ─────────── */
  const FACULTY_REQUIRED_ROLES = ["STUDENT", "MARKETING_COORDINATOR", "GUEST"];

  const handleCreate = async () => {
    setFormError("");
    const isGuest = createForm.roleName === "GUEST";

    // Validation
    if (!createForm.username.trim()) { setFormError("Full name is required."); return; }
    if (!createForm.email.trim())    { setFormError("Email is required."); return; }
    if (!createForm.roleName)        { setFormError("User role is required."); return; }
    if (!isGuest && !createForm.password) { setFormError("Initial password is required."); return; }
    if (FACULTY_REQUIRED_ROLES.includes(createForm.roleName) && !createForm.facultyId) {
      setFormError("Faculty is required for this role.");
      return;
    }

    setSaving(true);
    try {
      let res;
      {
        const payload = {
          username: createForm.username.trim(),
          email:    createForm.email.trim(),
          roleName: createForm.roleName,
        };
        payload.password = isGuest
          ? (() => {
              const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
              const lower = "abcdefghijklmnopqrstuvwxyz";
              const digit = "0123456789";
              const rand  = (s) => s[Math.floor(Math.random() * s.length)];
              const rest  = Array.from({ length: 5 }, () => rand(upper + lower + digit)).join("");
              return rand(upper) + rand(lower) + rand(digit) + rest;
            })()
          : createForm.password;
        if (createForm.facultyId) payload.facultyId = createForm.facultyId;
        if (createForm.roleName === "STUDENT" && terms.length > 0) {
          payload.termsConditionsVerId = terms[0].termsConditionsVerId;
        }
        res = await createUser(payload);
      }

      if (!res.success) throw new Error(res.message || "Create failed.");
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);

      if (createForm.roleName === "GUEST") {
        notify("Guest account created successfully.");
        setActiveTab("guests");
        fetchGuests();
      } else {
        notify("User created successfully.");
        fetchUsers(1, roleFilter, search);
        setPage(1);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────── UPDATE ─────────── */
  const handleUpdate = async () => {
    setFormError("");
    setSaving(true);
    try {
      const res = await updateUser(uid(editUser), {
        username: editForm.username,
        email:    editForm.email,
        roleName: editForm.roleName,
        ...(editForm.facultyId ? { facultyId: editForm.facultyId } : {}),
      });
      if (!res.success) throw new Error(res.message || "Update failed.");
      setShowEditModal(false);
      notify("User updated successfully.");
      fetchUsers(page, roleFilter, search);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────── TOGGLE STATUS (immediate) ─────────── */
  const handleToggleStatus = async (checked) => {
    setEditForm(p => ({ ...p, isActive: checked }));
    try {
      const res = await setUserStatus(uid(editUser), checked);
      if (!res.success) throw new Error(res.message || "Status update failed.");
      setEditUser(p => ({ ...p, isActive: checked }));
      notify(checked ? "Account activated." : "Account deactivated.");
      fetchUsers(page, roleFilter, search);
    } catch (err) {
      setEditForm(p => ({ ...p, isActive: !checked }));
      setFormError(err.message);
    }
  };

  /* ─────────── RESET PASSWORD ─────────── */
  const handleResetPassword = async () => {
    setResetError("");
    if (!newPassword.trim()) { setResetError("Please enter a new password."); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match."); return; }
    setSaving(true);
    try {
      const res = await setUserPassword(uid(editUser), newPassword, confirmPassword);
      if (!res.success) throw new Error(res.message || "Reset failed.");
      setShowResetAlert(false);
      setNewPassword("");
      setConfirmPassword("");
      setShowResetSuccess(true);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────── UNLOCK ─────────── */
  const handleUnlock = async () => {
    setSaving(true);
    try {
      const res = await unlockUser(uid(editUser));
      if (!res.success) throw new Error(res.message || "Unlock failed.");
      setShowUnlockAlert(false);
      setShowEditModal(false);
      notify("User account unlocked.");
      fetchUsers(page, roleFilter, search);
    } catch (err) {
      setFormError(err.message);
      setShowUnlockAlert(false);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────── DELETE ─────────── */
  const handleDelete = async () => {
    setSaving(true);
    const isGuestUser = (
      (editUser?.roleName || editUser?.role?.roleName || editUser?.role?.name || editUser?.role || "")
        .toUpperCase() === "GUEST"
    );
    try {
      const res = await deleteUser(uid(editUser));
      if (!res.success) throw new Error(res.message || "Delete failed.");
      setShowDeleteAlert(false);
      setShowEditModal(false);
      notify("User deleted.");
      if (isGuestUser) { fetchGuests(); }
      else { fetchUsers(page, roleFilter, search); }
    } catch (err) {
      setApiError(err.message);
      setShowDeleteAlert(false);
    } finally {
      setSaving(false);
    }
  };

  const avatarInfo = currentUser
    ? { initial: (currentUser.username || "A")[0].toUpperCase(), name: currentUser.username || "Admin", role: "Admin" }
    : { initial: "A", name: "Admin", role: "Administrator" };

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <>
      <Topbar avatar={avatarInfo} backTo="/admin" backLabel="← Back to Reports" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">

          {/* Header */}
          <div className="pg-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="pg-title">User Management</div>
              <div className="pg-sub">{totalCount > 0 ? `${totalCount} total users` : "Manage all system users"}</div>
            </div>
            <button
              className="btn btn-navy"
              onClick={() => { setCreateForm(EMPTY_FORM); setFormError(""); setShowCreateModal(true); }}
            >
              + Create New User
            </button>
          </div>

          {/* Alerts */}
          {success && (
            <div className="alert succ" style={{ marginBottom: 16 }}>
              <span className="alert-icon">✅</span><div>{success}</div>
            </div>
          )}
          {apiError && (
            <div className="alert dang" style={{ marginBottom: 16 }}>
              <span className="alert-icon">⚠️</span><div>{apiError}</div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
            {[
              { key: "users",  label: "All Users" },
              { key: "guests", label: "👤 Guest Accounts", badge: guestUsers.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
                  fontSize: 13.5, fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? "var(--blue)" : "var(--text-muted)",
                  borderBottom: activeTab === tab.key ? "2px solid var(--blue)" : "2px solid transparent",
                  marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span style={{ background: "var(--blue)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── GUEST ACCOUNTS TABLE ── */}
          {activeTab === "guests" && (
            <>
              <div className="adm-table-header" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div className="adm-search-box">
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Search by name or email…"
                      value={guestSearch}
                      onChange={e => setGuestSearch(e.target.value)}
                    />
                  </div>
                  {guestSearch && (
                    <button className="btn btn-outline btn-sm" style={{ color: "var(--text-muted)" }} onClick={() => setGuestSearch("")}>Clear</button>
                  )}
                </div>
                <button className="btn btn-outline" onClick={fetchGuests} disabled={guestLoading}>↻ Refresh</button>
              </div>

              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Faculty</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ width: 80, textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestLoading ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading guest accounts…</td></tr>
                    ) : (() => {
                      const q = guestSearch.toLowerCase();
                      const filtered = guestUsers.filter(g => {
                        if (!q) return true;
                        const name  = (g.username || g.name || "").toLowerCase();
                        const email = (g.email || "").toLowerCase();
                        return name.includes(q) || email.includes(q);
                      });
                      return filtered.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                          {guestSearch ? "No guest accounts match your search." : "No guest accounts yet."}
                        </td></tr>
                      ) : filtered.map((g, i) => {
                        // Resolve faculty name: prefer joined object, fall back to
                        // looking up facultyId in the already-loaded faculties list
                        const facultyName =
                          g.faculty?.facultyName ||
                          g.facultyName ||
                          faculties.find(f => f.facultyId === g.facultyId)?.facultyName ||
                          "—";
                        return (
                        <tr key={g.id || g.userId || g.accountId || i}>
                          <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 13.5 }}>
                              {g.username || g.name || "—"}
                            </div>
                          </td>
                          <td style={{ color: "var(--text-mid)", fontSize: 13 }}>{g.email || "—"}</td>
                          <td style={{ fontSize: 13, color: "var(--text-mid)" }}>
                            {facultyName}
                          </td>
                          <td>
                            <span className={g.isActive !== false ? "adm-status-active" : "adm-status-inactive"}>
                              {g.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {g.createdAt
                              ? new Date(g.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="adm-btn-icon"
                              title="Delete"
                              style={{ color: "var(--danger, #b52a2a)" }}
                              onClick={() => { setEditUser(g); setShowDeleteAlert(true); }}
                            >🗑</button>
                          </td>
                        </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ALL USERS TABLE ── */}
          {activeTab === "users" && (
            <>
          {/* Search + Filter bar */}
          <div className="adm-table-header" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div className="adm-search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <button className="btn btn-outline" onClick={handleSearch} disabled={loading}>Search</button>
              <select
                value={roleFilter}
                onChange={e => handleRoleFilter(e.target.value)}
                style={{ border: "1.5px solid var(--border)", borderRadius: 7, padding: "8px 12px", fontFamily: "inherit", fontSize: 13, color: "var(--text)" }}
              >
                <option value="">All Roles</option>
                {ROLES.filter(r => r.value !== "GUEST").map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {(search || roleFilter) && (
                <button
                  className="btn btn-outline"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => { setSearch(""); setRoleFilter(""); setPage(1); fetchUsers(1, "", ""); }}
                >
                  Clear
                </button>
              )}
            </div>
            <button
              className="btn btn-outline"
              disabled={loading}
              onClick={() => fetchUsers(page, roleFilter, search)}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              ↻ Refresh
            </button>
          </div>

          {/* Table */}
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Faculty</th>
                  <th>Status</th>
                  <th style={{ width: 80, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      Loading users…
                    </td>
                  </tr>
                ) : (() => {
                  const nonGuests = users.filter(u => {
                    const r = (u.roleName || u.role?.roleName || u.role?.name || u.role || "").toUpperCase();
                    return r !== "GUEST";
                  });
                  if (nonGuests.length === 0) return (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        {search || roleFilter ? "No users match your search." : "No users found."}
                      </td>
                    </tr>
                  );
                  return nonGuests.map((u, i) => (
                  <tr key={uid(u) || i}>
                    <td>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--navy)" }}>
                        {u.username}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-mid)", fontSize: 13 }}>{u.email || "—"}</td>
                    <td>
                      {(() => {
                        const role = u.roleName || u.role?.roleName || u.role?.name || u.role || "";
                        const label = ROLES.find(r => r.value === role)?.label || role;
                        const bg =
                          role === "ADMIN"                 ? "#eef2ff" :
                          role === "STUDENT"               ? "#e6f7ef" :
                          role === "MARKETING_COORDINATOR" ? "#fff7e6" :
                          role === "MARKETING_MANAGER"     ? "#f0f4ff" :
                          role === "GUEST"                 ? "#fdf4e7" : "#f4f4f4";
                        const color =
                          role === "ADMIN"                 ? "#3730a3" :
                          role === "STUDENT"               ? "#0e7a55" :
                          role === "MARKETING_COORDINATOR" ? "#b45309" :
                          role === "MARKETING_MANAGER"     ? "#1a3a6a" :
                          role === "GUEST"                 ? "#92400e" : "#555";
                        return label ? (
                          <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: bg, color }}>
                            {label}
                          </span>
                        ) : "—";
                      })()}
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-mid)" }}>{u.faculty?.facultyName || u.facultyName || "—"}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className={u.isActive ? "adm-status-active" : "adm-status-inactive"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                        {u.isLocked && (
                          <span style={{ fontSize: 11, color: "#b52a2a", fontWeight: 600 }}>🔒 Locked</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button className="adm-btn-icon" title="Edit user" onClick={() => openEdit(u)}>✏️</button>
                        <button
                          className="adm-btn-icon"
                          title="Delete user"
                          style={{ color: "var(--danger, #b52a2a)" }}
                          onClick={() => { setEditUser(u); setShowDeleteAlert(true); }}
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                  ));
                })()}
              </tbody>
            </table>

            <div className="adm-table-footer">
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {(() => {
                const nonGuestCount = users.filter(u => (u.roleName || u.role?.roleName || u.role?.name || u.role || "").toUpperCase() !== "GUEST").length;
                return totalCount > 0
                  ? `Showing ${nonGuestCount} of ${totalCount} users`
                  : `${nonGuestCount} user${nonGuestCount !== 1 ? "s" : ""}`;
              })()}
              </div>
              {totalPages > 1 && (
                <div className="adm-pagination">
                  <button className="adm-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  {(() => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const end   = Math.min(totalPages, start + 4);
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                      <button key={p} className={`adm-page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                    ));
                  })()}
                  <button className="adm-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </div>
          </div>
          </>
          )}

        </main>
      </div>

      {/* ══════════════ CREATE MODAL ══════════════ */}
      {showCreateModal && (
        <div className="adm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="adm-modal-card">
            <div className="adm-modal-header">
              <div className="adm-modal-title">Create New User</div>
              <button className="adm-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              {formError && (
                <div className="alert dang" style={{ marginBottom: 14 }}>
                  <span className="alert-icon">⚠️</span><div>{formError}</div>
                </div>
              )}
              <div className="adm-field">
                <label>Full Name *</label>
                <input type="text" placeholder="e.g. Hnin Su Nyein" value={createForm.username}
                  onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label>Email *</label>
                <input type="email" placeholder="user@university.ac.uk" value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label>User Role *</label>
                <select value={createForm.roleName} onChange={e => {
                  const role = e.target.value;
                  setCreateForm(p => ({
                    ...p,
                    roleName: role,
                    facultyId: role === "MARKETING_MANAGER" ? "" : p.facultyId,
                  }));
                }}>
                  {ROLES.filter(r => r.value !== "ADMIN").map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {createForm.roleName !== "GUEST" && (
                <div className="adm-field">
                  <label>Initial Password *</label>
                  <PasswordInput
                    compact
                    placeholder="Temporary password"
                    value={createForm.password}
                    onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  />
                </div>
              )}
              {FACULTY_REQUIRED_ROLES.includes(createForm.roleName) && (
                <div className="adm-field">
                  <label>Faculty *</label>
                  <select value={createForm.facultyId} onChange={e => setCreateForm(p => ({ ...p, facultyId: e.target.value }))}>
                    <option value="">— Select faculty —</option>
                    {faculties.map(f => <option key={f.facultyId} value={f.facultyId}>{f.facultyName}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-navy" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating…" : createForm.roleName === "GUEST" ? "Create Guest Account" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ EDIT MODAL ══════════════ */}
      {showEditModal && editUser && (
        <div className="adm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="adm-modal-card" style={{ maxWidth: 480 }}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">Edit User</div>
              <button className="adm-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="adm-modal-body" style={{ position: "relative" }}>
              {editLoading && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(255,255,255,.75)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 10, borderRadius: 4,
                }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</span>
                </div>
              )}
              {formError && (
                <div className="alert dang" style={{ marginBottom: 14 }}>
                  <span className="alert-icon">⚠️</span><div>{formError}</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <div className="adm-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Full Name</label>
                  <input type="text" value={editForm.username || ""}
                    onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} />
                </div>
                <div className="adm-field" style={{ gridColumn: "1 / -1" }}>
                  <label>Email</label>
                  <input type="email" value={editForm.email || ""}
                    onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className={`adm-field${editForm.roleName === "MARKETING_MANAGER" ? "" : ""}`} style={{ gridColumn: editForm.roleName === "MARKETING_MANAGER" ? "1 / -1" : "" }}>
                  <label>Role</label>
                  <select value={editForm.roleName || ""} onChange={e => {
                    const role = e.target.value;
                    setEditForm(p => ({
                      ...p,
                      roleName: role,
                      facultyId: role === "MARKETING_MANAGER" ? "" : p.facultyId,
                    }));
                  }}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {editForm.roleName !== "MARKETING_MANAGER" && (
                  <div className="adm-field">
                    <label>Faculty</label>
                    <select value={editForm.facultyId || ""} onChange={e => setEditForm(p => ({ ...p, facultyId: e.target.value }))}>
                      <option value="">— None —</option>
                      {faculties.map(f => <option key={f.facultyId} value={f.facultyId}>{f.facultyName}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="adm-field">
                <label>Account Status</label>
                <div className="adm-toggle">
                  <input type="checkbox" id="edit-status" checked={!!editForm.isActive}
                    onChange={e => handleToggleStatus(e.target.checked)} />
                  <label htmlFor="edit-status">{editForm.isActive ? "Active" : "Inactive"}</label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                <button className="adm-reset-link" style={{ color: "var(--blue)" }}
                  onClick={() => { setResetError(""); setNewPassword(""); setConfirmPassword(""); setShowResetAlert(true); }}>
                  🔑 Reset Password
                </button>
                {editUser?.isLocked && (
                  <button className="adm-reset-link" style={{ color: "#e07c1a" }} onClick={() => setShowUnlockAlert(true)}>
                    🔓 Unlock Account
                  </button>
                )}
              </div>
            </div>

            <div className="adm-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)} disabled={saving || editLoading}>Cancel</button>
              <button className="btn btn-navy" onClick={handleUpdate} disabled={saving || editLoading}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ RESET PASSWORD MODAL ══════════════ */}
      {showResetAlert && (
        <div className="adm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowResetAlert(false); setNewPassword(""); setConfirmPassword(""); setResetError(""); } }}>
          <div className="adm-alert-dialog" style={{ width: 380 }}>
            <div className="adm-alert-title">Set New Password</div>
            <div className="adm-alert-text" style={{ marginBottom: 14 }}>
              Set a new password for <strong>{editUser?.username || editUser?.email}</strong>.
            </div>
            {resetError && (
              <div className="alert dang" style={{ marginBottom: 12, fontSize: 13 }}>
                <span className="alert-icon">⚠️</span><div>{resetError}</div>
              </div>
            )}
            <div className="adm-field">
              <label>New Password</label>
              <PasswordInput
                compact
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="adm-field">
              <label>Confirm Password</label>
              <PasswordInput
                compact
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleResetPassword()}
              />
            </div>
            <div className="adm-alert-footer">
              <button className="btn btn-outline" onClick={() => { setShowResetAlert(false); setNewPassword(""); setConfirmPassword(""); setResetError(""); }} disabled={saving}>Cancel</button>
              <button className="btn btn-navy" onClick={handleResetPassword} disabled={saving}>
                {saving ? "Saving…" : "Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ RESET PASSWORD SUCCESS ══════════════ */}
      {showResetSuccess && (
        <div className="adm-modal-overlay" onClick={() => setShowResetSuccess(false)}>
          <div className="adm-alert-dialog" style={{ width: 360, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, #e6f7ef, #c8f0d8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0e7a55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>
              Password Reset Successfully
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.5 }}>
              The password for <strong style={{ color: "var(--text)" }}>{editUser?.username || editUser?.email}</strong> has been updated.
              They can now log in with the new password.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ UNLOCK ALERT ══════════════ */}
      {showUnlockAlert && (
        <div className="adm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowUnlockAlert(false); }}>
          <div className="adm-alert-dialog">
            <div className="adm-alert-title">Unlock Account?</div>
            <div className="adm-alert-text">
              <strong>{editUser?.username || editUser?.email}</strong>&apos;s account is locked due to
              too many failed login attempts. Unlocking will restore access immediately.
            </div>
            <div className="adm-alert-footer">
              <button className="btn btn-outline" onClick={() => setShowUnlockAlert(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-navy" onClick={handleUnlock} disabled={saving}>
                {saving ? "Unlocking…" : "Unlock Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ DELETE ALERT ══════════════ */}
      {showDeleteAlert && (
        <div className="adm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteAlert(false); }}>
          <div className="adm-alert-dialog">
            <div className="adm-alert-title">Delete User?</div>
            <div className="adm-alert-text">
              This cannot be undone. <strong>{editUser?.username || editUser?.email}</strong> will be permanently removed.
            </div>
            <div className="adm-alert-footer">
              <button className="btn btn-outline" onClick={() => setShowDeleteAlert(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
