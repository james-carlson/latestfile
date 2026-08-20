import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://latest.dev"),
  title: "Latestfile — declare how you use AI",
  description:
    "An open, portable format for declaring how a developer, team, or org uses AI. package.json for your AI setup.",
  openGraph: {
    title: "Latestfile — declare how you use AI",
    description:
      "An open, portable format for declaring how a developer, team, or org uses AI.",
    url: "https://latest.dev",
    siteName: "Latestfile",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <header className="masthead">
            <div className="brand">
              <a href="/">latestfile</a> <span>· latest.dev</span>
            </div>
            <nav className="nav">
              <a href="/new">Build</a>
              <a href="/validate">Validate</a>
              <a href="/spec">Spec</a>
              <a href="https://github.com/james-carlson/latestfile">GitHub</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
