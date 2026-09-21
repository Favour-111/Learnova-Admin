import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Every admin route requires a signed-in Clerk session. Role checking
// (role === "admin") happens server-side in the backend's requireAdmin
// middleware on every /api/admin/* call  this only gates page access.
//
// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`;
// Clerk's own `clerkMiddleware` wrapper is unaffected by that rename and
// still works as the default export here.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/verify(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
