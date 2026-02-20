// app/layout.tsx
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Inter } from "next/font/google";
import Script from "next/script";
import { getServerSession } from "next-auth";
import { dbConnect } from "./lib/mongodb";
import User from "./models/User";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OrbitByte",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // 🔐 Default Theme (non-premium fallback)
  let theme = {
    background: "#000000",
    card: "#111111",
    accent: "#7c3aed",
    text: "#ffffff",
    radius: "20px",
  };

  // 🔎 Fetch Session
  const session = await getServerSession();

 if (session?.user?.email) {
  await dbConnect();

  const user = await User.findOne({
    email: session.user.email,
  });

  if (user?.isPremium && user?.uiTheme) {
    theme = user.uiTheme;
  }
}

  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
        style={{
          backgroundColor: theme.background,
          color: theme.text,
          // CSS Variables for global usage
          ["--card-color" as any]: theme.card,
          ["--accent-color" as any]: theme.accent,
          ["--radius" as any]: theme.radius,
        }}
      >
        {/* External SDK */}
        <Script
          src="https://cdn.metered.ca/sdk/frame/1.4.3/sdk-frame.min.js"
          strategy="beforeInteractive"
        />

        <ClientLayout>
          {children}
        </ClientLayout>

      </body>
    </html>
  );
}
