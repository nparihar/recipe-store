import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "recipe-store-default-secret-change-me";
const APP_PASSWORD = process.env.APP_PASSWORD || "recipes";

export function login(req: Request, res: Response) {
  const { password } = req.body;

  if (!password || password !== APP_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: "30d" });

  res.cookie("recipe_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });

  return res.json({ success: true });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("recipe_token", { path: "/" });
  return res.json({ success: true });
}

export function checkAuth(req: Request, res: Response) {
  const token = req.cookies?.recipe_token;
  if (!token) return res.json({ authenticated: false });

  try {
    jwt.verify(token, JWT_SECRET);
    return res.json({ authenticated: true });
  } catch {
    return res.json({ authenticated: false });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.recipe_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
