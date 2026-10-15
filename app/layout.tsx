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
      </head>
      <body>
        <Air />
        {children}
        <Docks />
      </body>
    </html>
  );
}
