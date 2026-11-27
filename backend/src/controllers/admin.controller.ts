
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";

import { Role } from "@prisma/client";

import { sendApprovalEmail } from "../lib/mailer";

import ExcelJS from "exceljs";

import PDFDocument from "pdfkit";

import { format } from "date-fns";

const VALID_PLANTS = ["Palwal Plant", "Assam Plant", "Anjar Plant", "Chennai Plant"];

// Import past travel records from an .xlsx file, so bulk-imported data lands
// straight in history (status is set directly to APPROVED/REJECTED, skipping
// the pending pipeline). Expected columns, in order, with a header row:
// Employee Email | HOD Email | Travel Type | From | To | From Date | To Date |
// Purpose | Status | Estimated Cost

export const importRequests = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: "Workbook has no sheet" });

    const users = await prisma.user.findMany({ where: { isApproved: true } });
    const byEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));

    let imported = 0;
    const errors: string[] = [];

    for (let i = 2; i <= sheet.rowCount; i++) { // row 1 = header
      const row = sheet.getRow(i);
      const cell = (n: number) => row.getCell(n).text?.trim();

      const employeeEmail = cell(1);
      if (!employeeEmail) continue; // skip blank rows

      const employee = byEmail.get(employeeEmail.toLowerCase());
      if (!employee) {
        errors.push(`Row ${i}: no user found for ${employeeEmail}`);
        continue;
      }

      const hodEmail = cell(2);
      const hod = hodEmail ? byEmail.get(hodEmail.toLowerCase()) : undefined;

      const travelTypeRaw = (cell(3) || "OUTSIDE").toUpperCase().replace(/\s+/g, "_");
      const travelType = travelTypeRaw === "INTER_COMPANY" ? "INTER_COMPANY" : "OUTSIDE";

      const fromDate = new Date(cell(6));
      const toDate = new Date(cell(7));

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        errors.push(`Row ${i}: invalid date(s)`);
        continue;
      }

      const statusRaw = (cell(9) || "APPROVED").toUpperCase();
      const status = statusRaw === "REJECTED" ? "REJECTED" : "APPROVED";

      const estimatedCostRaw = cell(10);
      const estimatedCost = estimatedCostRaw ? parseFloat(estimatedCostRaw) : undefined;

      await prisma.travelRequest.create({
        data: {
          employeeId: employee.id,
          employeeName: employee.name,
          department: employee.department ?? "",
          hodId: hod?.id ?? employee.id, // fallback keeps the FK valid for legacy rows with no HOD on file
          travelType,
          fromLocation: cell(4) || "—",
          toLocation: cell(5) || "—",
          fromDate,
          toDate,
          purposeOfVisit: cell(8) || "Imported record",
          estimatedCost,
          status,
          hodComment: "Imported from Excel",
          hodApprovedAt: fromDate,
          directorApprovedAt: status === "APPROVED" ? fromDate : null,
        },
      });

      imported++;
    }

    res.json({ imported, failed: errors.length, errors: errors.slice(0, 20) });
  } catch {
    res.status(500).json({ error: "Import failed — check the file format" });
  }
};

