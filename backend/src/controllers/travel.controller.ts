import { Request, Response } from "express";

import { prisma } from "../lib/prisma";

import { RequestStatus } from "@prisma/client";

import path from "path";

import fs from "fs";

import { format } from "date-fns";

import {

  sendHodApprovedEmployee,

  sendHodApprovedDirector,

  sendDirectorApprovedEmployee,

  sendDirectorApprovedManager,

  sendManagerApprovedEmployee,

  sendRejectedEmployee,

} from "../lib/mailer";

const getDepartmentHod = async (hodId: string, department: string) => {
  if (!hodId || !department.trim()) return null;

  const hod = await prisma.user.findUnique({ where: { id: hodId } });
  const normalize = (value?: string | null) => (value ?? "").trim().toLowerCase();

  return hod && hod.role === "HOD" && normalize(hod.department) === normalize(department)
    ? hod
    : null;
};

export const createRequest = async (req: Request, res: Response) => {

  try {

    const {

      hodId, travelType, fromLocation, toLocation, fromDate, toDate,

      purposeOfVisit, accommodation, transportMode, estimatedCost, additionalNotes,

    } = req.body;

    const employee = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (!["EMPLOYEE", "HOD"].includes(employee.role)) {
      return res.status(403).json({ error: "Your role cannot create travel requests" });
    }

    if (employee.role !== "HOD") {
      const validHod = await getDepartmentHod(hodId, employee.department ?? "");
      if (!validHod) {
        return res.status(400).json({ error: "Selected HOD does not match your department." });
      }
    }
const director = await prisma.user.findUnique({
  where: { email: "directorpage@deepiping.com" },
});
    if (!director) return res.status(400).json({ error: "Configured Director account not found" });

    const isHOD = employee.role === "HOD";

    const travelReq = await prisma.travelRequest.create({

      data: {

        employeeId:     req.user!.userId,

        directorId:     director?.id,

        employeeName:   employee.name,

        department:     employee.department??"",

        hodId:        isHOD ? req.user!.userId : hodId,

        travelType,

        fromLocation,

        toLocation,

        fromDate:       new Date(fromDate),

        toDate:         new Date(toDate),

        purposeOfVisit,

        accommodation:  accommodation || false,

        transportMode,

        estimatedCost:  estimatedCost ? parseFloat(estimatedCost) : null,

        additionalNotes,

        status:       isHOD ? "PENDING_DIRECTOR" : "PENDING_HOD",

        hodComment:   isHOD ? "Auto-approved (HOD is the requester)" : null,

        hodApprovedAt: isHOD ? new Date() : null,

      },

      include: { employee: true, hod: true },

    });

    res.status(201).json(travelReq);

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Server error" });

  }

};

export const getMyRequests = async (req: Request, res: Response) => {

  try {

    const requests = await prisma.travelRequest.findMany({

      where: { employeeId: req.user!.userId },

      include: {

        hod:      { select: { name: true } },

        director: { select: { name: true } },

      },

      orderBy: { createdAt: "desc" },

    });

    res.json(requests);

  } catch {

    res.status(500).json({ error: "Server error" });

  }

};

export const getHODRequests = async (req: Request, res: Response) => {

  try {

    const requests = await prisma.travelRequest.findMany({

      where: { hodId: req.user!.userId, status: "PENDING_HOD" },

      include: {

        employee: { select: { name: true, email: true, department: true, grade: true } },

      },

      orderBy: { createdAt: "desc" },

    });

    res.json(requests);

  } catch {

    res.status(500).json({ error: "Server error" });

  }

};

export const getHODAllRequests = async (req: Request, res: Response) => {

  try {

    const requests = await prisma.travelRequest.findMany({

      where: { hodId: req.user!.userId },

      include: {

        employee: { select: { name: true, email: true, department: true, grade: true } },

      },

      orderBy: { createdAt: "desc" },

    });

    res.json(requests);

  } catch {

    res.status(500).json({ error: "Server error" });

  }

};

