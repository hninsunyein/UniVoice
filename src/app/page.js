"use client";
import { useState, useRef } from "react";
import Link from "next/link";

const facultyMagazines = [
  { emoji: "🤖", title: "Engineering & Innovation", meta: "24 selected articles · Faculty of Engineering", desc: "AI, robotics, sustainability, and cutting-edge engineering research — all selected for publication.", year: "2025/26", bg: "" },
  { emoji: "🔬", title: "Science & Discovery", meta: "19 selected articles · Faculty of Science", desc: "Student research on climate, nanotechnology, and modern science breakthroughs.", year: "2025/26", bg: "linear-gradient(135deg,#c8e8d8,#a0d0b8)" },
  { emoji: "🎨", title: "Arts & Humanities", meta: "15 selected articles · Faculty of Arts", desc: "Creative storytelling, cultural analysis, and artistic expression.", year: "2025/26", bg: "linear-gradient(135deg,#e8d8f8,#d0b8f0)" },
  { emoji: "💼", title: "Business & Economics", meta: "17 selected articles · Faculty of Business", desc: "Startup culture, economic trends, and innovative business strategies.", year: "2025/26", bg: "linear-gradient(135deg,#f8e8c8,#f0d0a0)" },
  { emoji: "📚", title: "Education & Society", meta: "12 selected articles · Faculty of Education", desc: "Inclusive teaching, educational innovation, and social impact research.", year: "2025/26", bg: "linear-gradient(135deg,#f8c8c8,#f0a0a0)" },
  { emoji: "📖", title: "Archive – Last Year", meta: "89 selected articles · All Faculties", desc: "Browse the complete selected collection from 2024/25.", year: "2024/25", bg: "linear-gradient(135deg,#c8f0f8,#a0e0f0)" },
];

const guestArticles = [
  { emoji: "🤖", title: "AI in Healthcare: A New Frontier", meta: "Hnin Su Nyein · Selected 12 Jan 2026", desc: "Exploring artificial intelligence applications in modern healthcare and patient diagnosis systems.", bg: "" },
  { emoji: "☀️", title: "Solar Panel Innovation 2025", meta: "Ko Aung Kyaw · Selected 14 Feb 2026", desc: "Next-generation solar technology and sustainable energy solutions for urban environments.", bg: "linear-gradient(135deg,#f8e8c8,#f0d0a0)" },
  { emoji: "🤖", title: "Robotics Club Showcase 2025", meta: "Ma Thin Zar · Selected 10 Feb 2026", desc: "Student-built autonomous robots and competition highlights from this academic year.", bg: "linear-gradient(135deg,#e8d8f8,#d0b8f0)" },
  { emoji: "💧", title: "Clean Water Engineering Projects", meta: "Daw Aye Aye · Selected 08 Feb 2026", desc: "Community-focused engineering solutions for clean water access in rural Myanmar.", bg: "linear-gradient(135deg,#c8f0f8,#a0e0f0)" },
];

