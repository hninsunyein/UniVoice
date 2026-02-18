"use client";
import { useState } from "react";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

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
        { icon: "📊", label: "Statistics", href: "/admin" },
      ],
    },
    {
      title: "Management",
      items: [
        { icon: "📅", label: "Closure Dates", href: "/admin/closure" },
        { icon: "👤", label: "Users", href: "/admin/users", active: true },
        { icon: "🏫", label: "Faculties", href: "/admin/faculties" },
      ],
    },
  ],
};

const usersData = [
  { name: "Pedro Duarte", email: "Pedro@gmail.com", role: "Student", faculty: "Engineering", active: true },
  { name: "Jane Smith", email: "jane@university.ac.uk", role: "Coordinator", faculty: "Science", active: true },
  { name: "Dr. Sarah Lwin", email: "sarah@university.ac.uk", role: "Coordinator", faculty: "Engineering", active: true },
  { name: "James Taylor", email: "james@university.ac.uk", role: "Marketing Manager", faculty: "All Faculties", active: true },
  { name: "Ko Aung Kyaw", email: "aung@university.ac.uk", role: "Student", faculty: "Engineering", active: false },
  { name: "Ma Su Su", email: "susu@university.ac.uk", role: "Student", faculty: "Science", active: true },
];

export default function UsersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const openEdit = (user) => {
    setEditUser(user);
    setShowEditModal(true);
  };

  const openResetPassword = () => {
    setShowEditModal(false);
    setShowResetAlert(true);
  };

  return (
    <>
      <Topbar userInfo="<strong>Admin</strong> · User Management" backTo="/admin" backLabel="← Back to Reports" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="adm-breadcrumb">Admin / Users</div>

          <div className="adm-table-header">
            <div></div>
            <button className="btn btn-navy" onClick={() => setShowCreateModal(true)}>+ Create new user</button>
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Faculty</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usersData.map((user, i) => (
                  <tr key={i}>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.faculty}</td>
                    <td>
                      <span className={user.active ? "adm-status-active" : "adm-status-inactive"}>
                        ● {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td><button className="adm-btn-icon" onClick={() => openEdit(user)}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="adm-table-footer">
              <div>Page 1 of 7</div>
              <div className="adm-pagination">
                <button className="adm-page-btn">‹</button>
                <button className="adm-page-btn active">1</button>
                <button className="adm-page-btn">2</button>
                <button className="adm-page-btn">3</button>
                <button className="adm-page-btn">›</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="adm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="adm-modal-card">
            <div className="adm-modal-header">
              <div className="adm-modal-title">Create new user</div>
              <button className="adm-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label>Name</label>
                <div className="adm-field-avatar">
                  <div className="adm-avatar-preview">
                    PD
                    <div className="adm-avatar-edit">✏️</div>
                  </div>
                  <input type="text" defaultValue="Pedro Duarte" style={{ flex: 1 }} />
                </div>
              </div>
              <div className="adm-field">
                <label>Email</label>
                <input type="email" defaultValue="Pedro@gmail.com" />
              </div>
              <div className="adm-field">
                <label>User Role</label>
                <select defaultValue="">
                  <option value="" disabled>Choose user role</option>
                  <option>Student</option>
                  <option>Coordinator</option>
                  <option>Marketing Manager</option>
                  <option>Administrator</option>
                </select>
              </div>
              <div className="adm-field">
                <label>Faculty</label>
                <select defaultValue="">
                  <option value="" disabled>Choose faculty</option>
                  <option>Engineering</option>
                  <option>Science</option>
                  <option>Business</option>
                  <option>Arts &amp; Humanities</option>
                </select>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-navy" onClick={() => setShowCreateModal(false)}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editUser && (
        <div className="adm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="adm-modal-card">
            <div className="adm-modal-header">
              <div className="adm-modal-title">Edit user</div>
              <button className="adm-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label>Name</label>
                <div className="adm-field-avatar">
                  <div className="adm-avatar-preview">
                    {editUser.name.split(" ").map(n => n[0]).join("")}
                    <div className="adm-avatar-edit">✏️</div>
                  </div>
                  <input type="text" defaultValue={editUser.name} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="adm-field">
                <label>Email</label>
                <input type="email" defaultValue={editUser.email} />
              </div>
              <div className="adm-field">
                <label>User Role</label>
                <select defaultValue={editUser.role}>
                  <option disabled>Choose user role</option>
                  <option>Student</option>
                  <option>Coordinator</option>
                  <option>Marketing Manager</option>
                  <option>Administrator</option>
                </select>
              </div>
              <div className="adm-field">
                <label>Faculty</label>
                <select defaultValue={editUser.faculty}>
                  <option disabled>Choose faculty</option>
                  <option>Engineering</option>
                  <option>Science</option>
                  <option>Business</option>
                  <option>Arts &amp; Humanities</option>
                </select>
              </div>
              <div className="adm-field">
                <label>User status</label>
                <div className="adm-toggle">
                  <input type="checkbox" id="user-status" defaultChecked={editUser.active} />
                  <label htmlFor="user-status">{editUser.active ? "Active" : "Inactive"}</label>
                </div>
              </div>
              <div className="adm-field">
                <button className="adm-reset-link" onClick={openResetPassword}>Reset User&apos;s Password</button>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-navy" onClick={() => setShowEditModal(false)}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD ALERT */}
      {showResetAlert && (
        <div className="adm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowResetAlert(false); }}>
          <div className="adm-alert-dialog">
            <div className="adm-alert-title">Are you absolutely sure?</div>
            <div className="adm-alert-text">This action cannot be undone. This will reset User&apos;s password.</div>
            <div className="adm-alert-footer">
              <button className="btn btn-outline" onClick={() => setShowResetAlert(false)}>Cancel</button>
              <button className="btn btn-navy" onClick={() => setShowResetAlert(false)}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
