import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // You can add custom logic here later
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token; // only logged in users
      },
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/feed",
    "/profile",
    "/profile/edit",
    "/create",
    "/settings",
  ],
};