// GET all approved users with request counts
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { search, role } = req.query;

    const users = await prisma.user.findMany({
      where: {
        isApproved: true,
        ...(search ? {
          OR: [
            { name: { contains: search as string, mode: "insensitive" } },
            { email: { contains: search as string, mode: "insensitive" } },
            { department: { contains: search as string, mode: "insensitive" } },
          ],
        } : {}),
        ...(role ? { role: role as Role } : {}),
      },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, grade: true, plant: true, createdAt: true,
        _count: { select: { travelRequests: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH update a user's role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles: Role[] = ["EMPLOYEE", "HOD", "DIRECTOR", "TRAVEL_MANAGER", "ADMIN"];
    if (!validRoles.includes(role))
      return res.status(400).json({ error: "Invalid role" });

    if (id === req.user!.userId)
      return res.status(400).json({ error: "Cannot change your own role" });

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, grade: true, plant: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH update user department
export const updateUserDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { department } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Directors do not have a department.
    if (targetUser.role !== "DIRECTOR" && !department) {
      return res.status(400).json({ error: "Department is required" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        department: targetUser.role === "DIRECTOR" ? null : department,
      },
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
    console.error("Update department error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH update user grade
export const updateUserGrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grade } = req.body;

    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 8)
      return res.status(400).json({ error: "Grade must be between 1 and 8" });

    const user = await prisma.user.update({
      where: { id },
      data: { grade: gradeNum },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, grade: true, plant: true,
      },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH update user plant
export const updateUserPlant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { plant } = req.body;

    if (!VALID_PLANTS.includes(plant))
      return res.status(400).json({ error: "Invalid plant" });

    const user = await prisma.user.update({
      where: { id },
      data: { plant },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, grade: true, plant: true,
      },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE user
// DELETE user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.userId)
      return res.status(400).json({ error: "Cannot delete your own account" });

    // Delete user directly — travel requests keep employeeName as string
    // so history is preserved even after user deletion
    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET platform stats

export const getStats = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Build the last 6 calendar months (oldest → newest) for the sparkline trends
    const monthRanges = Array.from({ length: 6 }).map((_, i) => {
      const offset = 5 - i; // 5 = 6 months ago, 0 = current month
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      return { start, end };
    });

    const [
      totalUsers,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      usersByRole,
      newUsersThisMonth,
      newUsersLastMonth,
      usersTrend,
      requestsTrend,
    ] = await Promise.all([
      prisma.user.count({ where: { isApproved: true } }),
      prisma.travelRequest.count(),
      prisma.travelRequest.count({
        where: {
          status: {
            in: ["PENDING_HOD", "PENDING_DIRECTOR", "PENDING_TRAVEL_MANAGER"],
          },
        },
      }),
      prisma.travelRequest.count({ where: { status: "APPROVED" } }),
      prisma.travelRequest.count({ where: { status: "REJECTED" } }),
      prisma.user.groupBy({
        by: ["role"],
        where: { isApproved: true },
        _count: { role: true },
      }),
      prisma.user.count({
        where: { isApproved: true, createdAt: { gte: startOfThisMonth } },
      }),
      prisma.user.count({
        where: {
          isApproved: true,
          createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
      }),
      Promise.all(
        monthRanges.map(({ start, end }) =>
          prisma.user.count({
            where: { isApproved: true, createdAt: { gte: start, lt: end } },
          })
        )
      ),
      Promise.all(
        monthRanges.map(({ start, end }) =>
          prisma.travelRequest.count({
            where: { createdAt: { gte: start, lt: end } },
          })
        )
      ),
    ]);

    // % change in new signups this month vs last month.
    // No signups last month but some this month → treat as +100%.
    // No signups either month → 0%.
    const usersGrowthPct =
      newUsersLastMonth === 0
        ? newUsersThisMonth > 0
          ? 100
          : 0
        : Math.round(
            ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
          );

    res.json({
      totalUsers,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      usersByRole: usersByRole.map(r => ({
        role: r.role,
        count: r._count.role,
      })),
      usersGrowthPct,
      usersTrend, // last 6 months, new approved users per month
      requestsTrend, // last 6 months, new travel requests per month
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

// GET all travel requests

export const getAllRequests = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const requests = await prisma.travelRequest.findMany({
      where: status ? { status: status as any } : {},
      include: {
        employee: {
          select: { name: true, email: true, department: true, grade: true },
        },
        hod: { select: { name: true } },
        director: { select: { name: true } },
        travelManager: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

// GET pending users (not yet approved)

export const getPendingUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        grade: true,
        plant: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

// APPROVE user — sets isApproved true and sends email

export const approveUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isApproved: true },
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

    try {
      await sendApprovalEmail(user.email, user.name);
    } catch (emailErr) {
      console.error("Approval email failed:", emailErr);
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

// REJECT user — deletes their account

export const rejectUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User rejected and removed" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

const EXPORT_COLUMNS = [
  { header: "Employee", width: 20, get: (r: any) => r.employee?.name || r.employeeName },
  { header: "Department", width: 18, get: (r: any) => r.department },
  { header: "Grade", width: 8, get: (r: any) => r.employee?.grade ?? "" },
  { header: "From", width: 16, get: (r: any) => r.fromLocation },
  { header: "To", width: 16, get: (r: any) => r.toLocation },
  {
    header: "Type",
    width: 16,
    get: (r: any) =>
      r.travelType === "INTER_COMPANY" ? "Inter Company" : "Outside",
  },
  {
    header: "From Date",
    width: 14,
    get: (r: any) => format(new Date(r.fromDate), "dd MMM yyyy"),
  },
  {
    header: "To Date",
    width: 14,
    get: (r: any) => format(new Date(r.toDate), "dd MMM yyyy"),
  },
  { header: "HOD", width: 18, get: (r: any) => r.hod?.name || "—" },
  { header: "Status", width: 20, get: (r: any) => r.status.replace(/_/g, " ") },
  {
    header: "Submitted",
    width: 14,
    get: (r: any) => format(new Date(r.createdAt), "dd MMM yyyy"),
  },
];

async function fetchExportRequests(status?: string) {
  return prisma.travelRequest.findMany({
    where: status && status !== "ALL" ? { status: status as any } : {},
    include: {
      employee: { select: { name: true, grade: true } },
      hod: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// GET /admin/requests/export?format=xlsx|pdf&status=...

export const exportRequests = async (req: Request, res: Response) => {
  try {
    const { format: fileFormat, status } = req.query as {
      format?: string;
      status?: string;
    };

    const requests = await fetchExportRequests(status);
    const stamp = format(new Date(), "yyyy-MM-dd");

    if (fileFormat === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="travel-requests-${stamp}.pdf"`
      );

      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 30,
      });

      doc.pipe(res);
      doc.fontSize(16).text("DEE TravelFlow — Travel Requests", { align: "left" });
      doc
        .fontSize(9)
        .fillColor("#666")
        .text(
          `Generated ${format(new Date(), "dd MMM yyyy, hh:mm a")} · ${requests.length} request(s)`
        );

      doc.moveDown(0.8);

      const colWidths = [110, 90, 40, 90, 90, 80, 65, 65, 90, 100, 65];
      const startX = doc.x;
      const headerY = doc.y;
      let x = startX;

      doc.fontSize(8).fillColor("#fff");
      doc
        .rect(
          startX,
          headerY,
          colWidths.reduce((a, b) => a + b, 0),
          18
        )
        .fill("#1d4ed8");

      doc.fillColor("#fff");

      EXPORT_COLUMNS.forEach((col, i) => {
        doc.text(col.header, x + 4, headerY + 5, {
          width: colWidths[i] - 6,
        });
        x += colWidths[i];
      });

      let y = headerY + 18;
      doc.fontSize(8).fillColor("#111");

      requests.forEach((r, rowIdx) => {
        if (y > 540) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 30 });
          y = 30;
        }

        if (rowIdx % 2 === 1) {
          doc
            .rect(
              startX,
              y,
              colWidths.reduce((a, b) => a + b, 0),
              16
            )
            .fill("#f3f4f6")
            .fillColor("#111");
        }

        x = startX;

        EXPORT_COLUMNS.forEach((col, i) => {
          doc.text(String(col.get(r) ?? ""), x + 4, y + 4, {
            width: colWidths[i] - 6,
            height: 14,
            ellipsis: true,
          });
          x += colWidths[i];
        });

        y += 16;
      });

      doc.end();
      return;
    }

    // default: xlsx

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DEE TravelFlow";

    const sheet = workbook.addWorksheet("Travel Requests");
    sheet.columns = EXPORT_COLUMNS.map(c => ({
      header: c.header,
      width: c.width,
    }));

    sheet.getRow(1).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };

    requests.forEach(r => {
      sheet.addRow(EXPORT_COLUMNS.map(c => c.get(r)));
    });

    sheet.autoFilter = {
      from: "A1",
      to: `${String.fromCharCode(64 + EXPORT_COLUMNS.length)}1`,
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="travel-requests-${stamp}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
};
