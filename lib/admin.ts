import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";

export const getAdminSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;

  try {
    const session = await verifySessionToken(token);
    if (session.role !== "admin") return null;
    return session as SessionPayload;
  } catch {
    return null;
  }
};

export const isAdminSession = async () => {
  const session = await getAdminSession();
  return Boolean(session);
};