export const hodAction = async (req: Request, res: Response) => {

  try {

    const { id } = req.params;

    const { action, comment } = req.body;

    const request = await prisma.travelRequest.findUnique({

      where: { id },

      include: {

        employee: { select: { name: true, email: true } },

        hod:      { select: { name: true, email: true } },

        director: { select: { name: true, email: true } },

      },

    });

    if (!request || request.hodId !== req.user!.userId)

      return res.status(404).json({ error: "Request not found" });

    if (request.status !== "PENDING_HOD")

      return res.status(400).json({ error: "Request already processed" });

    const newStatus: RequestStatus = action === "approve" ? "PENDING_DIRECTOR" : "REJECTED";

    const updated = await prisma.travelRequest.update({

      where: { id },

      data: { status: newStatus, hodComment: comment, hodApprovedAt: new Date() },

    });

    const route    = `${request.fromLocation} → ${request.toLocation}`;

    const fromDate = format(request.fromDate, "dd MMM yyyy");

    const toDate   = format(request.toDate,   "dd MMM yyyy");

    if (action === "approve") {

      if (request.employee?.email)

        await sendHodApprovedEmployee(

          request.employee.email, request.employee.name,

          route, fromDate, toDate,

          request.hod?.name || "HOD", request.department

        );

      if (request.director?.email)

        await sendHodApprovedDirector(

          request.director.email, request.director.name,

          request.employee?.name || "", route, fromDate, toDate,

          request.hod?.name || "HOD", comment || "", request.department

        );

    } else {

      if (request.employee?.email)

        await sendRejectedEmployee(

          request.employee.email, request.employee.name,

          route, fromDate, toDate,

          request.hod?.name || "HOD", "HOD", comment || ""

        );

    }

    res.json(updated);

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Server error" });

  }

};

export const getHODs = async (_req: Request, res: Response) => {

  try {

    const hods = await prisma.user.findMany({

      where: { role: "HOD" },

      select: { id: true, name: true, department: true, email: true },

    });

    res.json(hods);

  } catch {

    res.status(500).json({ error: "Server error" });

  }

};