export default function LandingPage() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [demoFaculty, setDemoFaculty] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [detailArticle, setDetailArticle] = useState({ title: "", author: "", initial: "" });
  const magRef = useRef(null);

  const scrollToMagazines = () => {
    magRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDemoLogin = () => {
    if (!demoFaculty) {
      alert("Please choose a faculty");
      return;
    }
    setSelectedFaculty(demoFaculty);
    setIsGuestMode(true);
    setShowDemoModal(false);
    setTimeout(() => magRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const openArticleDetail = (title, author) => {
    setDetailArticle({ title, author, initial: author.charAt(0) });
    setShowDetail(true);
    window.scrollTo(0, 0);
  };

  const closeDetail = () => {
    setShowDetail(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="landing-page">
      {/* HEADER */}
      <div className="lp-header">
        <div className="lp-logo">Uni<span>Voice</span></div>
        <div className="lp-header-right">
          <button className="lp-guest-btn" onClick={() => setShowDemoModal(true)}>👁 Guest Access</button>
          <Link href="/login" className="lp-login-btn" style={{ textDecoration: "none" }}>Sign In</Link>
        </div>
      </div>

      {/* HERO - hidden when viewing article detail */}
      {!showDetail && (
        <div className="lp-hero">
          <div className="lp-hero-container">
            <div className="lp-hero-left">
              <h1 className="lp-hero-title">Your Best Value Proposition</h1>
              <p className="lp-hero-text">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua.
              </p>
              <button className="lp-hero-cta" onClick={scrollToMagazines}>Read Magazine</button>
            </div>
            <div className="lp-hero-right">
              <div className="lp-hero-image"></div>
            </div>
          </div>
        </div>
      )}

      {/* GUEST WELCOME */}
      {!showDetail && isGuestMode && (
        <div className="lp-welcome-section">
          <div className="lp-welcome-box" style={{ borderLeft: "3px solid #4a90e0" }}>
            <span className="lp-welcome-icon">👁</span>
            <h2 className="lp-welcome-title">Guest Access — {selectedFaculty} Faculty</h2>
            <p className="lp-welcome-text" style={{ background: "#e8f1fd", padding: "12px 16px", borderRadius: 8, fontSize: 13, color: "#0d3d8a" }}>
              <strong>ℹ️ Read-Only Access:</strong> You are viewing selected contributions for the Faculty of {selectedFaculty}.
              You cannot edit, comment, or download files.
            </p>
            <div className="lp-info-grid">
              <div className="lp-info-item">
                <span className="lp-info-icon">✅</span>
                <div className="lp-info-label">Selected Articles</div>
                <div className="lp-info-value">24 articles</div>
              </div>
              <div className="lp-info-item">
                <span className="lp-info-icon">🖼️</span>
                <div className="lp-info-label">Images</div>
                <div className="lp-info-value">47 photos</div>
              </div>
              <div className="lp-info-item">
                <span className="lp-info-icon">📅</span>
                <div className="lp-info-label">Academic Year</div>
                <div className="lp-info-value">2025/26</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAGAZINES SECTION */}
      {!showDetail && (
        <div className="lp-magazines-section" ref={magRef}>
          <div className="lp-section-header">
            <h2 className="lp-section-title">
              {isGuestMode ? `${selectedFaculty} Faculty — Selected Articles` : "Explore Our Magazines"}
            </h2>
            <p className="lp-section-subtitle">
              {isGuestMode
                ? `Viewing selected contributions for Faculty of ${selectedFaculty} only (Read-Only)`
                : "Browse selected contributions by faculty — Academic Year 2025/26"}
            </p>
          </div>

          {/* Normal grid (non-guest) */}
          {!isGuestMode && (
            <div className="lp-mag-grid">
              {facultyMagazines.map((mag, i) => (
                <div
                  key={i}
                  className="lp-mag-card"
                  onClick={i === 0 ? () => openArticleDetail("How to Spend the Perfect Day on Croatia's Most Magical Island", "Hnin Su Nyein") : undefined}
                >
                  <div className="lp-mag-cover" style={mag.bg ? { background: mag.bg } : {}}>
                    <span className="lp-mag-year">{mag.year}</span>
                    {mag.emoji}
                  </div>
                  <div className="lp-mag-info">
                    <div className="lp-mag-title">{mag.title}</div>
                    <div className="lp-mag-meta">{mag.meta}</div>
                    <div className="lp-mag-desc">{mag.desc}</div>
                    <button className="lp-read-btn">{i === 5 ? "View Archive →" : "Read Selected Articles →"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guest grid */}
          {isGuestMode && (
            <div className="lp-mag-grid">
              {guestArticles.map((art, i) => (
                <div
                  key={i}
                  className="lp-mag-card"
                  onClick={() => openArticleDetail(art.title, art.meta.split(" · ")[0])}
                >
                  <div className="lp-mag-cover" style={art.bg ? { background: art.bg } : {}}>
                    <span className="lp-mag-year">2025/26</span>
                    {art.emoji}
                  </div>
                  <div className="lp-mag-info">
                    <div className="lp-mag-title">{art.title}</div>
                    <div className="lp-mag-meta">{art.meta}</div>
                    <div className="lp-mag-desc">{art.desc}</div>
                    <button className="lp-read-btn">Read Article →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ARTICLE DETAIL VIEW */}
      {showDetail && (
        <div className="lp-article-detail">
          <div className="lp-breadcrumb">
            <button onClick={closeDetail}>← Back to Magazines</button> / {isGuestMode ? `${selectedFaculty} Faculty` : "Engineering & Innovation"}
          </div>
          <div className="lp-article-header">
            <h1 className="lp-article-title">{detailArticle.title}</h1>
            <div className="lp-article-meta">
              <div className="lp-article-author">
                <div className="lp-author-av">{detailArticle.initial}</div>
                <span>{detailArticle.author}</span>
              </div>
              <span>·</span>
              <span>12 Jan 2026</span>
              <span>·</span>
              <span>Faculty of Engineering</span>
            </div>
          </div>
          <div className="lp-article-image">🏝️</div>
          <div className="lp-article-content">
            <p>
              Your article you will be rendered with the uploaded care of Europeans islands when the going
              trip, snaking a country afternoon with the place. For years, snaking a country afternoon with the place.
            </p>
            <p>
              A wonderful serenity has taken possession of my entire soul, like these sweet mornings of spring which I enjoy with my whole heart. I am alone, and feel the charm of existence in this spot, which was created for the bliss of souls like mine. So these sweet mornings of spring which I enjoy with my whole heart look at the hills and the ocean.
            </p>
            <p>
              The three most stressful life events of cycling adults often ship into town and across lands, but I am so happy, my dear friend, so absorbed in the exquisite sense of mere tranquil existence, that I neglect my talents.
            </p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="lp-footer">
        <p>© 2026 University Magazine Portal · UniVoice · <a href="#">Terms</a> · <a href="#">Privacy</a></p>
      </div>

      {/* DEMO/GUEST LOGIN MODAL */}
      {showDemoModal && (
        <div className="lp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDemoModal(false); }}>
          <div className="lp-demo-card">
            <button className="lp-modal-close" onClick={() => setShowDemoModal(false)}>✕</button>
            <div className="lp-demo-icon-circle">🎓</div>
            <h2 className="lp-demo-title">Demo user</h2>
            <p className="lp-demo-subtitle">Choose your faculty to view articles</p>
            <div className="lp-demo-field">
              <label>Faculty</label>
              <select value={demoFaculty} onChange={(e) => setDemoFaculty(e.target.value)}>
                <option value="">Choose faculty</option>
                <option value="Engineering">Engineering</option>
                <option value="Science">Science</option>
                <option value="Business">Business</option>
                <option value="Arts">Arts & Humanities</option>
                <option value="Education">Education</option>
              </select>
            </div>
            <button className="lp-demo-login-btn" onClick={handleDemoLogin}>Demo Log in</button>
            <div className="lp-demo-footer">
              Already have an account? <Link href="/login">Sign in</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
