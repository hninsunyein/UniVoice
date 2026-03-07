"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import { getUser, getAccessToken } from "@/lib/api";
import { submitContribution, updateContribution, getContribution } from "@/lib/services/contributions";
import { listAcademicYears } from "@/lib/services/closures";

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const ACCEPTED_DOC_TYPES = [".doc", ".docx", ".pdf", ".odt"];
const ACCEPTED_IMG_TYPES = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const MAX_IMAGES = 1;

function SubmitContributionInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");
  const isEdit       = Boolean(editId);

  const [user, setUser]             = useState(null);
  const [academicYears, setAcademicYears]     = useState([]);
  const [academicYearId, setAcademicYearId]   = useState("");
  const [initialClosureDate, setInitialClosureDate] = useState(null);
  const [finalClosureDate,   setFinalClosureDate]   = useState(null);
  const [title, setTitle]           = useState("");
  const [description, setDescription]         = useState("");
  const [docFile, setDocFile]       = useState(null);
  const [existingFileName, setExistingFileName] = useState(""); // shown in edit mode
  const [imgFiles, setImgFiles]     = useState([]);
  const [agreed, setAgreed]         = useState(false);
  const [docError, setDocError]     = useState("");
  const [imgError, setImgError]     = useState("");
  const [error, setError]           = useState("");
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  const docInputRef = useRef(null);
  const imgInputRef = useRef(null);

  useEffect(() => {
    if (!getAccessToken()) { router.push("/login"); return; }
    setUser(getUser());

    listAcademicYears()
      .then((res) => {
        if (res.success !== false) {
          const raw = res.data;
          const years =
            Array.isArray(raw?.academicYears) ? raw.academicYears :
            Array.isArray(raw?.items)         ? raw.items         :
            Array.isArray(raw?.content)       ? raw.content       :
            Array.isArray(raw)                ? raw               : [];
          if (years.length > 0) {
            setAcademicYears(years);
            const active = years.find((y) => y.closureDate?.isActive) || years[years.length - 1];
            setAcademicYearId(active.academicYearId);
            if (active?.closureDate) {
              setInitialClosureDate(active.closureDate.initialClosureDate || null);
              setFinalClosureDate(active.closureDate.finalClosureDate     || null);
            }
          }
        }
      })
      .catch(() => {});

    if (isEdit) {
      setLoadingEdit(true);
      getContribution(editId)
        .then((res) => {
          if (res.success !== false) {
            const d = res.data ?? res;
            if (d && typeof d === "object" && !Array.isArray(d)) {
              setTitle(d.contributionTitle || d.title || "");
              setDescription(d.description || "");
              if (d.academicYearId) setAcademicYearId(d.academicYearId);
              const fname = d.fileName || d.file_name || d.fileUrl?.split("/").pop() || "";
              if (fname) setExistingFileName(fname);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEdit(false));
    }
  }, []);

  const handleDocUpload = (file) => {
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_DOC_TYPES.includes(ext)) {
      setDocError("Invalid file type. Please upload .doc, .docx, .pdf, or .odt");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError("File is too large. Maximum size is 10 MB.");
      return;
    }
    setDocError("");
    setDocFile(file);
  };

  const getDocIcon = (name) => {
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return "📕";
    if (ext === "odt") return "📗";
    return "📄";
  };

  const handleImgUpload = (files) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - imgFiles.length;
    if (remaining <= 0) { setImgError(`Maximum ${MAX_IMAGES} image allowed.`); return; }
    const toAdd = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (!ACCEPTED_IMG_TYPES.includes(ext)) {
        setImgError("Invalid image type. Accepted: .jpg, .jpeg, .png, .gif, .webp");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImgError("Image too large. Maximum 5 MB per image.");
        continue;
      }
      toAdd.push({ file, preview: URL.createObjectURL(file) });
    }
    if (toAdd.length > 0) {
      setImgError("");
      setImgFiles((prev) => [...prev, ...toAdd]);
    }
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  const removeImg = (idx) => {
    setImgFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("Please enter a contribution title."); return; }
    if (!isEdit && !academicYearId) { setError("Please select an academic year."); return; }
    if (!isEdit && !docFile) { setError("Please upload a document file (.doc, .docx, .pdf, or .odt)."); return; }
    if (!agreed) { setError("Please agree to the Terms & Conditions."); return; }

    setSubmitting(true);
    try {
      let res;
      if (isEdit) {
        res = await updateContribution(
          editId,
          { contributionTitle: title.trim(), description: description.trim() },
          docFile || null,
          imgFiles[0]?.file ?? null
        );
      } else {
        res = await submitContribution(
          academicYearId,
          title.trim(),
          description.trim(),
          docFile,
          imgFiles[0]?.file ?? null
        );
      }
      if (res.success === false) throw new Error(res.message || (isEdit ? "Update failed." : "Submission failed."));
      imgFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setSuccess(true);
      setTimeout(() => router.push("/user/student"), 2500);
    } catch (err) {
      setError(err.message || (isEdit ? "Update failed. Please try again." : "Submission failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const avatarInfo = user
    ? { initial: (user.username || "S")[0].toUpperCase(), name: user.username || "Student", role: "Student" }
    : { initial: "S", name: "Student", role: "Student" };

  const facultyName = user?.faculty?.facultyName || user?.facultyName || "";

  const sidebarConfig = {
    profile: {
      initial: avatarInfo.initial,
      name: avatarInfo.name,
      subtitle: facultyName || "Student",
      role: "Student",
      avatarStyle: { background: "linear-gradient(135deg,#1a4a8a,#2a70c0)" },
    },
    sections: [
      {
        title: "Navigation",
        items: [
          { icon: "🏠", label: "Dashboard",       href: "/user/student" },
          { icon: "📝", label: "New Contribution", href: "/user/student/submit", active: true },
        ],
      },
    ],
  };

  /* ── Success state ── */
  if (success) {
    return (
      <>
        <Topbar avatar={avatarInfo} />
        <div className="dash">
          <Sidebar {...sidebarConfig} />
          <main className="main-content">
            <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
              <div style={{ fontSize: 72, marginBottom: 24 }}>{isEdit ? "✅" : "✅"}</div>
              <h2 style={{ fontFamily: "'Libre Baskerville', serif", color: "var(--navy)", marginBottom: 12 }}>
                {isEdit ? "Updated Successfully!" : "Submitted Successfully!"}
              </h2>
              <p style={{ color: "var(--text-mid)", marginBottom: 8, fontSize: 15 }}>
                {isEdit
                  ? "Your contribution has been updated."
                  : "Your contribution has been submitted for review."}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Redirecting to dashboard…
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  /* ── Edit loading state ── */
  if (loadingEdit) {
    return (
      <>
        <Topbar avatar={avatarInfo} />
        <div className="dash">
          <Sidebar {...sidebarConfig} />
          <main className="main-content">
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Loading contribution…
            </div>
          </main>
        </div>
      </>
    );
  }

  /* ── Closure gate ── */
  const now = Date.now();
  const parsedInitial = initialClosureDate ? new Date(initialClosureDate.replace(" ", "T").replace(/\+00$/, "Z")) : null;
  const parsedFinal   = finalClosureDate   ? new Date(finalClosureDate.replace(  " ", "T").replace(/\+00$/, "Z")) : null;
  const pastFinal   = parsedFinal   ? now > parsedFinal.getTime()   : false;
  const pastInitial = parsedInitial ? now > parsedInitial.getTime() : false;

  if (!isEdit && pastInitial) {
    return (
      <>
        <Topbar avatar={avatarInfo} />
        <div className="dash">
          <Sidebar {...sidebarConfig} />
          <main className="main-content">
            <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
              <h2 style={{ fontFamily: "'Libre Baskerville', serif", color: "var(--navy)", marginBottom: 12 }}>
                Submissions Closed
              </h2>
              <p style={{ color: "var(--text-mid)", fontSize: 15, marginBottom: 20 }}>
                The initial closure date has passed. New contributions can no longer be submitted.
                {!pastFinal && " You can still edit your existing submissions."}
              </p>
              <button className="btn btn-outline btn-lg" onClick={() => router.push("/user/student")}>
                ← Back to Dashboard
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (isEdit && pastFinal) {
    return (
      <>
        <Topbar avatar={avatarInfo} />
        <div className="dash">
          <Sidebar {...sidebarConfig} />
          <main className="main-content">
            <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
              <h2 style={{ fontFamily: "'Libre Baskerville', serif", color: "var(--navy)", marginBottom: 12 }}>
                Editing Closed
              </h2>
              <p style={{ color: "var(--text-mid)", fontSize: 15, marginBottom: 20 }}>
                The final closure date has passed. Contributions can no longer be edited.
              </p>
              <button className="btn btn-outline btn-lg" onClick={() => router.push("/user/student")}>
                ← Back to Dashboard
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar avatar={avatarInfo} />
      <div className="dash">
        <Sidebar {...sidebarConfig} />
        <main className="main-content">

          {/* Page header */}
          <div className="pg-header">
            <div>
              <div className="pg-title">
                {isEdit ? "✏️ Edit Contribution" : "Submit a Contribution"}
              </div>
              <div className="pg-sub">
                {isEdit
                  ? "Update your title, description, or replace the uploaded files."
                  : `${facultyName ? `${facultyName} · ` : ""}Fill in all required fields and upload your document.`}
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => router.push("/user/student")}>
              ← Back to Dashboard
            </button>
          </div>

          {/* Edit mode banner */}
          {isEdit && (
            <div className="alert info" style={{ marginBottom: 16 }}>
              <span className="alert-icon">✏️</span>
              <div>
                You are editing an existing contribution. You can update the title, description, or replace the document and image. Leave file fields empty to keep the existing files.
              </div>
            </div>
          )}

          {error && (
            <div className="alert dang" style={{ marginBottom: 16 }}>
              <span className="alert-icon">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {/* Article details card */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch">
              <div>
                <div className="ch-title">Article Details</div>
                <div className="ch-sub">Provide your article title, description, and select the academic year.</div>
              </div>
            </div>
            <div className="cb">

              {/* Academic year */}
              <div className="fgroup">
                <label>Academic Year *</label>
                <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} disabled={isEdit}>
                  {academicYears.length === 0
                    ? <option value="">Loading…</option>
                    : academicYears.map((ay) => {
                        const s = ay.startDate ? new Date(ay.startDate).getFullYear() : null;
                        const e = ay.endDate   ? new Date(ay.endDate).getFullYear()   : null;
                        const label = s && e && s !== e ? `${s} / ${e}` : s ? String(s) : (ay.academicYearId?.slice(0, 8) || "Academic Year");
                        return <option key={ay.academicYearId} value={ay.academicYearId}>{label}</option>;
                      })
                  }
                </select>
              </div>

              {/* Title */}
              <div className="fgroup">
                <label>Contribution Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a clear, descriptive title for your article…"
                  maxLength={200}
                />
                {title.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {title.length} / 200 characters
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="fgroup">
                <label>Description <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(Optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief summary of what your article is about…"
                  style={{ minHeight: 90, resize: "vertical" }}
                  maxLength={1000}
                />
              </div>
            </div>
          </div>

          {/* File upload card */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch">
              <div>
                <div className="ch-title">Upload Files</div>
                <div className="ch-sub">
                  {isEdit
                    ? "Upload new files to replace existing ones, or leave blank to keep current files."
                    : "Upload your article document and any supporting images."}
                </div>
              </div>
            </div>
            <div className="cb">

              {/* Document upload */}
              <div className="fgroup">
                <label>
                  Article Document {isEdit ? <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(Optional — replaces existing)</span> : "*"}
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>
                    .doc · .docx · .pdf · .odt — max 10 MB
                  </span>
                </label>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf,.odt"
                  style={{ display: "none" }}
                  onChange={(e) => handleDocUpload(e.target.files[0])}
                />

                {/* Existing file indicator (edit mode) */}
                {isEdit && existingFileName && !docFile && (
                  <div className="uploaded-file-row" style={{ marginBottom: 8, background: "var(--sky)" }}>
                    <span className="uf-icon">{getDocIcon(existingFileName)}</span>
                    <div className="uf-info">
                      <div className="uf-name">{existingFileName}</div>
                      <div className="uf-size" style={{ color: "var(--text-muted)" }}>Current file — upload a new one to replace</div>
                    </div>
                  </div>
                )}

                {!docFile ? (
                  <div
                    className="upload-zone"
                    onClick={() => docInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleDocUpload(e.dataTransfer.files[0]); }}
                  >
                    <div className="uz-icon">📄</div>
                    <div className="uz-text">Drag &amp; drop or <strong>click to browse</strong></div>
                    <div className="uz-hint">{isEdit ? "Upload a new file to replace the existing one" : "Accepted: .doc · .docx · .pdf · .odt · Max 10 MB"}</div>
                  </div>
                ) : (
                  <div className="uploaded-file-row">
                    <span className="uf-icon">{getDocIcon(docFile.name)}</span>
                    <div className="uf-info">
                      <div className="uf-name">{docFile.name}</div>
                      <div className="uf-size">{formatFileSize(docFile.size)}</div>
                    </div>
                    <button
                      className="uf-remove"
                      onClick={() => { setDocFile(null); if (docInputRef.current) docInputRef.current.value = ""; }}
                    >✕</button>
                  </div>
                )}
                {docError && (
                  <div className="alert dang" style={{ marginTop: 10, marginBottom: 0 }}>
                    <span className="alert-icon">⚠️</span><div>{docError}</div>
                  </div>
                )}
              </div>

              {/* Image upload */}
              <div className="fgroup" style={{ marginBottom: 0 }}>
                <label>
                  Supporting Image
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>
                    Optional · .jpg · .png · .gif · .webp — max 5 MB · 1 image
                  </span>
                </label>
                <input
                  ref={imgInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handleImgUpload(e.target.files)}
                />

                {imgFiles.length < MAX_IMAGES && (
                  <div
                    className="upload-zone"
                    onClick={() => imgInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleImgUpload(e.dataTransfer.files); }}
                  >
                    <div className="uz-icon">🖼️</div>
                    <div className="uz-text">Drag &amp; drop or <strong>click to browse</strong></div>
                    <div className="uz-hint">{isEdit ? "Upload a new image to replace the existing one" : "Up to 1 image · 5 MB"}</div>
                  </div>
                )}

                {imgFiles.length > 0 && (
                  <div className="img-upload-grid">
                    {imgFiles.map((item, idx) => (
                      <div key={idx} className="img-upload-thumb">
                        <img src={item.preview} alt={item.file.name} />
                        <button className="img-thumb-remove" onClick={() => removeImg(idx)} title="Remove image">✕</button>
                        <div className="img-thumb-name">{item.file.name}</div>
                        <div className="img-thumb-size">{formatFileSize(item.file.size)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {imgError && (
                  <div className="alert dang" style={{ marginTop: 10, marginBottom: 0 }}>
                    <span className="alert-icon">⚠️</span><div>{imgError}</div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Terms card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch">
              <div className="ch-title">Terms &amp; Conditions</div>
            </div>
            <div className="cb">
              <div className="alert info" style={{ marginBottom: 16 }}>
                <span className="alert-icon">📋</span>
                <div>
                  By {isEdit ? "updating" : "submitting"}, you confirm this is your original work and grant the University the right to publish it in the annual magazine.
                </div>
              </div>
              <div className="tc-row" style={{ marginBottom: 0 }}>
                <input
                  type="checkbox"
                  id="tc-submit"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  disabled={submitting}
                />
                <label htmlFor="tc-submit">
                  I have read and agree to the <a href="#">Terms &amp; Conditions</a>. This is my original work.
                </label>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => router.push("/user/student")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-navy btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting
                ? (isEdit ? "Updating…" : "Submitting…")
                : (isEdit ? "✏️ Update Contribution →" : "Submit Contribution →")}
            </button>
          </div>

        </main>
      </div>
    </>
  );
}

export default function SubmitContribution() {
  return (
    <Suspense>
      <SubmitContributionInner />
    </Suspense>
  );
}
