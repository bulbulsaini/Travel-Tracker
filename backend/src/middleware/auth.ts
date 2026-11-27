
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { JWTPayload } from "../types";

const getJwtSecret = (): string | null => {
  const secret = process.env.JWT_SECRET;
  return secret && secret.trim().length > 0 ? secret : null;
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const secret = getJwtSecret();
  if (!secret) {
    console.error("JWT_SECRET is not configured in the backend environment.");
    res.status(500).json({ error: "Server authentication is not configured" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.role !== "string"
    ) {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as Role,
    } satisfies JWTPayload;

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "You do not have permission to perform this action" });
      return;
    }

    next();
  };
};
