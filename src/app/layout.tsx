import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Along",
  description: "Watch a tutorial. Open the code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("codealong-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
