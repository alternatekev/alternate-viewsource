import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { cssVariables } from "@/tokens";
import Air from "./air";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Kevin Conboy has built for the web since 1998. His story, told in his voice, phase by phase.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <style>{cssVariables()}</style>
      </head>
      <body>
        <Air />
        {children}
      </body>
    </html>
  );
}
