import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import github from "next-auth/providers/github";
import { NextResponse } from "next/server";
import { prisma } from "./prisma/db";
export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    github({
      /** Vulnerable code
			 	profile(profile) {
				return {
          role: profile.role || "user", // No validation of roles; can be manipulated.
          id: String(profile.id), // Accepts ID without validation.
					email: profile.email, // Assumes email is trustworthy without verification.
					image: profile.avatar_url,
          name: profile.name,
        };
			}
			vulnerable code end
			**/

      /** Secure code */
      profile(profile) {
        // Sanitize and validate profile data:
        const sanitizedEmail = profile.email?.trim().toLowerCase();
        const role = ["user", "admin"].includes(profile.role as string)
          ? profile.role
          : "user";
        return {
          role,
          id: String(profile.id),
          email: sanitizedEmail,
          image: profile.avatar_url,
          name: profile.name?.trim(),
        };
      },
      /**	Secure code end */
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnHome = nextUrl.pathname.startsWith("/");
      if (isOnHome && !isLoggedIn) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        // return false // Redirects but doesn't secure /login properly.
        return NextResponse.redirect(new URL("/", nextUrl)); // secure code
      }
      // return true; // Default allows access without strict checks.

      return isLoggedIn; // only allow access if logged in
    },
    /** vulnerable code start
		jwt({ token, user }) {
      //@ts-ignore
      // Directly assigns role without validation:
      if (user) token.role = user.role; // Vulnerable to role escalation.
      return token;
    },

		session({ session, token }) {
      //@ts-ignore
      // Directly assigns role from token:
      session.user.role = token.role; // No verification of token integrity.
      return session;
    },

		vulnerable code end
		**/

		/** secure code start */
		jwt({ token, user }) {
      // Validate and sanitize roles during token creation:
      if (user) {
        //@ts-ignore
        const role = ["user", "admin"].includes(user.role) ? user.role : "user";
        token.role = role;
      }
      return token;
    },

    session({ session, token }) {
			// Verify token integrity before assigning roles:
			// @ts-ignore
      if (token && ["user", "admin"].includes(token.role)) {
				// @ts-ignore
        session.user.role = token.role;
      } else {
				// @ts-ignore
        session.user.role = "user"; // Default to a safe role.
      }
      return session;
		},
		/** secure code end */
  },
} satisfies NextAuthConfig;