export const getRequestById = async (req: Request, res: Response) => {
  try {
    const request = await prisma.travelRequest.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { select: { name: true, email: true, department: true, grade: true } },
        hod: { select: { name: true } },
        director: { select: { name: true } },
        travelManager: { select: { name: true } },
      },
    });

    if (!request) return res.status(404).json({ error: "Not found" });

    const { userId, role } = req.user!;
    const allowed =
      role === "ADMIN" ||
      (role === "TRAVEL_MANAGER" && request.travelManagerId === userId) ||
      (role === "HOD" && request.hodId === userId) ||
      (role === "DIRECTOR" && request.directorId === userId) ||
      (role === "EMPLOYEE" && request.employeeId === userId);

    if (!allowed) return res.status(403).json({ error: "Not authorized" });

    // HOD can see HOD/Director comments, but not ticket or Travel Manager details.
    if (role === "HOD") {
      return res.json({
        ...request,
        ticketFile: null,
        ticketUploadedAt: null,
        travelManagerComment: null,
        travelManager: null,
      });
    }

    // Employees can view the ticket on their own request. Directors cannot upload or view it.
    if (role === "EMPLOYEE") {
      return res.json({
        ...request,
        travelManagerComment: null,
        travelManager: null,
      });
    }

    if (role !== "ADMIN" && role !== "TRAVEL_MANAGER") {
      return res.json({
        ...request,
        ticketFile: null,
        ticketUploadedAt: null,
        travelManagerComment: null,
        travelManager: null,
      });
    }

    return res.json(request);
  } catch (err) {
    console.error("Failed to fetch travel request:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getDirectorRequests = async (req: Request, res: Response) => {

  try {

    console.log("Director pending request");

    console.log("User:", req.user);

    const directorId = req.user?.userId;

    if (!directorId) {

      return res.status(401).json({

        error: "Director user ID not found",

      });

    }

    const requests = await prisma.travelRequest.findMany({

      where: {

        directorId,

        status: "PENDING_DIRECTOR",

      },

      include: {

        employee: {

          select: {

            name: true,

            email: true,

            department: true,

            grade: true,

          },

        },

        hod: {

          select: {

            name: true,

          },

        },

      },

      orderBy: {

        createdAt: "desc",

      },

    });

    console.log("Director pending requests:", requests.length);

    res.json(requests);

  } catch (err) {

    console.error("DIRECTOR PENDING ERROR:", err);

    res.status(500).json({

      error: "Server error",

      details: err instanceof Error ? err.message : String(err),

    });

  }

};

export const getDirectorAllRequests = async (req: Request, res: Response) => {

  try {

    // Director-only route: return company-wide history, not just requests

    // assigned to the currently logged-in Director.

    const requests = await prisma.travelRequest.findMany({

      include: {

        employee: {

          select: { id: true, name: true, email: true, role: true, department: true, grade: true },

        },

        hod: { select: { name: true } },

      },

      orderBy: { createdAt: "desc" },

    });

    res.json(requests);

  } catch (err) {

    console.error("Failed to load director travel history:", err);

    res.status(500).json({ error: "Server error" });

  }

};

export const getDirectorTravelOverview = async (

  req: Request,

  res: Response

) => {

  try {

    const requests = await prisma.travelRequest.findMany({

      where: {

        directorId: req.user!.userId,

        status: "APPROVED",

        employee: {

          role: "HOD",

        },

      },

      include: {

        employee: {

          select: {

            id: true,

            name: true,

            email: true,

            department: true,

            role: true,

          },

        },

        director: {

          select: {

            id: true,

            name: true,

            email: true,

          },

        },

      },

      orderBy: {

        createdAt: "desc",

      },

    });

    res.json(requests);

  } catch (err) {

    console.error("Error fetching director travel overview:", err);

    res.status(500).json({

      error: "Server error",

    });

  }

};

export const directorAction = async (req: Request, res: Response) => {

  try {

    const { id } = req.params;

    const { action, comment } = req.body;

    const request = await prisma.travelRequest.findUnique({

      where: { id },

      include: {

        employee:      { select: { name: true, email: true } },

        director:      { select: { name: true, email: true } },

        travelManager: { select: { name: true, email: true } },

      },

    });

   console.log("DIRECTOR ACTION DEBUG:", {
  requestId: id,
  requestFound: Boolean(request),
  requestDirectorId: request?.directorId,
  loggedInDirectorId: req.user?.userId,
  requestStatus: request?.status,
});

if (!request) {
  return res.status(404).json({
    error: "Travel request ID not found",
  });
}

if (request.directorId !== req.user!.userId) {
  return res.status(403).json({
    error: "This request is not assigned to your Director account",
  });
}

if (request.status !== "PENDING_DIRECTOR") {
  return res.status(400).json({
    error: "Request already processed",
  });
}

    if (request.status !== "PENDING_DIRECTOR")

      return res.status(400).json({ error: "Request already processed" });

    const travelManager = request.travelManagerId
  ? await prisma.user.findUnique({
      where: { id: request.travelManagerId },
    })
  : await prisma.user.findFirst({
      where: { role: "TRAVEL_MANAGER" },
    });

if (action === "approve" && !travelManager) {
  return res.status(400).json({
    error: "No Travel Manager is assigned to this request.",
  });
}

const newStatus: RequestStatus =
  action === "approve" ? "PENDING_TRAVEL_MANAGER" : "REJECTED";

const updated = await prisma.travelRequest.update({
  where: { id },
  data: {
    status: newStatus,
    directorComment: comment,
    directorApprovedAt: new Date(),
    travelManagerId:
      action === "approve" ? travelManager!.id : undefined,
  },
});

    const route    = `${request.fromLocation} → ${request.toLocation}`;

    const fromDate = format(request.fromDate, "dd MMM yyyy");

    const toDate   = format(request.toDate,   "dd MMM yyyy");

    if (action === "approve") {

      if (request.employee?.email)

        await sendDirectorApprovedEmployee(

          request.employee.email, request.employee.name,

          route, fromDate, toDate,

          request.director?.name || "Director", request.department

        );

      if (travelManager?.email)

        await sendDirectorApprovedManager(

          travelManager.email, travelManager.name,

          request.employee?.name || "", route, fromDate, toDate,

          request.department, request.accommodation

        );

    } else {

      if (request.employee?.email)

        await sendRejectedEmployee(

          request.employee.email, request.employee.name,

          route, fromDate, toDate,

          request.director?.name || "Director", "Director", comment || ""

        );

    }

    res.json(updated);

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Server error" });

  }

};

export const getTravelManagerRequests = async (req: Request, res: Response) => {

  try {

    const requests = await prisma.travelRequest.findMany({

      where: { travelManagerId: req.user!.userId, status: "PENDING_TRAVEL_MANAGER" },

      include: {

        employee: { select: { name: true, email: true, department: true, grade: true } },

        hod:      { select: { name: true } },

      },

      orderBy: { createdAt: "desc" },

    });

    res.json(requests);

  } catch {

    res.status(500).json({ error: "Server error" });

  }

};

export const getTravelManagerAllRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const requests = await prisma.travelRequest.findMany({
      where: {
        travelManagerId: req.user!.userId,
        status: {
          in: ["PENDING_TRAVEL_MANAGER", "APPROVED"],
        },
      },
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            department: true,
            grade: true,
          },
        },
        hod: { select: { name: true } },
        director: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  } catch (err) {
    console.error("Failed to load Travel Manager requests:", err);
    res.status(500).json({ error: "Server error" });
  }
};
export const getTravelHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    // History is scoped to the logged-in user's relationship with each request.
    // A Travel Manager sees only requests assigned to them that they have approved.
    const where =
      role === "TRAVEL_MANAGER"
        ? { travelManagerId: userId, status: "APPROVED" as const }
        : role === "DIRECTOR"
          ? { directorId: userId, status: "APPROVED" as const }
          : role === "HOD"
            ? { hodId: userId, status: "APPROVED" as const }
            : role === "ADMIN"
              ? { status: "APPROVED" as const }
              : { employeeId: userId, status: "APPROVED" as const };

    const requests = await prisma.travelRequest.findMany({
      where,
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

    // Keep the response fields used by TravelHistory.tsx while also returning
    // the related employee data for non-employee roles.
    const history = requests.map((request) => ({
      ...request,
      employeeName: request.employee?.name ?? "",
      department: request.employee?.department ?? "",
    }));

    return res.json(history);
  } catch (err) {
    console.error("Failed to load travel history:", err);
    return res.status(500).json({ error: "Unable to load travel history" });
  }
};

