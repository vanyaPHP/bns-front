import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Белоруснефть — корпоративный портал",
    template: "%s · Белоруснефть",
  },
  description: "Корпоративная информационная система ГПО «Белоруснефть»",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="ru" className={`${manrope.variable} ${theme === "dark" ? "dark" : ""} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
