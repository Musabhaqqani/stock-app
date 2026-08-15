import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Serif_4, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portfolio Rebalancer",
  description: "Target-weighted portfolio tracker with live NSE prices",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Font variables must sit on <html>, not <body>: Tailwind resolves
    // --font-display against :root, so defining them lower in the tree makes
    // the theme silently fall back to system fonts.
    //
    // suppressHydrationWarning is required by next-themes, which writes the
    // theme class onto <html> before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        sourceSerif.variable,
        plexMono.variable,
        geist.variable,
        "font-sans",
      )}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
