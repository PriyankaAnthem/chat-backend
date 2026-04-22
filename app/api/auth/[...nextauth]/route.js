import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowed = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
      return allowed.includes(user.email);
    },
    async session({ session }) {
      return session;
    },
  },
  // ✅ No custom pages — NextAuth uses its built-in Google popup directly
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };