import Link from "next/link";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

const sidebarConfig = {
  profile: {
    initial: "H",
    name: "Hnin Su Nyein",
    subtitle: "Faculty of Engineering",
    role: "Student",
  },
  sections: [
    {
      title: "Navigation",
      items: [
        { icon: "🏠", label: "Dashboard", href: "/student", active: true },
        { icon: "📝", label: "New Contribution", href: "/student/submit" },
        { icon: "📂", label: "My Contributions", href: "#" },
      ],
    },
    {
      title: "Info",
      items: [
        { icon: "📅", label: "Deadlines", href: "#" },
        { icon: "📋", label: "Terms & Conditions", href: "#" },
        { icon: "❓", label: "Help & Support", href: "#" },
      ],
    },
  ],
};

export default function StudentDashboard() {
  return (
    <>
      <Topbar userInfo="<strong>Hnin Su Nyein</strong> · Student · Faculty of Engineering" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="pg-header">
            <div className="pg-title">My Dashboard</div>
            <div className="pg-sub">Academic Year 2025/26 · Faculty of Engineering</div>
          </div>

          <div className="alert info">
            <span className="alert-icon">ℹ️</span>
            <div><strong>Last login:</strong> Monday, 16 Feb 2026 at 09:42 AM. If this wasn&apos;t you, please contact the administrator immediately.</div>
          </div>

          <div className="stats">
            <div className="stat"><div className="stat-n">3</div><div className="stat-l">My Contributions</div></div>
            <div className="stat green"><div className="stat-n">1</div><div className="stat-l">Selected</div></div>
            <div className="stat orange"><div className="stat-n">5</div><div className="stat-l">Days to Closure</div></div>
            <div className="stat red"><div className="stat-n">1</div><div className="stat-l">Awaiting Comment</div></div>
          </div>

          <div className="card">
            <div className="ch">
              <div>
                <div className="ch-title">My Contributions</div>
                <div className="ch-sub">Academic Year 2025/26</div>
              </div>
              <Link href="/student/submit" className="btn btn-primary btn-sm">+ New Submission</Link>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Submitted</th>
                  <th>Images</th>
                  <th>Status</th>
                  <th>Comment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>AI in Healthcare: A New Frontier</strong></td>
                  <td>10 Jan 2026</td>
                  <td>3</td>
                  <td><span className="badge b-green">✓ Selected</span></td>
                  <td><span style={{ color: "var(--success)", fontSize: "12px" }}>✔ Received 12 Jan</span></td>
                  <td><button className="btn btn-outline btn-sm">View</button></td>
                </tr>
                <tr>
                  <td><strong>Campus Sustainability Report 2025</strong></td>
                  <td>18 Jan 2026</td>
                  <td>1</td>
                  <td><span className="badge b-blue">Submitted</span></td>
                  <td><span style={{ color: "var(--warning)", fontSize: "12px" }}>⏳ Pending</span></td>
                  <td><button className="btn btn-outline btn-sm">Edit</button></td>
                </tr>
                <tr>
                  <td><strong>Robotics Club Showcase 2025</strong></td>
                  <td>02 Feb 2026</td>
                  <td>5</td>
                  <td><span className="badge b-draft">Draft</span></td>
                  <td><span style={{ color: "var(--text-muted)", fontSize: "12px" }}>— Not yet</span></td>
                  <td><button className="btn btn-outline btn-sm">Continue</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="ch"><div className="ch-title">📅 Important Deadlines</div></div>
            <table className="data-table">
              <thead>
                <tr><th>Milestone</th><th>Date</th><th>Time Left</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Closure Date — no new submissions after this</td>
                  <td>22 Feb 2026</td>
                  <td><span className="badge b-warn">⚠ 5 days</span></td>
                </tr>
                <tr>
                  <td>Final Closure Date — no edits after this</td>
                  <td>15 Mar 2026</td>
                  <td><span className="badge b-blue">26 days</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
