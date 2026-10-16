import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homecare Jobs",
  description: "A private home care jobs tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
