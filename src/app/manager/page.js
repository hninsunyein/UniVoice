import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

const sidebarConfig = {
  profile: {
    initial: "J",
    name: "Mr. James Prichard",
    subtitle: "University-wide",
    role: "Mkt Manager",
    avatarStyle: { background: "linear-gradient(135deg,#0e5090,#1a6fc4)" },
  },
  sections: [
    {
      title: "Magazine",
      items: [
        { icon: "✅", label: "All Selected", href: "/manager", active: true },
        { icon: "📦", label: "Download ZIP", href: "#" },
      ],
    },
    {
      title: "Analytics",
      items: [
        { icon: "📊", label: "Statistics", href: "#" },
        { icon: "🏫", label: "By Faculty", href: "#" },
      ],
    },
  ],
};

export default function ManagerPage() {
  return (
    <>
      <Topbar userInfo="<strong>Mr. James Prichard</strong> · University Marketing Manager" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="pg-header">
            <div className="pg-title">Marketing Manager Dashboard</div>
            <div className="pg-sub">Academic Year 2025/26 · Read-only access to all selected contributions</div>
          </div>

          <div className="download-cta">
            <div className="dl-text">
              <h3>📦 Download All Selected Contributions</h3>
              <p>All selected articles and images packaged as a single ZIP file for external transfer. Available after final closure date.</p>
            </div>
            <button className="btn btn-primary btn-lg">⬇ Download ZIP</button>
          </div>

          <div className="stats">
            <div className="stat"><div className="stat-n">89</div><div className="stat-l">Total Selected</div></div>
            <div className="stat green"><div className="stat-n">24</div><div className="stat-l">Engineering</div></div>
            <div className="stat"><div className="stat-n">19</div><div className="stat-l">Science</div></div>
            <div className="stat"><div className="stat-n">46</div><div className="stat-l">Other Faculties</div></div>
          </div>

          <div className="card">
            <div className="ch">
              <div>
                <div className="ch-title">All Selected Contributions — University-wide</div>
                <div className="ch-sub">View only · Cannot edit · Final selections made by Faculty Coordinators</div>
              </div>
              <button className="btn btn-outline btn-sm">Filter by Faculty</button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Student</th><th>Faculty</th><th>Images</th><th>Selected On</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>AI in Healthcare: A New Frontier</strong></td>
                  <td>Hnin Su Nyein</td>
                  <td><span className="ptag">🏛 Engineering</span></td>
                  <td>3</td>
                  <td>12 Jan 2026</td>
                </tr>
                <tr>
                  <td><strong>Climate Change &amp; Campus Policy</strong></td>
                  <td>Ma Khin Hnin</td>
                  <td><span className="ptag" style={{ background: "#e6f7f0", color: "#0e7a55" }}>🔬 Science</span></td>
                  <td>2</td>
                  <td>14 Jan 2026</td>
                </tr>
                <tr>
                  <td><strong>Startup Culture in Myanmar</strong></td>
                  <td>Ko Zin Myo</td>
                  <td><span className="ptag" style={{ background: "#fff4e0", color: "#b06b00" }}>💼 Business</span></td>
                  <td>1</td>
                  <td>15 Jan 2026</td>
                </tr>
                <tr>
                  <td><strong>The Art of Storytelling</strong></td>
                  <td>Ma Aye Aye</td>
                  <td><span className="ptag" style={{ background: "#f3e8ff", color: "#7030a0" }}>🎨 Arts</span></td>
                  <td>4</td>
                  <td>16 Jan 2026</td>
                </tr>
                <tr>
                  <td><strong>Inclusive Education Practices</strong></td>
                  <td>Daw Su Myat</td>
                  <td><span className="ptag" style={{ background: "#fff0f0", color: "#b52a2a" }}>📚 Education</span></td>
                  <td>2</td>
                  <td>17 Jan 2026</td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: "10px 16px", fontSize: "12px", color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
              Showing 5 of 89 · <a href="#" style={{ color: "var(--blue)" }}>View all</a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
