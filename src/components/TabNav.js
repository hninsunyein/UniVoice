"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/login", label: "🔐 Login" },
  { href: "/forgot-password", label: "🔑 Forgot PW" },
  { href: "/change-password", label: "🔒 Change PW" },
  { href: "/user/student", label: "🎓 Student" },
  { href: "/user/student/submit", label: "📝 Submit" },
  { href: "/user/coordinator", label: "🗂 Coordinator" },
  { href: "/user/guest", label: "👁 Guest View" },
  { href: "/user/manager", label: "📋 Mkt Manager" },
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
