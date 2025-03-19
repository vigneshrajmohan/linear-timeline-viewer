import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

// Extend the Session type to include accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Linear OAuth provider configuration
const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "linear",
      name: "Linear",
      type: "oauth",
      clientId: "0f0478b658475f5357f1228d5e1461ff",
      clientSecret: "69959a09c9f334e2a21238f73a09574d",
      authorization: {
        url: "https://linear.app/oauth/authorize",
        params: { scope: "read" }
      },
      token: "https://api.linear.app/oauth/token",
      userinfo: {
        url: "https://api.linear.app/graphql",
        async request({ tokens }) {
          try {
            const response = await fetch("https://api.linear.app/graphql", {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                "Content-Type": "application/json"
              },
              method: "POST",
              body: JSON.stringify({
                query: `query { viewer { id name email avatarUrl } }`
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error("Error in userinfo:", response.status, errorText);
              throw new Error(`Failed to fetch user info: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Linear userinfo response:", data);
            return data.data.viewer;
          } catch (error) {
            console.error("Error in userinfo request:", error);
            throw error;
          }
        }
      },
      profile(profile) {
        console.log("Linear profile:", profile);
        return {
          id: profile.id,
          name: profile.name || "Linear User",
          email: profile.email,
          image: profile.avatarUrl,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      console.log("JWT callback - token:", token);
      console.log("JWT callback - account:", account);
      
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback - session:", session);
      console.log("Session callback - token:", token);
      
      // Send properties to the client, like an access_token from a provider
      session.accessToken = token.accessToken as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-for-development-only",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
