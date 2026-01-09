// app/chat/page.tsx
import ChatPage from "./ChatPage";

export default function ChatPageRoute() {
  return <ChatPage />;
}

// app/layout.tsx (or your page layout)
export function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* <SimpleNavbar /> */}
      {children}
    </>
  );
}