export const travelManagerAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const request = await prisma.travelRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { name: true, email: true } },
        travelManager: { select: { name: true } },
      },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.travelManagerId !== req.user!.userId) {
      return res.status(403).json({ error: "You are not assigned to this request" });
    }
    if (request.status !== "PENDING_TRAVEL_MANAGER") {
      return res.status(400).json({ error: "This request is not awaiting Travel Manager processing" });
    }
    if (!request.ticketFile) {
      return res.status(400).json({ error: "Upload the travel ticket before approving this request" });
    }

    const updated = await prisma.travelRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        travelManagerComment: comment,
        travelManagerProcessedAt: new Date(),
      },
    });

    const route = `${request.fromLocation} → ${request.toLocation}`;
    const fromDate = format(request.fromDate, "dd MMM yyyy");
    const toDate = format(request.toDate, "dd MMM yyyy");

    if (request.employee?.email) {
      await sendManagerApprovedEmployee(
        request.employee.email,
        request.employee.name,
        route,
        fromDate,
        toDate,
        request.travelManager?.name || "Travel Manager",
        comment || ""
      );
    }

    return res.json(updated);
  } catch (err) {
    console.error("Travel Manager action failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const uploadTicket = async (req: Request, res: Response) => {
  const file = req.file;
  const removeNewFile = () => {
    if (file?.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (cleanupError) { console.warn(cleanupError); }
    }
  };
  try {
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const request = await prisma.travelRequest.findUnique({ where: { id: req.params.id } });
    if (!request) {
      removeNewFile();
      return res.status(404).json({ error: "Request not found" });
    }
    if (req.user!.role !== "EMPLOYEE" || request.employeeId !== req.user!.userId) {
      removeNewFile();
      return res.status(403).json({ error: "Only the employee who owns this request can upload its ticket" });
    }
    if (request.status !== "PENDING_TRAVEL_MANAGER") {
      removeNewFile();
      return res.status(400).json({ error: "Ticket can only be uploaded after HOD and Director approval" });
    }

    const fileUrl = `/uploads/tickets/${file.filename}`;
    const updated = await prisma.travelRequest.update({
      where: { id: request.id },
      data: { ticketFile: fileUrl, ticketUploadedAt: new Date() },
    });

    // Remove the previous file only after the database points to the new upload.
    if (request.ticketFile) {
      const oldPath = path.join(__dirname, "../../uploads/tickets", path.basename(request.ticketFile));
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (cleanupError) {
        console.warn("Could not remove previous ticket file:", cleanupError);
      }
    }

    return res.json({ ticketFile: updated.ticketFile, ticketUploadedAt: updated.ticketUploadedAt });
  } catch (err) {
    removeNewFile();
    console.error("Ticket upload failed:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
};

export const updateRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await prisma.travelRequest.findUnique({ where: { id } });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.employeeId !== req.user!.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (request.status !== "PENDING_HOD") {
      return res.status(400).json({ error: "Cannot edit after HOD approval" });
    }

    const {
      hodId, travelType, fromLocation, toLocation, fromDate, toDate,
      purposeOfVisit, accommodation, additionalNotes,
    } = req.body;

    const employee = await prisma.user.findUnique({ where: { id: request.employeeId } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const validHod = await getDepartmentHod(hodId, employee.department ?? request.department ?? "");
    if (!validHod) {
      return res.status(400).json({ error: "Selected HOD does not match your department." });
    }

    if (!fromDate || !toDate || new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ error: "Please provide valid travel dates." });
    }

    const updated = await prisma.travelRequest.update({
      where: { id },
      data: {
        hodId: validHod.id,
        travelType,
        fromLocation,
        toLocation,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        purposeOfVisit,
        accommodation: Boolean(accommodation),
        additionalNotes,
      },
      include: { hod: { select: { id: true, name: true, department: true } } },
    });

    return res.json(updated);
  } catch (err) {
    console.error("Failed to update travel request:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteRequest = async (req: Request, res: Response) => {

  try {

    const { id } = req.params;

    const request = await prisma.travelRequest.findUnique({ where: { id } });

    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.employeeId !== req.user!.userId) {
      return res.status(403).json({ error: "You can only delete your own travel requests" });
    }

    if (!["REJECTED", "PENDING_HOD"].includes(request.status))

      return res.status(400).json({ error: "Cannot delete an approved or in-progress request" });

    await prisma.travelRequest.delete({ where: { id } });

    res.json({ message: "Request deleted" });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Server error" });

  }

};