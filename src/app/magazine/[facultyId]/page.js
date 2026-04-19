"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BASE_URL, getAccessToken } from "@/lib/api";
import { listContributions } from "@/lib/services/contributions";
import { listFaculties } from "@/lib/services/faculties";
import { listAcademicYears } from "@/lib/services/closures";
import mammoth from "mammoth";

const facultyEmojiMap = [
  { keys: ["engineering", "mechanical", "civil", "electrical", "structural"], emoji: "🏗️" },
  { keys: ["computing", "computer", "software", "it ", "information technology", "data"], emoji: "💻" },
  { keys: ["medicine", "medical", "health", "nursing", "pharmacy", "clinical"], emoji: "🏥" },
  { keys: ["science", "biology", "chemistry", "physics", "natural"], emoji: "🔬" },
  { keys: ["art", "design", "creative", "fine art", "media", "film", "music"], emoji: "🎨" },
  { keys: ["business", "management", "finance", "accounting", "economics", "commerce"], emoji: "💼" },
  { keys: ["law", "legal", "justice"], emoji: "⚖️" },
  { keys: ["education", "teaching", "pedagogy"], emoji: "📚" },
  { keys: ["environment", "ecology", "sustainability", "agriculture"], emoji: "🌿" },
  { keys: ["architecture", "urban", "planning", "construction"], emoji: "🏛️" },
  { keys: ["psychology", "sociology", "social", "humanities", "philosophy"], emoji: "🧠" },
  { keys: ["language", "linguistic", "literature", "english", "communication"], emoji: "📝" },
  { keys: ["sport", "physical", "exercise", "kinesiology"], emoji: "🏅" },
  { keys: ["tourism", "hospitality", "hotel"], emoji: "✈️" },
];

function getFacultyEmoji(name, fallbackIndex) {
  const lower = (name || "").toLowerCase();
  const match = facultyEmojiMap.find((m) => m.keys.some((k) => lower.includes(k)));
  if (match) return match.emoji;
  const fallback = ["🤖", "🔬", "🎨", "💼", "📚", "🏗️", "🌿", "☀️"];
  return fallback[fallbackIndex % fallback.length];
}

const emojiPool = ["🤖", "🔬", "🎨", "💼", "📚", "🏗️", "🌿", "☀️"];
const bgPool = [
  "linear-gradient(135deg,#c8ddf8,#a0c4f0)",
  "linear-gradient(135deg,#c8e8d8,#a0d0b8)",
  "linear-gradient(135deg,#e8d8f8,#d0b8f0)",
  "linear-gradient(135deg,#f8e8c8,#f0d0a0)",
  "linear-gradient(135deg,#f8c8c8,#f0a0a0)",
  "linear-gradient(135deg,#c8f0f8,#a0e0f0)",
  "linear-gradient(135deg,#d8f0c8,#b8e0a0)",
  "linear-gradient(135deg,#f0d8f8,#e0b8f0)",
];

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* Resolve author name — same priority order as guest page */
function resolveAuthor(c) {
  return c.student?.user?.username || c.student?.username || c.studentName || "—";
}

