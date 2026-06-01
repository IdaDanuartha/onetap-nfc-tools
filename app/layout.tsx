import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OneTap NFC Admin Tools",
    template: "%s | OneTap NFC Admin",
  },
  description: "Dashboard administrasi dan perkakas OneTap NFC untuk manajemen produk, penulisan tag NFC, verifikasi, dan pemantauan absensi terintegrasi.",
  keywords: ["OneTap NFC", "NFC Tools", "Admin Dashboard", "Write NFC", "Read NFC", "Verify NFC", "PWA NFC Tools"],
  authors: [{ name: "OneTap NFC Developer Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/logo_simple.png", sizes: "any" },
      { url: "/images/logo_simple.png", type: "image/png", sizes: "192x192" },
      { url: "/images/logo_simple.png", type: "image/png", sizes: "512x512" }
    ],
    apple: [
      { url: "/images/logo_simple.png", sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OneTap NFC Tools",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://tools.onetapnfc.com",
    title: "OneTap NFC Admin Tools",
    description: "Dashboard administrasi dan perkakas OneTap NFC untuk manajemen produk, penulisan tag NFC, verifikasi, dan pemantauan absensi terintegrasi.",
    siteName: "OneTap NFC Tools",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneTap NFC Admin Tools",
    description: "Dashboard administrasi dan perkakas OneTap NFC untuk manajemen produk, penulisan tag NFC, verifikasi, dan pemantauan absensi terintegrasi.",
  }
};

export const viewport = {
  themeColor: "#0047FF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
