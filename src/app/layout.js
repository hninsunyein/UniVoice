import "./globals.css";

export const metadata = {
  title: "UniVoice – University Magazine System",
  description: "The official platform for collecting student contributions to the University's annual magazine.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
