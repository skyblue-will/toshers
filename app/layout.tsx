import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "toshers — Mayhew's London street-finders, as a source library for AI agents",
  description:
    "An MCP server and REST API exposing Henry Mayhew's 1851 reportage on London's bone-grubbers, pure-finders, sewer-hunters, mud-larks, and dustmen — curated as a source library for any coding agent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
