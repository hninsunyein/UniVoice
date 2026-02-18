import Link from "next/link";
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
      title: "Management",
      items: [
        { icon: "📊", label: "Reports", href: "/admin" },
        { icon: "📅", label: "Closure Dates", href: "/admin/closure", active: true },
        { icon: "👤", label: "Users", href: "/admin/users" },
        { icon: "🏫", label: "Faculties", href: "/admin/faculties" },
      ],
    },
  ],
};

export default function ClosureDatesPage() {
  return (
    <>
      <Topbar
        userInfo="<strong>Admin</strong> · Closure Date Management"
        backTo="/admin"
        backLabel="← Back to Reports"
      />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="pg-header">
            <div className="pg-title">Manage Closure Dates</div>
            <div className="pg-sub">Set submission and final closure dates per academic year. These control when students can submit and edit contributions.</div>
          </div>

          <div className="alert info">
            <span className="alert-icon">📅</span>
            <div><strong>Closure Date:</strong> Students cannot submit new contributions after this date. <strong>Final Closure Date:</strong> Students and coordinators cannot make any edits after this date.</div>
          </div>

          {/* Active year */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch">
              <div>
                <div className="ch-title">Academic Year 2025/26</div>
                <div className="ch-sub">Current active year</div>
              </div>
              <span className="badge b-green">Active</span>
            </div>
            <div className="cb">
              <div className="date-pair">
                <div className="fgroup">
                  <label>Closure Date (No New Submissions After)</label>
                  <input type="datetime-local" defaultValue="2026-02-22T23:59" />
                </div>
                <div className="fgroup">
                  <label>Final Closure Date (No Edits After)</label>
                  <input type="datetime-local" defaultValue="2026-03-15T23:59" />
                </div>
              </div>
              <div className="alert warn" style={{ marginTop: 4 }}>
                <span className="alert-icon">⚠️</span>
                <div>Changing closure dates will affect all students and coordinators. An email notification will be sent to all users.</div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button className="btn btn-primary">💾 Save Changes</button>
                <button className="btn btn-outline">Cancel</button>
              </div>
            </div>
          </div>

          {/* Past year */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch">
              <div>
                <div className="ch-title">Academic Year 2024/25</div>
                <div className="ch-sub">Closed — archive only</div>
              </div>
              <span className="badge b-draft">Closed</span>
            </div>
            <div className="cb">
              <div className="date-pair">
                <div className="fgroup">
                  <label>Closure Date</label>
                  <input type="datetime-local" defaultValue="2025-02-20T23:59" disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="fgroup">
                  <label>Final Closure Date</label>
                  <input type="datetime-local" defaultValue="2025-03-14T23:59" disabled style={{ opacity: 0.6 }} />
                </div>
              </div>
            </div>
          </div>

          {/* New year */}
          <div className="card">
            <div className="ch"><div className="ch-title">+ Create New Academic Year</div></div>
            <div className="cb">
              <div className="frow3">
                <div className="fgroup">
                  <label>Year Label</label>
                  <input type="text" placeholder="e.g. 2026/27" />
                </div>
                <div className="fgroup">
                  <label>Closure Date</label>
                  <input type="datetime-local" />
                </div>
                <div className="fgroup">
                  <label>Final Closure Date</label>
                  <input type="datetime-local" />
                </div>
              </div>
              <button className="btn btn-navy">+ Create Academic Year</button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
