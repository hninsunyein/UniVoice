"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/login", label: "🔐 Login" },
  { href: "/student", label: "🎓 Student" },
  { href: "/student/submit", label: "📝 Submit" },
  { href: "/coordinator", label: "🗂 Coordinator" },
  { href: "/guest", label: "👁 Guest View" },
  { href: "/manager", label: "📋 Mkt Manager" },
  { href: "/admin", label: "📊 Admin Reports" },
  { href: "/admin/closure", label: "📅 Closure Dates" },
  { href: "/email", label: "✉ Email Notifications" },
];

export default function TabNav() {
  const pathname = usePathname();

  return (
    <div className="tab-nav">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tab-link ${pathname === tab.href ? "active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
