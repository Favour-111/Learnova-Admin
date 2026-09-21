import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Learnova Admin",
  description: "Manage Learnova courses, users, and content.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      {/* suppressHydrationWarning here only: browser extensions (password
          managers, ad blockers, etc.) commonly inject attributes onto
          <html>/<body> before React hydrates  this is React's documented
          workaround for that specific, unavoidable class of mismatch. It
          does not suppress mismatches in children. */}
      <html lang="en" suppressHydrationWarning className={inter.variable}>
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
