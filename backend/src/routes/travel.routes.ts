import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";
import {
  createRequest,
  getMyRequests,
  getHODRequests,
  getHODAllRequests,
  hodAction,
  getDirectorRequests,
  getDirectorAllRequests,
  directorAction,
  getTravelManagerRequests,
  getTravelManagerAllRequests,
  travelManagerAction,
  getHODs,
  getRequestById,
  uploadTicket,
  updateRequest,
  deleteRequest,
  getTravelHistory,
} from "../controllers/travel.controller";

const router = Router();
router.use(authenticate);

router.get("/hods", getHODs);
router.get("/my", getMyRequests);
router.get("/history", getTravelHistory);
router.post("/", authorize("EMPLOYEE", "HOD"), createRequest);

router.get("/hod/pending", authorize("HOD"), getHODRequests);
router.get("/hod/all", authorize("HOD"), getHODAllRequests);
router.patch("/:id/hod-action", authorize("HOD"), hodAction);

router.get("/director/pending", authorize("DIRECTOR"), getDirectorRequests);
router.get("/director/all", authorize("DIRECTOR"), getDirectorAllRequests);
router.patch("/:id/director-action", authorize("DIRECTOR"), directorAction);

router.get("/manager/pending", authorize("TRAVEL_MANAGER"), getTravelManagerRequests);
router.get("/manager/all", authorize("TRAVEL_MANAGER"), getTravelManagerAllRequests);
router.patch("/:id/manager-action", authorize("TRAVEL_MANAGER"), travelManagerAction);

// Only the employee who owns the request can upload the ticket.
router.post("/:id/upload-ticket", authorize("EMPLOYEE"), upload.single("ticket"), uploadTicket);

router.get("/:id", getRequestById);
router.patch("/:id", updateRequest);
router.delete("/:id", deleteRequest);

export default router;
