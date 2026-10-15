import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { cssVariables } from "@/tokens";
import Air from "./air";
import Docks from "./docks";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <style>{cssVariables()}</style>
        {/* Kevin's Adobe Fonts kit: Argent Pixel CF and Le Monde Livre (Trade Gothic Next is in the kit, unused) */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="" />
        <link rel="stylesheet" href="https://use.typekit.net/xml4asp.css" />
      </head>
      <body>
        <Air />
        {children}
        <Docks />
      </body>
    </html>
  );
}
