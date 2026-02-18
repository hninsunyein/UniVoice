"use client";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";

export default function SubmitContribution() {
  const router = useRouter();

  return (
    <>
      <Topbar
        userInfo="<strong>Hnin Su Nyein</strong> · Student"
        backTo="/student"
        backLabel="← Back"
      />
      <div className="main-content" style={{ maxWidth: 740, margin: "0 auto", width: "100%", padding: "32px 20px" }}>
        <div className="pg-header">
          <div className="pg-title">Submit a Contribution</div>
          <div className="pg-sub">Academic Year 2025/26 · Faculty of Engineering</div>
        </div>

        <div className="alert warn">
          <span className="alert-icon">⚠️</span>
          <div><strong>Closure Date:</strong> 22 February 2026 — only <strong>5 days</strong> remain to submit new contributions.</div>
        </div>

        <div className="card">
          <div className="ch"><div className="ch-title">Article Details</div></div>
          <div className="cb">
            <div className="frow">
              <div className="fgroup">
                <label>Contribution Title *</label>
                <input type="text" placeholder="Enter a descriptive title…" />
              </div>
              <div className="fgroup">
                <label>Faculty *</label>
                <select>
                  <option>Engineering</option>
                  <option>Science</option>
                  <option>Business</option>
                  <option>Arts &amp; Humanities</option>
                  <option>Education</option>
                </select>
              </div>
            </div>
            <div className="fgroup">
              <label>Upload Word Document (.docx) *</label>
              <div className="upload-zone">
                <div className="uz-icon">📄</div>
                <div className="uz-text">Drag &amp; drop your <strong>.docx</strong> file here, or <strong>click to browse</strong></div>
                <div className="uz-hint">Accepted: .docx only · Max size: 10 MB</div>
              </div>
            </div>
            <div className="fgroup">
              <label>Upload Images (Optional)</label>
              <div className="upload-zone">
                <div className="uz-icon">🖼️</div>
                <div className="uz-text">Drag &amp; drop <strong>JPG / PNG</strong> images, or <strong>click to browse</strong></div>
                <div className="uz-hint">Multiple files · High quality recommended · Max 5 MB each</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ch"><div className="ch-title">Terms &amp; Conditions Agreement</div></div>
          <div className="cb">
            <div className="alert info" style={{ marginBottom: 14 }}>
              <span className="alert-icon">📋</span>
              <div>Before submitting, please confirm you have read and understood the University Magazine Terms &amp; Conditions, including copyright and editorial policies.</div>
            </div>
            <div className="tc-row" style={{ marginBottom: 0 }}>
              <input type="checkbox" id="tc2" defaultChecked />
              <label htmlFor="tc2">
                I have read and agree to the <a href="#">Terms &amp; Conditions</a>. I confirm this is my original work and I grant the University the right to publish it in the annual magazine. I understand my contribution will be reviewed by my Faculty&apos;s Marketing Coordinator.
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button className="btn btn-outline btn-lg" onClick={() => router.push("/student")}>Save as Draft</button>
          <button className="btn btn-navy btn-lg" onClick={() => router.push("/student")}>Submit Contribution →</button>
        </div>
      </div>
    </>
  );
}
