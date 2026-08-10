import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Inter } from "next/font/google";
import Script from "next/script";
import { getServerSession } from "next-auth";
import { dbConnect } from "./lib/mongodb";
import User from "./models/User";
import { isPremiumActive } from "./lib/premium";
import { authOptions } from "./lib/authOptions";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OrbitByte",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let theme = {
    background: "#000000",
    card: "#111111",
    accent: "#7c3aed",
    text: "#ffffff",
    radius: "20px",
  };

  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    await dbConnect();

    const user = await User.findOne({
      email: session.user.email,
    });

    if (isPremiumActive(user) && user?.uiTheme) {
      theme = user.uiTheme;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var savedTheme = localStorage.getItem("theme");
                var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                var shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;
                document.documentElement.classList.toggle("dark", shouldUseDark);
              } catch (e) {}
            })();
          `}
        </Script>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/icons/icon23.png" />
      </head>
      <body
        className={`${inter.className} antialiased`}
        style={
          {
            "--card-color": theme.card,
            "--accent-color": theme.accent,
            "--radius": theme.radius,
          } as React.CSSProperties
        }
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
