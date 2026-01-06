import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/feed",
    "/profile",
    "/profile/edit",
    "/create",
    "/settings",
  ]
};
