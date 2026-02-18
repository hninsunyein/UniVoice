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
      title: "Reports",
      items: [
        { icon: "📊", label: "Statistics", href: "/admin", active: true },
        { icon: "⚠️", label: "Exception Reports", href: "#", badge: "14" },
        { icon: "👁", label: "Page Views", href: "#" },
        { icon: "🌐", label: "Browser Usage", href: "#" },
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

export default function AdminPage() {
  return (
    <>
      <Topbar userInfo="<strong>System Administrator</strong> · All Faculties" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="pg-header">
            <div className="pg-title">System Reports &amp; Analytics</div>
            <div className="pg-sub">Academic Year 2025/26 · Updated: 17 Feb 2026 09:00</div>
          </div>

          <div className="stats">
            <div className="stat"><div className="stat-n">247</div><div className="stat-l">Total Contributions</div></div>
            <div className="stat green"><div className="stat-n">89</div><div className="stat-l">Selected</div></div>
            <div className="stat"><div className="stat-n">1,204</div><div className="stat-l">Page Views Today</div></div>
            <div className="stat red"><div className="stat-n">14</div><div className="stat-l">Overdue Comments</div></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
            {/* Bar chart */}
            <div className="card">
              <div className="ch"><div className="ch-title">Contributions per Faculty</div></div>
              <div className="cb">
                <div className="bar-rows">
                  <div className="brow"><div className="blbl">Engineering</div><div className="btrack"><div className="bfill" style={{ width: "78%", background: "var(--blue)" }}>78</div></div></div>
                  <div className="brow"><div className="blbl">Science</div><div className="btrack"><div className="bfill" style={{ width: "61%", background: "#1a8a5a" }}>60</div></div></div>
                  <div className="brow"><div className="blbl">Business</div><div className="btrack"><div className="bfill" style={{ width: "53%", background: "#2a70c0" }}>52</div></div></div>
                  <div className="brow"><div className="blbl">Arts</div><div className="btrack"><div className="bfill" style={{ width: "38%", background: "#7030a0" }}>37</div></div></div>
                  <div className="brow"><div className="blbl">Education</div><div className="btrack"><div className="bfill" style={{ width: "21%", background: "#c07020" }}>20</div></div></div>
                </div>
              </div>
            </div>
            {/* Browser chart */}
            <div className="card">
              <div className="ch"><div className="ch-title">Browser Usage</div></div>
              <div className="cb">
                <div className="donut-row">
                  <svg width="110" height="110" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#dde8f8" strokeWidth="5" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#1a6fc4" strokeWidth="5" strokeDasharray="45 55" strokeDashoffset="25" transform="rotate(-90 18 18)" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#2a9a7a" strokeWidth="5" strokeDasharray="30 70" strokeDashoffset="-20" transform="rotate(-90 18 18)" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#7030a0" strokeWidth="5" strokeDasharray="15 85" strokeDashoffset="-50" transform="rotate(-90 18 18)" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#c07020" strokeWidth="5" strokeDasharray="10 90" strokeDashoffset="-65" transform="rotate(-90 18 18)" />
                    <text x="18" y="20" textAnchor="middle" fontSize="4" fill="#0d1f3c" fontWeight="bold">Usage</text>
                  </svg>
                  <div className="legend">
                    <div className="li"><div className="ldot" style={{ background: "#1a6fc4" }}></div> Chrome — 45%</div>
                    <div className="li"><div className="ldot" style={{ background: "#2a9a7a" }}></div> Firefox — 30%</div>
                    <div className="li"><div className="ldot" style={{ background: "#7030a0" }}></div> Safari — 15%</div>
                    <div className="li"><div className="ldot" style={{ background: "#c07020" }}></div> Other — 10%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Most active users */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch"><div className="ch-title">Most Active Users</div></div>
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Faculty</th><th>Logins</th><th>Page Views</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Hnin Su Nyein</strong></td><td><span className="badge b-blue">Student</span></td><td>Engineering</td><td>24</td><td>187</td></tr>
                <tr><td><strong>Dr. Sarah Lwin</strong></td><td><span className="badge b-navy">Coordinator</span></td><td>Engineering</td><td>18</td><td>312</td></tr>
                <tr><td><strong>Ko Aung Kyaw</strong></td><td><span className="badge b-blue">Student</span></td><td>Engineering</td><td>15</td><td>94</td></tr>
              </tbody>
            </table>
          </div>

          {/* Exception report */}
          <div className="card">
            <div className="ch">
              <div><div className="ch-title">⚠️ Exception Report — No Comment After 14 Days</div></div>
              <button className="btn btn-outline btn-sm">Export CSV</button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Contribution Title</th><th>Student</th><th>Faculty</th><th>Submitted</th><th>Days Overdue</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Campus Sustainability Report 2025</strong></td><td>Hnin Su Nyein</td><td>Engineering</td><td>18 Jan 2026</td><td><span className="badge b-red">+17 days</span></td></tr>
                <tr><td><strong>History of Southeast Asian Trade</strong></td><td>Ko Myo Win</td><td>Arts</td><td>20 Jan 2026</td><td><span className="badge b-red">+15 days</span></td></tr>
                <tr><td><strong>Nanotechnology in Modern Medicine</strong></td><td>Ma Su Su</td><td>Science</td><td>22 Jan 2026</td><td><span className="badge b-warn">+14 days</span></td></tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
