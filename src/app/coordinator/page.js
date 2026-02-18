import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

const sidebarConfig = {
  profile: {
    initial: "S",
    name: "Dr. Sarah Lwin",
    subtitle: "Faculty of Engineering",
    role: "Coordinator",
  },
  sections: [
    {
      title: "Contributions",
      items: [
        { icon: "🗂", label: "All Contributions", href: "/coordinator", active: true, badge: "12", badgeColor: "blue" },
        { icon: "⚠️", label: "Needs Comment", href: "#", badge: "3" },
        { icon: "✅", label: "Selected for Pub.", href: "#" },
        { icon: "❌", label: "Rejected", href: "#" },
      ],
    },
    {
      title: "Guests",
      items: [
        { icon: "👥", label: "Guest Accounts", href: "#", badge: "2", badgeColor: "green" },
      ],
    },
    {
      title: "Tools",
      items: [
        { icon: "📊", label: "Faculty Statistics", href: "#" },
      ],
    },
  ],
};

export default function CoordinatorPage() {
  return (
    <>
      <Topbar userInfo="<strong>Dr. Sarah Lwin</strong> · Marketing Coordinator · Engineering" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="pg-header">
            <div className="pg-title">Review Contributions</div>
            <div className="pg-sub">Faculty of Engineering · 12 contributions · 3 need your comment</div>
          </div>

          <div className="alert dang">
            <span className="alert-icon">🔴</span>
            <div><strong>3 contributions</strong> have not received a comment within 14 days. Please review immediately to avoid exception reports.</div>
          </div>

          <div className="review-layout">
            {/* Left: table list */}
            <div>
              <div className="card">
                <div className="ch">
                  <div className="ch-title">Submitted Contributions</div>
                  <button className="btn btn-outline btn-sm">Filter</button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Student</th><th>Title</th><th>Date</th><th>Comment Status</th></tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: "#fff5f5" }}>
                      <td><strong>Hnin Su Nyein</strong></td>
                      <td>Campus Sustainability Report 2025</td>
                      <td>18 Jan</td>
                      <td><span className="badge b-red">17d overdue</span></td>
                    </tr>
                    <tr style={{ background: "#fff8f0" }}>
                      <td><strong>Ko Aung Kyaw</strong></td>
                      <td>Solar Panel Innovation</td>
                      <td>25 Jan</td>
                      <td><span className="badge b-warn">9d left</span></td>
                    </tr>
                    <tr>
                      <td><strong>Ma Thin Zar</strong></td>
                      <td>Student Research Symposium</td>
                      <td>01 Feb</td>
                      <td><span className="badge b-blue">14d left</span></td>
                    </tr>
                    <tr>
                      <td><strong>Ko Zin Thu</strong></td>
                      <td>AI in Healthcare: A New Frontier</td>
                      <td>05 Feb</td>
                      <td><span className="badge b-green">✓ Commented</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Right: detail panel */}
            <div>
              <div className="card">
                <div className="ch">
                  <div>
                    <div className="ch-title">Campus Sustainability Report 2025</div>
                    <div className="ch-sub">Hnin Su Nyein · 18 Jan 2026</div>
                  </div>
                </div>
                <div className="cb">
                  <div className="alert dang">
                    <span className="alert-icon">⏰</span>
                    <div>17 days since submission — comment is <strong>overdue!</strong></div>
                  </div>
                  <div className="meta-grid">
                    <div className="meta-box"><div className="meta-key">Faculty</div><div className="meta-val">Engineering</div></div>
                    <div className="meta-box"><div className="meta-key">Images</div><div className="meta-val">1 uploaded</div></div>
                    <div className="meta-box"><div className="meta-key">T&amp;C Agreed</div><div className="meta-val">✓ Yes</div></div>
                    <div className="meta-box"><div className="meta-key">Status</div><div className="meta-val">Submitted</div></div>
                  </div>
                  <div className="file-box">
                    <div className="file-icon-big">📄</div>
                    <div>
                      <div className="file-nm">sustainability_report_2025.docx</div>
                      <div className="file-sz">2.4 MB · Word Document</div>
                    </div>
                    <button className="btn btn-outline btn-sm" style={{ marginLeft: "auto" }}>⬇ Download</button>
                  </div>
                  <div className="img-grid2">
                    <div className="img-th" style={{ background: "linear-gradient(135deg,#c8e0f8,#a8c8f0)" }}>🌿</div>
                    <div className="img-th" style={{ background: "linear-gradient(135deg,#d8f0d0,#b8e0a8)" }}>🏛️</div>
                  </div>
                  <div className="fgroup">
                    <label>Your Comment *</label>
                    <textarea style={{ minHeight: 80 }} placeholder="Write editorial feedback…"></textarea>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button className="btn btn-success">✓ Select for Magazine</button>
                    <button className="btn btn-danger">✕ Reject</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-primary btn-full">💬 Save Comment Only</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
