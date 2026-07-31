import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signAccessToken, signRefreshToken, hashToken } from "@/lib/auth";

const GOOGLE_PROVIDER_ID = "google";
const DEFAULT_USER_ROLE = "poster";
const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === GOOGLE_PROVIDER_ID) {
        try {
          await connectDB();
          
          const oauthId = user.id;
          const email = user.email;
          const name = user.name || "Google User";

          if (!email) {
            console.error("Google OAuth failed: No email provided by Google");
            return false;
          }

          let userRecord = await User.findOne({ email });

          if (userRecord) {
            // If they registered with credentials before, link the Google account
            if (!userRecord.oauthId) {
              userRecord.oauthProvider = GOOGLE_PROVIDER_ID;
              userRecord.oauthId = oauthId;
              await userRecord.save();
            }
          } else {
            // Create a new user for first-time Google sign-in
            userRecord = await User.create({
              name,
              email,
              role: DEFAULT_USER_ROLE,
              oauthProvider: GOOGLE_PROVIDER_ID,
              oauthId: oauthId,
            });
          }

          // Generate our custom JWTs
          const accessToken = signAccessToken({
            userId: userRecord._id.toString(),
            role: userRecord.role,
          });
          const refreshToken = signRefreshToken(userRecord._id.toString());
          const hashedRefreshToken = hashToken(refreshToken);

          userRecord.refreshTokenHash = hashedRefreshToken;
          await userRecord.save();

          // Set cookies
          const cookieStore = await cookies();
          
          cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: ACCESS_TOKEN_MAX_AGE,
            path: "/",
          });

          cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: REFRESH_TOKEN_MAX_AGE,
            path: "/",
          });

          return true; // Proceed with sign in
        } catch (error) {
          console.error("Error during Google sign-in:", error);
          return false; // Reject sign in
        }
      }
      return true;
    },
  },
});

export { handler as GET, handler as POST };
