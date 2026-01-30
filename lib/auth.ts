import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
};

export type SessionPayload = JWTPayload & {
  userId: string;
  role: "admin";
  email: string;
};

export const createSessionToken = async (payload: SessionPayload) => {
  const secret = getSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
};

export const verifySessionToken = async (token: string) => {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as SessionPayload;
};
