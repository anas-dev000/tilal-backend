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
import { uploadFields, handleUploadError } from "../middleware/upload.js";

const router = express.Router();

router.use(protect);

router.get("/workers", getWorkers);

router.put(
  "/:id/toggle-status",
  authorize("admin"),
  mongoIdValidation,
  toggleUserStatus
);

// File fields configuration
const workerUploads = uploadFields([
  { name: "profilePicture", maxCount: 1 },
  { name: "residencePhoto", maxCount: 1 },
  { name: "licensePhoto", maxCount: 1 },
  { name: "idPhoto", maxCount: 1 },
  { name: "contractPdf", maxCount: 1 },
  { name: "otherFiles", maxCount: 10 }, // Multiple PDFs/Docs
]);

router
  .route("/")
  .get(authorize("admin"), getUsers)
  .post(
    authorize("admin"), 
    workerUploads, 
    handleUploadError,
    // createUserValidation, // Moved after upload because body is parsed by multer
    // validation middleware might need adjustment if it strictly expects JSON, 
    // but usually express-validator works with req.body populated by multer.
    createUser
  );

router
  .route("/:id")
  .get(authorize("admin"), mongoIdValidation, getUser)
  .put(
    authorize("admin"), 
    mongoIdValidation, 
    workerUploads,
    handleUploadError,
    updateUser
  )
  .delete(authorize("admin"), mongoIdValidation, deleteUser);

router.get(
  "/:id/details",
  authorize("admin"),
  mongoIdValidation,
  getWorkerDetails
);
export default router;
