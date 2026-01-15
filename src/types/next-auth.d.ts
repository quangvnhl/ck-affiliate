import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Mở rộng User type để bao gồm role
declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: "admin" | "user";
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      role: "admin" | "user";
    } & DefaultSession["user"];
  }
}

// Mở rộng JWT type để bao gồm id và role
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "admin" | "user";
  }
}
