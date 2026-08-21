import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Assistant // Your AI Knowledge Companion",
  description: "Your AI assistant powered by Retrieval-Augmented Generation. Get accurate answers from your documents and knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" style={{ colorScheme: "dark" }}>
      <body className="min-h-full flex flex-col bg-[#080b13] text-slate-100 antialiased selection:bg-purple-900/50 selection:text-white">
        {children}
      </body>
    </html>
  );
}

