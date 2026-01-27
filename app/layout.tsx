// app/layout.tsx
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Inter } from "next/font/google";
import { SocketProvider } from "./context/SocketContext";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "OrbitByte",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
        <head>
        <Script
          src="https://cdn.metered.ca/sdk/frame/1.4.3/sdk-frame.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ClientLayout>
           <SocketProvider>
          {children}
          </SocketProvider>
        </ClientLayout>
      </body>
    </html>
  );
}
