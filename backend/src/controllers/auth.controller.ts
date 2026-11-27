
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { Role } from "@prisma/client";

export const signup = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      grade,
      plant,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: "Name, email, password and role are required",
      });
    }

    const isDirector = role === "DIRECTOR";

    if (!isDirector && !department) {
      return res.status(400).json({
        error: "Department is required",
      });
    }

    if (!isDirector && !grade) {
      return res.status(400).json({
        error: "Grade is required",
      });
    }

    if (!isDirector && !plant) {
      return res.status(400).json({
        error: "Plant is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(400).json({
        error: "Email already in use",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

   
    
    
    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashed,
        role: role as Role,
        department: department ?? "",
        grade: grade ? parseInt(String(grade), 10) : undefined,
        plant: plant ?? "",
        isApproved: false,
      },
    });



    res.status(201).json({
      message:
        "Registration successful. Please wait for admin approval before logging in.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        error: "Your account is pending admin approval. Please wait.",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        grade: user.grade,
        plant: user.plant,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        grade: true,
        plant: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const changePassword = async (
  req: Request,
  res: Response
) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!valid) {
      return res.status(400).json({
        error: "Current password is incorrect",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password: hashed },
    });

    res.json({
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
