import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "SST-RAG // Voice & Multimodal Verified Retrieval",
  description: "Transform spoken and text queries into sub-200ms grounded answers from Pinecone MS-MARCO dataset.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" style={{ colorScheme: "dark" }}>
      <body className="min-h-full flex flex-col bg-black text-white antialiased selection:bg-cyan-500/30 selection:text-white relative">
        {children}
        {/* Runtime — load once per app */}
        <Script
          src="https://cdn.aidesigner.ai/effects/runtime/v1.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

