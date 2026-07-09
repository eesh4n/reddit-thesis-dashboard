import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reddit Stock Dashboard",
  description: "Stock theses and sentiment from Reddit.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
