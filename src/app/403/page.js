"use client";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { ROLE_HOME } from "@/lib/roles";

export default function ForbiddenPage() {
  const router = useRouter();

  const handleGoHome = () => {
    const user = getUser();
    const role = (user?.roleName || user?.role || "").toUpperCase();
    const home = ROLE_HOME[role] || "/login";
    router.push(home);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f0f4ff 0%, #e8eef8 100%)",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      padding: "24px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 8px 40px rgba(26,58,106,0.12)",
        padding: "56px 48px",
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fee2e2, #fecaca)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 36,
        }}>
          🚫
        </div>

        <div style={{ fontSize: 72, fontWeight: 800, color: "#dc2626", lineHeight: 1, marginBottom: 8 }}>
          403
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a3a6a", marginBottom: 12 }}>
          Access Forbidden
        </div>

        <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 32 }}>
          You don&apos;t have permission to access this page.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleGoHome}
            style={{
              background: "linear-gradient(135deg, #1a3a6a, #2a5fa8)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "opacity .15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Go to My Dashboard
          </button>

          <button
            onClick={() => router.push("/login")}
            style={{
              background: "none",
              color: "#2a5fa8",
              border: "1.5px solid #2a5fa8",
              borderRadius: 8,
              padding: "11px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign In with a Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
