import Topbar from "@/components/Topbar";

export default function EmailNotificationsPage() {
  return (
    <>
      <Topbar
        userInfo="<strong>Email Notifications</strong> · System Previews"
        backTo="/admin"
        backLabel="← Back"
      />
      <div className="main-content" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="pg-header">
          <div className="pg-title">Email Notification Templates</div>
          <div className="pg-sub">Automatic emails sent by the system — preview of all notification types</div>
        </div>

        {/* Notification Log */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="ch"><div className="ch-title">📥 Recent Notification Log</div></div>
          <div className="cb">
            <div className="notif-list">
              <div className="notif-item">
                <div className="notif-ico nico-blue">📝</div>
                <div className="notif-content">
                  <div className="notif-title">New Contribution Submitted</div>
                  <div className="notif-desc">Hnin Su Nyein submitted &quot;Campus Sustainability Report 2025&quot; — Email sent to Dr. Sarah Lwin (Coordinator, Engineering)</div>
                  <div className="notif-time">18 Jan 2026, 14:32</div>
                </div>
                <div className="notif-unread"></div>
              </div>
              <div className="notif-item">
                <div className="notif-ico nico-green">👥</div>
                <div className="notif-content">
                  <div className="notif-title">Guest Account Registered</div>
                  <div className="notif-desc">A new guest account was registered for Faculty of Engineering — Email sent to Dr. Sarah Lwin (Coordinator)</div>
                  <div className="notif-time">15 Jan 2026, 10:05</div>
                </div>
              </div>
              <div className="notif-item">
                <div className="notif-ico nico-warn">⚠️</div>
                <div className="notif-content">
                  <div className="notif-title">14-Day Comment Reminder</div>
                  <div className="notif-desc">&quot;Campus Sustainability Report 2025&quot; has not received a comment — Reminder sent to Dr. Sarah Lwin</div>
                  <div className="notif-time">01 Feb 2026, 09:00</div>
                </div>
              </div>
              <div className="notif-item">
                <div className="notif-ico nico-blue">✅</div>
                <div className="notif-content">
                  <div className="notif-title">Contribution Selected</div>
                  <div className="notif-desc">Your contribution &quot;AI in Healthcare&quot; has been selected for the 2025/26 University Magazine — Email sent to Hnin Su Nyein</div>
                  <div className="notif-time">12 Jan 2026, 16:20</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email 1: New Contribution */}
        <div style={{ marginBottom: 6, fontSize: "12px", fontWeight: 700, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".5px" }}>
          Template 1 — Coordinator notified of new student submission
        </div>
        <div className="email-preview" style={{ marginBottom: 22 }}>
          <div className="email-header">
            <div className="email-logo">Uni<em>Voice</em> Magazine Portal</div>
          </div>
          <div className="email-body">
            <div className="email-meta">
              <div><span className="lbl">To:</span> dr.sarah.lwin@university.ac.uk</div>
              <div><span className="lbl">From:</span> noreply@univoice.university.ac.uk</div>
              <div><span className="lbl">Subject:</span> New Contribution Submitted — Action Required Within 14 Days</div>
            </div>
            <div className="email-heading">📝 A student has submitted a new contribution</div>
            <p className="email-p">Dear Dr. Sarah Lwin,</p>
            <p className="email-p">A student in your faculty has submitted a new contribution to the <strong>University Magazine 2025/26</strong>. Please review and leave a comment within <strong>14 days</strong> of submission.</p>
            <table style={{ width: "100%", background: "var(--sky)", borderRadius: 8, padding: 14, fontSize: "12.5px", borderCollapse: "collapse", marginBottom: 14 }}>
              <tbody>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)", width: 120 }}>Student:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>Hnin Su Nyein</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Title:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>Campus Sustainability Report 2025</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Faculty:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>Engineering</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Submitted:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>18 January 2026, 14:32</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Deadline:</td><td style={{ padding: "4px 8px", fontWeight: 600, color: "var(--danger)" }}>1 February 2026 (14 days)</td></tr>
              </tbody>
            </table>
            <a className="email-cta" href="#">Review Contribution →</a>
            <p className="email-p" style={{ marginTop: 14, fontSize: "12px" }}>Contributions without a comment after 14 days will appear in the exception report.</p>
          </div>
          <div className="email-footer">University Magazine System · UniVoice · This is an automated notification. Do not reply to this email.</div>
        </div>

        {/* Email 2: Guest Registration */}
        <div style={{ marginBottom: 6, fontSize: "12px", fontWeight: 700, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".5px" }}>
          Template 2 — Coordinator notified when a guest account is registered for their faculty
        </div>
        <div className="email-preview" style={{ marginBottom: 22 }}>
          <div className="email-header">
            <div className="email-logo">Uni<em>Voice</em> Magazine Portal</div>
          </div>
          <div className="email-body">
            <div className="email-meta">
              <div><span className="lbl">To:</span> dr.sarah.lwin@university.ac.uk</div>
              <div><span className="lbl">From:</span> noreply@univoice.university.ac.uk</div>
              <div><span className="lbl">Subject:</span> New Guest Account Registered for Your Faculty</div>
            </div>
            <div className="email-heading">👥 A guest account has been registered</div>
            <p className="email-p">Dear Dr. Sarah Lwin,</p>
            <p className="email-p">A new <strong>guest account</strong> has been created for the <strong>Faculty of Engineering</strong>. This guest can view all selected contributions in your faculty but cannot edit or download files.</p>
            <table style={{ width: "100%", background: "var(--sky)", borderRadius: 8, padding: 14, fontSize: "12.5px", borderCollapse: "collapse", marginBottom: 14 }}>
              <tbody>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)", width: 120 }}>Guest Name:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>External Reviewer A</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Faculty:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>Engineering</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Access Level:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>View selected articles only</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Registered:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>15 January 2026, 10:05</td></tr>
              </tbody>
            </table>
            <p className="email-p">You can view all registered guests for your faculty in the <strong>Guest Accounts</strong> section of your dashboard.</p>
            <a className="email-cta" href="#">View Guest Accounts →</a>
          </div>
          <div className="email-footer">University Magazine System · UniVoice · This is an automated notification. Do not reply to this email.</div>
        </div>

        {/* Email 3: Contribution Selected */}
        <div style={{ marginBottom: 6, fontSize: "12px", fontWeight: 700, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".5px" }}>
          Template 3 — Student notified when their contribution is selected
        </div>
        <div className="email-preview" style={{ marginBottom: 22 }}>
          <div className="email-header">
            <div className="email-logo">Uni<em>Voice</em> Magazine Portal</div>
          </div>
          <div className="email-body">
            <div className="email-meta">
              <div><span className="lbl">To:</span> hnin@university.ac.uk</div>
              <div><span className="lbl">From:</span> noreply@univoice.university.ac.uk</div>
              <div><span className="lbl">Subject:</span> 🎉 Your contribution has been selected for the University Magazine!</div>
            </div>
            <div className="email-heading">🎉 Congratulations — Your contribution is selected!</div>
            <p className="email-p">Dear Hnin Su Nyein,</p>
            <p className="email-p">We are delighted to inform you that your contribution has been <strong>selected for publication</strong> in the University Magazine 2025/26 by your Faculty&apos;s Marketing Coordinator.</p>
            <table style={{ width: "100%", background: "#e6f7f0", borderRadius: 8, padding: 14, fontSize: "12.5px", borderCollapse: "collapse", marginBottom: 14 }}>
              <tbody>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)", width: 120 }}>Title:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>AI in Healthcare: A New Frontier</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Selected by:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>Dr. Sarah Lwin (Engineering)</td></tr>
                <tr><td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>Date:</td><td style={{ padding: "4px 8px", fontWeight: 600 }}>12 January 2026</td></tr>
              </tbody>
            </table>
            <a className="email-cta" href="#" style={{ background: "var(--success)" }}>View Your Contribution →</a>
          </div>
          <div className="email-footer">University Magazine System · UniVoice · This is an automated notification. Do not reply to this email.</div>
        </div>
      </div>
    </>
  );
}