export default function MagazineFacultyPage() {
  const { facultyId } = useParams();
  const router = useRouter();

  const [faculty,       setFaculty]       = useState(null);
  const [facultyIndex,  setFacultyIndex]  = useState(0);
  const [contributions, setContributions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [activeYearId,  setActiveYearId]  = useState("");
  const [yearLabel,     setYearLabel]     = useState("");

  /* document view */
  const [docBlob,    setDocBlob]    = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docViewing, setDocViewing] = useState(false);
  const [docAuthErr, setDocAuthErr] = useState(false);

  useEffect(() => {
    if (!facultyId) return;
    Promise.all([loadFaculty(), loadActiveYear()]).then(([, yearId]) => {
      fetchContributions(yearId);
    });
  }, [facultyId]);

  /* Handle browser back button when in detail view */
  useEffect(() => {
    const handlePop = () => {
      if (selected) {
        setSelected(null);
        setDocBlob(null);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [selected]);

  const loadFaculty = async () => {
    try {
      const data = await listFaculties();
      const facs = Array.isArray(data) ? data : (data?.data ?? []);
      const idx = facs.findIndex((f) => f.facultyId === facultyId);
      if (idx >= 0) setFacultyIndex(idx);
      const found = facs[idx >= 0 ? idx : 0];
      if (found) setFaculty(found);
    } catch {}
  };

  const loadActiveYear = async () => {
    try {
      const res = await listAcademicYears();
      const years = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      if (!years.length) return "";
      const sorted = [...years].sort((a, b) =>
        new Date(b.endDate || b.startDate || 0) - new Date(a.endDate || a.startDate || 0)
      );
      const ay = sorted[0];
      const id = ay.academicYearId || ay.id || "";
      setActiveYearId(id);
      const s = ay.startDate ? new Date(ay.startDate).getFullYear() : null;
      const e = ay.endDate   ? new Date(ay.endDate).getFullYear()   : null;
      setYearLabel(s && e && s !== e ? `${s}/${String(e).slice(-2)}` : s ? String(s) : ay.academicYearName || "");
      return id;
    } catch {
      return "";
    }
  };

  const fetchContributions = async (yearId) => {
    setLoading(true);
    try {
      const params = {};
      if (yearId) params.academicYearId = yearId;

      const res = await listContributions(params);
      if (res.success !== false) {
        const raw = res.data;
        let items =
          Array.isArray(raw?.contributions) ? raw.contributions :
          Array.isArray(raw?.items)         ? raw.items         :
          Array.isArray(raw?.content)       ? raw.content       :
          Array.isArray(raw?.list)          ? raw.list          :
          Array.isArray(raw?.result)        ? raw.result        :
          Array.isArray(raw)                ? raw               : [];

        /* Same status normalisation as guest page */
        items = items.filter((c) =>
          (c.status || c.contributionStatus || c.statusName || "").toUpperCase() === "SELECTED"
        );
        /* Same faculty filter paths as guest page */
        items = items.filter((c) =>
          c.student?.user?.facultyId === facultyId ||
          c.student?.user?.faculty?.facultyId === facultyId
        );
        setContributions(items);
      } else {
        setContributions([]);
      }
    } catch {
      setContributions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocBlob = async (id) => {
    setDocBlob(null);
    setDocAuthErr(false);
    setDocLoading(true);
    try {
      let token = getAccessToken();
      if (!token) { setDocAuthErr(true); setDocLoading(false); return; }

      let res = await fetch(`${BASE_URL}/contributions/${id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        try {
          const r = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }),
          });
          const d = await r.json();
          if (d?.data?.accessToken) {
            token = d.data.accessToken;
            localStorage.setItem("accessToken", token);
            res = await fetch(`${BASE_URL}/contributions/${id}/file`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } else {
            setDocAuthErr(true); setDocLoading(false); return;
          }
        } catch { setDocAuthErr(true); setDocLoading(false); return; }
      }
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) setDocBlob(blob);
      }
    } catch {}
    setDocLoading(false);
  };

  const openDocInTab = async () => {
    if (!docBlob) return;
    setDocViewing(true);
    try {
      const arrayBuffer = await docBlob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const title = selected?.contributionTitle || selected?.title || "Document";
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 0 24px 40px; line-height: 1.7; color: #222; }
    h1,h2,h3,h4 { margin-top: 1.2em; }
    p { margin: .6em 0; }
    img { max-width: 100%; }
    .toolbar { position: sticky; top: 0; background: #f0f4fa; border-bottom: 1px solid #ccd6e8; padding: 10px 0; margin: 0 -24px 24px; display: flex; align-items: center; gap: 12px; padding-left: 24px; z-index: 10; }
    .toolbar button { background: none; color: #1a4a8a; border: 1.5px solid #1a4a8a; border-radius: 6px; padding: 5px 14px; font-size: 13px; cursor: pointer; font-family: inherit; }
    .toolbar .doc-name { font-size: 13px; font-weight: 600; color: #1a4a8a; flex: 1; }
    .guest-note { font-size: 12px; color: #666; background: #fffbe6; border: 1px solid #f0c040; border-radius: 6px; padding: 6px 12px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.close()">← Close Tab</button>
    <span class="doc-name">📄 ${title}</span>
    <span class="guest-note">👁 Read-only — Guest access</span>
  </div>
  ${result.value}
</body>
</html>`;
      const htmlBlob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(htmlBlob), "_blank");
    } catch {
      /* Mammoth failed (e.g. PDF or unsupported format) — open raw file directly */
      window.open(URL.createObjectURL(docBlob), "_blank");
    }
    setDocViewing(false);
  };

  const openArticle = (c) => {
    window.history.pushState({ detail: true }, "");
    setSelected(c);
    setDocBlob(null);
    const id = c?.contributionId || c?.id || c?._id;
    if (id) fetchDocBlob(id);
  };

  const closeDetail = () => {
    setSelected(null);
    setDocBlob(null);
  };

  const facultyName = faculty?.facultyName || "Faculty Magazine";

  /* ── Article detail view ── */
  if (selected) {
    const bg = bgPool[facultyIndex % bgPool.length];
    const em = getFacultyEmoji(facultyName, facultyIndex);

    return (
      <div className="landing-page" style={{ minHeight: "100vh", background: "#f5f7fa" }}>
        <div className="lp-header">
          <div className="lp-logo">Uni<span>Voice</span></div>
          <div className="lp-header-right">
            <Link href="/login" className="lp-login-btn" style={{ textDecoration: "none" }}>Sign In</Link>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 0" }}>
          <button
            onClick={closeDetail}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#0d2a5e", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Back to {facultyName}
          </button>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 32px" }}>
          <div className="card">
            <div style={{ height: 240, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
              background: selected.image?.imageUrl ? "transparent" : bg, fontSize: 72 }}>
              {selected.image?.imageUrl
                ? <img src={selected.image.imageUrl} alt={selected.contributionTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : em}
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
                  <div className="meta-val">{resolveAuthor(selected)}</div>
                </div>
                <div className="meta-box">
                  <div className="meta-key">Submitted</div>
                  <div className="meta-val">{fmtDate(selected.submittedAt || selected.createdAt)}</div>
                </div>
                <div className="meta-box">
                  <div className="meta-key">Faculty</div>
                  <div className="meta-val">{selected.student?.user?.faculty?.facultyName || facultyName}</div>
                </div>
                <div className="meta-box">
                  <div className="meta-key">Status</div>
                  <div className="meta-val" style={{ color: "var(--success)" }}>✅ Selected</div>
                </div>
              </div>

              {selected.description ? (
                <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-mid)", marginBottom: 20 }}>
                  {selected.description}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 20 }}>
                  No description provided.
                </div>
              )}

              {/* Document view — same as guest page */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", marginBottom: 10 }}>
                  📎 Article Document
                </div>
                <div style={{ background: "var(--sky)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>
                        {selected?.originalFileName || selected?.fileName || "Article Document"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Word Document · Read-only</div>
                    </div>
                  </div>
                  {docLoading ? (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</span>
                  ) : docBlob ? (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={openDocInTab}
                      disabled={docViewing}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      👁 {docViewing ? "Opening…" : "View Document"}
                    </button>
                  ) : docAuthErr ? (
                    <Link href="/login" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                      Sign in to view
                    </Link>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Not available</span>
                  )}
                </div>
              </div>

              <div className="alert info" style={{ marginBottom: 0 }}>
                <span className="alert-icon">👁</span>
                <div>You are viewing in <strong>Guest read-only mode</strong>. Sign in for full access.</div>
              </div>
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
          <Link href="/login" className="lp-login-btn" style={{ textDecoration: "none" }}>Sign In</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 0" }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#0d2a5e", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
        >
          ← Back to Home
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 32px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, color: "#0d2a5e", marginBottom: 6 }}>
            {facultyName}
          </h1>
          <p style={{ color: "#6b7a99", fontSize: 14 }}>
            Selected articles for publication{yearLabel ? ` · Academic Year ${yearLabel}` : ""}
          </p>
        </div>

        <div className="alert info" style={{ marginBottom: 24 }}>
          <span className="alert-icon">👁</span>
          <div>
            <strong>You are viewing as a Guest.</strong>{" "}
            Browse selected contributions for <strong>{facultyName}</strong>
            {yearLabel ? <> · Academic Year <strong>{yearLabel}</strong></> : ""}.{" "}
            Click any article to read more. View only — no editing or downloads.
          </div>
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
                onClick={() => openArticle(c)}
              >
                <div
                  className="gallery-thumb"
                  style={{ height: 130, position: "relative", overflow: "hidden",
                    background: c.image?.imageUrl ? "transparent" : bgPool[facultyIndex % bgPool.length] }}
                >
                  {c.image?.imageUrl
                    ? <img src={c.image.imageUrl} alt={c.contributionTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : getFacultyEmoji(facultyName, facultyIndex)}
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
                    {resolveAuthor(c)} · {fmtDate(c.submittedAt || c.createdAt)}
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
