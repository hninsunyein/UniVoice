"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { login } from "@/lib/auth";
import { listFaculties } from "@/lib/services/faculties";
import { listAcademicYears } from "@/lib/services/closures";

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

export default function LandingPage() {
  const [faculties,        setFaculties]        = useState([]);
  const [yearLabel,        setYearLabel]        = useState("2025/26");
  const [showModal,        setShowModal]        = useState(false);
  const [guestEmail,       setGuestEmail]       = useState("");
  const [guestFacultyId,   setGuestFacultyId]   = useState("");
  const [guestLoading,     setGuestLoading]     = useState(false);
  const [modalError,       setModalError]       = useState("");
  const [pendingFacultyId, setPendingFacultyId] = useState(null);
  const magRef = useRef(null);

  useEffect(() => {
    listAcademicYears()
      .then((res) => {
        const years = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (years.length > 0) {
          const sorted = [...years].sort((a, b) =>
            new Date(b.endDate || b.startDate || 0) - new Date(a.endDate || a.startDate || 0)
          );
          const active =
            sorted.find((y) => {
              const s = y.startDate ? new Date(y.startDate).getTime() : 0;
              const e = y.endDate   ? new Date(y.endDate).getTime()   : Infinity;
              return Date.now() >= s && Date.now() <= e;
            }) || sorted[0];
          if (active) {
            const s = active.startDate ? new Date(active.startDate).getFullYear() : null;
            const e = active.endDate   ? new Date(active.endDate).getFullYear()   : null;
            setYearLabel(s && e && s !== e ? `${s}/${String(e).slice(-2)}` : s ? String(s) : active.academicYearName || "2025/26");
          }
        }
      })
      .catch(() => {});

    listFaculties()
      .then((res) => {
        const facs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        if (facs.length > 0) {
          setFaculties(facs);
          setGuestFacultyId(facs[0].facultyId);
        }
      })
      .catch(() => {});
  }, []);

  const openModal = () => {
    setModalError("");
    setGuestEmail("");
    setPendingFacultyId(null);
    if (faculties.length > 0) setGuestFacultyId(faculties[0].facultyId);
    setShowModal(true);
  };

  const openModalForFaculty = (facultyId) => {
    setModalError("");
    setGuestEmail("");
    setPendingFacultyId(facultyId);
    setGuestFacultyId(facultyId);
    setShowModal(true);
  };

  /* Guest login — email + faculty only, no password */
  const handleGuestLogin = async () => {
    if (!guestEmail.trim()) { setModalError("Please enter your email address."); return; }
    if (!guestFacultyId)    { setModalError("Please select a faculty."); return; }
    setGuestLoading(true);
    setModalError("");
    try {
      const result = await login(guestEmail.trim(), undefined, guestFacultyId);
      if (result.requiresPasswordChange) {
        window.location.href = `/change-password?firstLogin=true&email=${encodeURIComponent(result.email)}`;
        return;
      }
      window.location.href = pendingFacultyId
        ? `/magazine/${pendingFacultyId}`
        : result.path;
    } catch (err) {
      setModalError(err.message || "Login failed. Please check your details.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="landing-page">

      {/* ── HEADER ── */}
      <div className="lp-header">
        <div className="lp-logo">Uni<span>Voice</span></div>
        <div className="lp-header-right">
          <button className="lp-guest-btn" onClick={openModal}>👁 Guest Access</button>
          <Link href="/login" className="lp-login-btn" style={{ textDecoration: "none" }}>Sign In</Link>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="lp-hero">
        <div className="lp-hero-container">
          <div className="lp-hero-left">
            <h1 className="lp-hero-title">University Magazine Portal</h1>
            <p className="lp-hero-text">
              The official platform for student contributions to the university&apos;s
              annual magazine. Browse selected articles by faculty and be part of
              the academic community.
            </p>
            <button
              className="lp-hero-cta"
              onClick={() => magRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              Explore Magazines
            </button>
          </div>

          <div className="lp-hero-right">
            <div className="lp-hero-image">
              <div style={{ position: "relative", width: 220, height: 260 }}>
                <div style={{ position: "absolute", top: 12, left: 20, width: 160, height: 220, borderRadius: 8, background: "linear-gradient(160deg,#0a2d6a,#1455a8)", boxShadow: "4px 4px 16px rgba(13,61,138,.25)", transform: "rotate(4deg)" }} />
                <div style={{ position: "absolute", top: 0, left: 0, width: 160, height: 220, borderRadius: 8, background: "linear-gradient(160deg,#0d3d8a 0%,#1a6fc4 55%,#4fa3f7 100%)", boxShadow: "6px 10px 28px rgba(13,61,138,.35)", padding: "18px 14px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.55)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Annual Edition · {yearLabel}</div>
                  <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 24, color: "#fff", lineHeight: 1.15, marginBottom: 4 }}>Uni<span style={{ color: "#a8d0ff" }}>Voice</span></div>
                  <div style={{ width: 36, height: 2, background: "#4fa3f7", borderRadius: 2, marginBottom: 14 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {[["🤖","AI in Healthcare"],["☀️","Solar Innovation"],["🎨","Arts & Culture"],["📚","Student Research"]].map(([icon, label]) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11 }}>{icon}</span>
                        <span style={{ fontSize: 9.5, color: "rgba(255,255,255,.8)", lineHeight: 1 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ position: "absolute", bottom: 14, left: 14, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 20, padding: "3px 10px", fontSize: 9, color: "rgba(255,255,255,.75)", letterSpacing: 1 }}>ISSUE 01</div>
                </div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ position: "absolute", top: 6 + i * 2, left: 162 + i * 2, width: 4, height: 208, background: i === 0 ? "#c8ddf8" : i === 1 ? "#e0ecfa" : "#f0f6ff", borderRadius: "0 2px 2px 0" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAGAZINES ── */}
      <div className="lp-magazines-section" ref={magRef}>
        <div className="lp-section-header">
          <h2 className="lp-section-title">Explore Our Magazines</h2>
          <p className="lp-section-subtitle">Browse selected contributions by faculty — sign in to read full articles</p>
        </div>

        {faculties.length === 0 ? (
          <div className="lp-mag-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="lp-mag-card" style={{ pointerEvents: "none" }}>
                <div style={{ height: 180, background: "linear-gradient(135deg,#e8f0fb,#d4e5f8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: .4 }}>📰</div>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ height: 13, background: "#e8eef6", borderRadius: 6, marginBottom: 8, width: "65%" }} />
                  <div style={{ height: 10, background: "#f0f4fa", borderRadius: 5, width: "45%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="lp-mag-grid">
            {faculties.map((faculty, i) => (
              <div
                key={faculty.facultyId}
                className="lp-mag-card"
                onClick={() => openModalForFaculty(faculty.facultyId)}
                style={{ cursor: "pointer" }}
              >
                <div className="lp-mag-cover" style={{ background: bgPool[i % bgPool.length] }}>
                  <span className="lp-mag-year">{yearLabel}</span>
                  {getFacultyEmoji(faculty.facultyName, i)}
                </div>
                <div className="lp-mag-info">
                  <div className="lp-mag-title">{faculty.facultyName}</div>
                  <div className="lp-mag-meta">Selected articles · Academic Year {yearLabel}</div>
                  <div className="lp-mag-desc">
                    Student-authored articles selected by the faculty coordinator for the university&apos;s annual magazine.
                  </div>
                  <button
                    className="lp-read-btn"
                    onClick={(e) => { e.stopPropagation(); openModalForFaculty(faculty.facultyId); }}
                  >
                    Read More →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="lp-footer">
        <p>© 2026 University Magazine Portal · UniVoice</p>
      </div>

      {/* ── GUEST ACCESS MODAL — email + faculty only, no password ── */}
      {showModal && (
        <div
          className="lp-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="lp-demo-card">
            <button className="lp-modal-close" onClick={() => setShowModal(false)}>✕</button>

            <div className="lp-demo-icon-circle">👁</div>
            <h2 className="lp-demo-title">Guest Access</h2>
            <p className="lp-demo-subtitle">
              {pendingFacultyId
                ? `Sign in as a guest to read ${faculties.find((f) => f.facultyId === pendingFacultyId)?.facultyName || "this faculty"}'s articles`
                : "Enter your email and select a faculty to continue"}
            </p>

            <div className="lp-demo-field">
              <label>Email Address</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGuestLogin()}
                placeholder="guest@university.ac.uk"
                autoFocus
                disabled={guestLoading}
                style={{ width: "100%", border: "1.5px solid var(--lp-line)", borderRadius: 8, padding: "11px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "var(--lp-text)", background: "#fff", outline: "none" }}
              />
            </div>

            <div className="lp-demo-field">
              <label>Faculty</label>
              <select
                value={guestFacultyId}
                onChange={(e) => setGuestFacultyId(e.target.value)}
                disabled={guestLoading || faculties.length === 0}
              >
                {faculties.length === 0
                  ? <option value="">Loading…</option>
                  : faculties.map((f) => (
                      <option key={f.facultyId} value={f.facultyId}>{f.facultyName}</option>
                    ))
                }
              </select>
            </div>

            {modalError && (
              <div style={{ background: "#fdeaea", border: "1px solid #f0b8b8", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#b52a2a", display: "flex", gap: 8, alignItems: "center", textAlign: "left" }}>
                <span>⚠️</span><span>{modalError}</span>
              </div>
            )}

            <button
              className="lp-demo-login-btn"
              onClick={handleGuestLogin}
              disabled={guestLoading || !guestEmail.trim() || !guestFacultyId}
              style={{ opacity: guestLoading || !guestEmail.trim() || !guestFacultyId ? 0.6 : 1 }}
            >
              {guestLoading ? "Signing in…" : "Continue →"}
            </button>

            <div className="lp-demo-footer">
              Staff or student? <Link href="/login" onClick={() => setShowModal(false)}>Sign in here</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
