import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuant",
  description: "Quantitative Research Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var t=localStorage.getItem('theme');
          if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))
          document.documentElement.classList.add('dark')})()
        `}} />
      </head>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-[Inter,system-ui,sans-serif] antialiased transition-colors">
        {children}
      </body>
    </html>
  );
}
