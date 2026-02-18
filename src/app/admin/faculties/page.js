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
        { icon: "👤", label: "Users", href: "/admin/users" },
        { icon: "🏫", label: "Faculties", href: "/admin/faculties", active: true },
      ],
    },
  ],
};

const facultiesData = [
  { name: "Computing", created: "2026-03-13 14:30:00", active: true },
  { name: "Mathematics", created: "2026-01-02 09:00:00", active: false },
  { name: "Engineering", created: "2025-09-01 08:00:00", active: true },
  { name: "Science", created: "2025-09-01 08:00:00", active: true },
  { name: "Business", created: "2025-09-01 08:00:00", active: true },
  { name: "Arts & Humanities", created: "2025-09-01 08:00:00", active: true },
  { name: "Education", created: "2025-09-01 08:00:00", active: true },
];

export default function FacultiesPage() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFacultyName, setEditFacultyName] = useState("");
  const [newFacultyName, setNewFacultyName] = useState("");

  const openEdit = (name) => {
    setEditFacultyName(name);
    setShowEditModal(true);
  };

  return (
    <>
      <Topbar userInfo="<strong>Admin</strong> · Faculty Management" backTo="/admin" backLabel="← Back to Reports" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="adm-breadcrumb">Admin / Faculty</div>
          <div className="pg-header">
            <div className="pg-title">Faculty</div>
          </div>

          {/* Inline create */}
          <div className="adm-inline-create">
            <input
              type="text"
              placeholder="Enter new faculty name"
              value={newFacultyName}
              onChange={(e) => setNewFacultyName(e.target.value)}
            />
            <button className="btn btn-outline" onClick={() => setNewFacultyName("")}>Cancel</button>
            <button className="btn btn-navy">Create</button>
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Faculty</th>
                  <th>Created date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {facultiesData.map((fac, i) => (
                  <tr key={i}>
                    <td><strong>{fac.name}</strong></td>
                    <td>{fac.created}</td>
                    <td>
                      <div className="adm-toggle">
                        <input type="checkbox" defaultChecked={fac.active} id={`fac-toggle-${i}`} />
                      </div>
                    </td>
                    <td><button className="adm-btn-icon" onClick={() => openEdit(fac.name)}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="adm-table-footer">
              <div>Rows per page: 10</div>
              <div>Page 1 of 7</div>
              <div className="adm-pagination">
                <button className="adm-page-btn">‹</button>
                <button className="adm-page-btn active">1</button>
                <button className="adm-page-btn">›</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* EDIT FACULTY MODAL */}
      {showEditModal && (
        <div className="adm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="adm-modal-card" style={{ maxWidth: 380 }}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">Edit faculty</div>
              <button className="adm-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label>Faculty</label>
                <input
                  type="text"
                  value={editFacultyName}
                  onChange={(e) => setEditFacultyName(e.target.value)}
                />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-navy" onClick={() => setShowEditModal(false)}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
