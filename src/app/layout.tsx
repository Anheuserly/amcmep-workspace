import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "AMC MEP 24x7 — One App",
  description:
    "Unified platform for AMC MEP services. Customers, partners, and administrators — all in one place.",
  keywords: ["AMC", "MEP", "HVAC", "fire safety", "maintenance", "services"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-screen bg-surface font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "12px 16px",
                fontSize: "14px",
                fontFamily: "var(--font-poppins), sans-serif",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
