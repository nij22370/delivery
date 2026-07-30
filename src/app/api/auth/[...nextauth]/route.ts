import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "@/lib/db";
import User from "@/models/User";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          await connectDB();
          
          const oauthId = user.id;
          const email = user.email;
          const name = user.name || "Google User";

          if (!email) {
            console.error("Google OAuth failed: No email provided by Google");
            return false;
          }

          // Check if user already exists
          const existingUser = await User.findOne({ email });

          if (existingUser) {
            // If they registered with credentials before, link the Google account
            if (!existingUser.oauthId) {
              existingUser.oauthProvider = "google";
              existingUser.oauthId = oauthId;
              await existingUser.save();
            }
          } else {
            // Create a new user for first-time Google sign-in
            await User.create({
              name,
              email,
              role: "poster", // Default role for new users
              oauthProvider: "google",
              oauthId: oauthId,
            });
          }
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
