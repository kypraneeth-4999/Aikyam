import type { Metadata, Viewport } from "next";
import { Abril_Fatface, Poppins } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/config/app";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { THEME_INIT_SCRIPT } from "@/components/theme";

const abril = Abril_Fatface({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-abril",
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aikyam — cultural events across India",
    template: "%s · Aikyam",
  },
  description:
    "Aikyam is a marketplace for India's cultural events — classical concerts, dance, theatre, folk performances, heritage walks, and craft fairs. Discover, book, and host.",
  applicationName: "Aikyam",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(SITE_URL),
  appleWebApp: { capable: true, title: "Aikyam", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b0914",
  // Let content reach the edges so env(safe-area-inset-*) works on notched phones.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${abril.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before paint — avoids a flash of the wrong colours. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-ink text-cream">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
