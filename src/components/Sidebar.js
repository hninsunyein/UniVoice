"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
}

export default function Sidebar({ profile, sections }) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay — tapping outside closes the sidebar on mobile */}
      <div className="sidebar-overlay" onClick={closeSidebar} />

      <nav className="sidebar">
        {/* Mobile close button */}
        <button className="sidebar-close-btn" onClick={closeSidebar} aria-label="Close menu">✕</button>

        {profile && (
          <div className="sidebar-profile">
            <div className="avatar" style={profile.avatarStyle || {}}>{profile.initial}</div>
            <div className="profile-name">{profile.name}</div>
            <div className="profile-role">{profile.subtitle}</div>
            <span className="role-tag" style={profile.tagStyle || {}}>{profile.role}</span>
          </div>
        )}
        {sections?.map((section, si) => (
          <div key={si}>
            <div className="sidebar-sec">{section.title}</div>
            {section.items.map((item, ii) => {
              const cls = `sitem ${pathname === item.href ? "active" : ""} ${item.active ? "active" : ""}`;
              const badge = item.badge && (
                <span className={`sbadge ${item.badgeColor || ""}`}>{item.badge}</span>
              );
              if (item.onClick) {
                return (
                  <button
                    key={ii}
                    className={cls}
                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    onClick={() => { item.onClick(); closeSidebar(); }}
                  >
                    <span className="si">{item.icon}</span>
                    {item.label}
                    {badge}
                  </button>
                );
              }
              return (
                <Link
                  key={ii}
                  href={item.href || "#"}
                  className={cls}
                  onClick={closeSidebar}
                >
                  <span className="si">{item.icon}</span>
                  {item.label}
                  {badge}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}
