import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { SessionUser } from "@/types/user";

const SALT_ROUNDS = 12;
const COOKIE_NAME = "mh_session";
const SESSION_EXPIRY_DAYS = 7;
const REMEMBER_ME_DAYS = 30;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(
  userId: number,
  userType: "super_admin" | "user",
  rememberMe: boolean,
  ip: string,
  userAgent: string
): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  const days = rememberMe ? REMEMBER_ME_DAYS : SESSION_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      userType,
      ipAddress: ip,
      userAgent,
      expiresAt,
    },
  });

  return sessionId;
}

export async function getSession(
  sessionId: string
): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } });
    }
    return null;
  }

  if (session.userType === "super_admin") {
    const admin = await prisma.superAdmin.findUnique({
      where: { id: session.userId },
    });
    if (!admin) return null;
    return {
      id: admin.id,
      userType: "super_admin",
      name: admin.name || admin.username,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    userType: "user",
    code: user.code,
    name: user.name,
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export function setSessionCookie(sessionId: string, rememberMe: boolean) {
  const days = rememberMe ? REMEMBER_ME_DAYS : SESSION_EXPIRY_DAYS;
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export function getSessionFromCookies(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
