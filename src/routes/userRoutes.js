import express from "express";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getWorkers,
  getWorkerDetails,
  toggleUserStatus,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  createUserValidation,
  mongoIdValidation,
} from "../middleware/validator.js";

const router = express.Router();

router.use(protect);

router.get("/workers", getWorkers);

router.put(
  "/:id/toggle-status",
  authorize("admin"),
  mongoIdValidation,
  toggleUserStatus
);

router
  .route("/")
  .get(authorize("admin"), getUsers)
  .post(authorize("admin"), createUserValidation, createUser);

router
  .route("/:id")
  .get(authorize("admin"), mongoIdValidation, getUser)
  .put(authorize("admin"), mongoIdValidation, updateUser)
  .delete(authorize("admin"), mongoIdValidation, deleteUser);

router.get(
  "/:id/details",
  authorize("admin"),
  mongoIdValidation,
  getWorkerDetails
);
export default router;
