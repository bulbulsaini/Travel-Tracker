
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";

import {
  getStats,
  getAllUsers,
  updateUserRole,
  updateUserDepartment,
  updateUserGrade,
  updateUserPlant,
  deleteUser,
  getAllRequests,
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/admin.controller";

const router = Router();

// All admin routes require authentication and ADMIN role.
router.use(authenticate);
router.use(authorize("ADMIN"));

// Dashboard
router.get("/stats", getStats);

// User management
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/department", updateUserDepartment);
router.patch("/users/:id/grade", updateUserGrade);
router.patch("/users/:id/plant", updateUserPlant);
router.delete("/users/:id", deleteUser);

// Account approvals
router.get("/pending-users", getPendingUsers);
router.patch("/users/:id/approve", approveUser);
router.delete("/users/:id/reject", rejectUser);

// Travel requests
router.get("/requests", getAllRequests);

export default router;
