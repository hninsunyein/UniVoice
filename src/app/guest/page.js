import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

const sidebarConfig = {
  profile: {
    initial: "G",
    name: "Guest Viewer",
    subtitle: "Faculty of Engineering",
    role: "Guest",
    avatarStyle: { background: "linear-gradient(135deg,#3a6090,#5a90c0)" },
    tagStyle: { background: "#3a6090" },
  },
  sections: [
    {
      title: "Browse",
      items: [
        { icon: "✅", label: "Selected Articles", href: "/guest", active: true },
        { icon: "🖼️", label: "Photo Gallery", href: "#" },
      ],
    },
    {
      title: "Info",
      items: [
        { icon: "ℹ️", label: "About This Magazine", href: "#" },
      ],
    },
  ],
};

const galleryItems = [
  { emoji: "🤖", bg: "linear-gradient(135deg, #c8ddf8, #a0c4f0)", title: "AI in Healthcare: A New Frontier", meta: "Hnin Su Nyein · 3 images · Selected Jan 2026" },
  { emoji: "🌿", bg: "linear-gradient(135deg, #c8e8d8, #a0d0b8)", title: "Campus Sustainability Report 2025", meta: "Ko Zin Thu · 1 image · Selected Feb 2026" },
  { emoji: "🔬", bg: "linear-gradient(135deg, #e8d8f8, #d0b8f0)", title: "Nanotechnology in Modern Medicine", meta: "Ma Su Su · 2 images · Selected Feb 2026" },
  { emoji: "☀️", bg: "linear-gradient(135deg, #f8e8c8, #f0d0a0)", title: "Solar Panel Innovation 2025", meta: "Ko Aung Kyaw · 4 images · Selected Feb 2026" },
  { emoji: "🚀", bg: "linear-gradient(135deg, #f8c8c8, #f0a0a0)", title: "Robotics Club Showcase 2025", meta: "Ma Thin Zar · 5 images · Selected Feb 2026" },
  { emoji: "💧", bg: "linear-gradient(135deg, #c8f0f8, #a0e0f0)", title: "Clean Water Engineering Projects", meta: "Daw Aye Aye · 2 images · Selected Feb 2026" },
];

export default function GuestPage() {
  return (
    <>
      <Topbar userInfo="<strong>Guest Account</strong> · Faculty of Engineering (Read Only)" />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">
          <div className="pg-header">
            <div className="pg-title">Selected Articles</div>
            <div className="pg-sub">Faculty of Engineering · Academic Year 2025/26 · View Only</div>
          </div>

          <div className="alert info">
            <span className="alert-icon">👁</span>
            <div>You are viewing as a <strong>Guest</strong>. You can browse selected contributions for the Faculty of Engineering only. You cannot edit or download files.</div>
          </div>

          <div className="stats-3">
            <div className="stat"><div className="stat-n">24</div><div className="stat-l">Selected Articles</div></div>
            <div className="stat green"><div className="stat-n">47</div><div className="stat-l">Total Images</div></div>
            <div className="stat"><div className="stat-n">5</div><div className="stat-l">Faculties</div></div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch"><div className="ch-title">Selected Contributions — Engineering Faculty</div></div>
            <div style={{ padding: 16 }}>
              <div className="gallery-grid">
                {galleryItems.map((item, i) => (
                  <div key={i} className="gallery-card">
                    <div className="gallery-thumb" style={{ background: item.bg }}>{item.emoji}</div>
                    <div className="gallery-info">
                      <div className="gallery-title">{item.title}</div>
                      <div className="gallery-meta">{item.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
