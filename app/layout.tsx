import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photo Route Mapper",
  description: "Map travel photos into a chronological route with EXIF extraction and manual correction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
