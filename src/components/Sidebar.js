"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ profile, sections }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
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
          {section.items.map((item, ii) => (
            <Link
              key={ii}
              href={item.href || "#"}
              className={`sitem ${pathname === item.href ? "active" : ""} ${item.active ? "active" : ""}`}
            >
              <span className="si">{item.icon}</span>
              {item.label}
              {item.badge && (
                <span className={`sbadge ${item.badgeColor || ""}`}>{item.badge}</span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
