"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BASE_URL, getAccessToken } from "@/lib/api";
import { listFaculties } from "@/lib/services/faculties";

const emojiPool = ["🤖", "🌿", "🔬", "☀️", "🚀", "💧", "🎨", "📚", "💡", "🌍", "🏆", "🔭"];
const bgPool = [
  "linear-gradient(135deg, #c8ddf8, #a0c4f0)",
  "linear-gradient(135deg, #c8e8d8, #a0d0b8)",
  "linear-gradient(135deg, #e8d8f8, #d0b8f0)",
  "linear-gradient(135deg, #f8e8c8, #f0d0a0)",
  "linear-gradient(135deg, #f8c8c8, #f0a0a0)",
  "linear-gradient(135deg, #c8f0f8, #a0e0f0)",
  "linear-gradient(135deg, #d8f8c8, #b8e0a0)",
  "linear-gradient(135deg, #f8d8e8, #f0b8d0)",
];

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function MagazineFacultyPage() {
  const { facultyId } = useParams();
  const router = useRouter();

  const [faculty,       setFaculty]       = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);

  useEffect(() => {
    if (!facultyId) return;
    loadFaculty();
    fetchContributions();
  }, [facultyId]);

  const loadFaculty = async () => {
    try {
      const data = await listFaculties();
      const facs = Array.isArray(data) ? data : (data?.data ?? []);
      const found = facs.find((f) => f.facultyId === facultyId);
      if (found) setFaculty(found);
    } catch {}
  };

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };
      const token = getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/contributions`, { headers });
      if (!res.ok) { setContributions([]); setLoading(false); return; }

      const data = await res.json();
      const raw = data?.data ?? data;
      let items =
        Array.isArray(raw?.contributions) ? raw.contributions :
        Array.isArray(raw?.items)         ? raw.items         :
        Array.isArray(raw?.content)       ? raw.content       :
        Array.isArray(raw?.list)          ? raw.list          :
        Array.isArray(raw?.result)        ? raw.result        :
        Array.isArray(raw)                ? raw               : [];

      /* filter: SELECTED status */
      items = items.filter((c) =>
        c.isSelected === true ||
        c.contributionStatus === "SELECTED" ||
        c.status === "SELECTED"
      );
      /* filter: matching faculty — path: c.student.user.facultyId */
      items = items.filter((c) =>
        c.student?.user?.facultyId === facultyId ||
        c.student?.user?.faculty?.facultyId === facultyId
      );
      setContributions(items);
    } catch {
      /* silently fail — show empty state */
    } finally {
      setLoading(false);
    }
  };

  const facultyName = faculty?.facultyName || "Faculty Magazine";

  /* ── Article detail ── */
  if (selected) {
    const idx = contributions.indexOf(selected);
    return (
      <div className="landing-page" style={{ minHeight: "100vh", background: "#f5f7fa" }}>
        <div className="lp-header">
          <div className="lp-logo">Uni<span>Voice</span></div>
          <div className="lp-header-right">
            <button
              onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#2a5fa8", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}
            >
              ← Back to {facultyName}
            </button>
            <Link href="/login" className="lp-login-btn" style={{ textDecoration: "none" }}>Sign In</Link>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
          <div className="card">
            <div style={{ background: bgPool[idx % bgPool.length], height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72 }}>
              {emojiPool[idx % emojiPool.length]}
            </div>
            <div style={{ padding: "26px 30px" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <span className="badge b-green" style={{ fontSize: 12 }}>✅ Selected for Publication</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{facultyName}</span>
              </div>
              <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 24, color: "var(--navy)", marginBottom: 16, lineHeight: 1.35 }}>
                {selected.contributionTitle || selected.title || "Untitled"}
              </h1>
              <div className="meta-grid" style={{ marginBottom: 20 }}>
                <div className="meta-box">
                  <div className="meta-key">Author</div>
                  <div className="meta-val">{selected.studentName || selected.student?.username || "—"}</div>
                </div>
                <div className="meta-box">
                  <div className="meta-key">Submitted</div>
                  <div className="meta-val">{fmtDate(selected.createdAt || selected.submittedAt)}</div>
                </div>
                <div className="meta-box">
                  <div className="meta-key">Faculty</div>
                  <div className="meta-val">{facultyName}</div>
                </div>
                <div className="meta-box">
                  <div className="meta-key">Status</div>
                  <div className="meta-val" style={{ color: "var(--success)" }}>✅ Selected</div>
                </div>
              </div>
              {selected.description ? (
                <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-mid)" }}>
                  {selected.description}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: "var(--text-muted)", fontStyle: "italic" }}>
                  No description provided.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="landing-page" style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <div className="lp-header">
        <div className="lp-logo">Uni<span>Voice</span></div>
        <div className="lp-header-right">
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#2a5fa8", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}
          >
            ← Back
          </button>
          <Link href="/login" className="lp-login-btn" style={{ textDecoration: "none" }}>Sign In</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, color: "#0d2a5e", marginBottom: 6 }}>
            {facultyName}
          </h1>
          <p style={{ color: "#6b7a99", fontSize: 14 }}>
            Selected articles for publication · Academic Year 2025/26
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7a99" }}>
            Loading contributions…
          </div>
        ) : contributions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0d2a5e", marginBottom: 8 }}>
              No selected articles yet
            </div>
            <p style={{ color: "#6b7a99", fontSize: 14, marginBottom: 28 }}>
              No contributions have been selected for {facultyName} yet.
            </p>
            <Link href="/login" className="lp-login-btn" style={{ textDecoration: "none" }}>
              Sign In to Browse More
            </Link>
          </div>
        ) : (
          <div className="gallery-grid">
            {contributions.map((c, i) => (
              <div
                key={c.contributionId || c.id || i}
                className="gallery-card"
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(c)}
              >
                <div
                  className="gallery-thumb"
                  style={{ height: 130, position: "relative", overflow: "hidden",
                    background: c.image?.imageUrl ? "transparent" : bgPool[i % bgPool.length] }}
                >
                  {c.image?.imageUrl
                    ? <img src={c.image.imageUrl} alt={c.contributionTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : emojiPool[i % emojiPool.length]}
                  <span style={{
                    position: "absolute", top: 8, right: 8,
                    background: "rgba(255,255,255,.92)", padding: "3px 9px",
                    borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#0e7a55",
                  }}>
                    ✅ Selected
                  </span>
                </div>
                <div className="gallery-info">
                  <div className="gallery-title">
                    {c.contributionTitle || c.title || "Untitled Contribution"}
                  </div>
                  <div className="gallery-meta">
                    {c.student?.user?.username || "—"} · {fmtDate(c.submittedAt || c.createdAt)}
                  </div>
                  {c.description && (
                    <div style={{
                      fontSize: 12.5, color: "var(--text-mid)", marginTop: 6, lineHeight: 1.5,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {c.description}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: "#2a5fa8", fontWeight: 600 }}>Read article →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
