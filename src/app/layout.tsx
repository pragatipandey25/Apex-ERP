import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex Tape ERP - Tape Factory Stock Management System",
  description: "Production-grade Tape Factory Stock Management & BOM System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
