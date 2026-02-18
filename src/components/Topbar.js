import Link from "next/link";

export default function Topbar({ userInfo, backTo, backLabel }) {
  return (
    <div className="topbar">
      <div className="logo">Uni<em>Voice</em></div>
      <div className="topbar-info">
        <span className="topbar-user" dangerouslySetInnerHTML={{ __html: userInfo }} />
        {backTo ? (
          <Link href={backTo} className="logout-btn">{backLabel || "← Back"}</Link>
        ) : (
          <Link href="/login" className="logout-btn">Log Out</Link>
        )}
      </div>
    </div>
  );
}
