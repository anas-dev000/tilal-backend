// backend/src/routes/taskRoutes.js - Fixed with Cloudinary
import express from "express";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  startTask,
  completeTask,
  uploadTaskImages,
  deleteTaskImage,
  assignTask,
  toggleImageVisibility,
  bulkUpdateImageVisibility,
  submitFeedback,
  markSatisfied,
  deleteBeforeMedia,
} from "../controllers/taskController.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  uploadMultiple,
  handleUploadError,
  uploadSingle,
} from "../middleware/upload.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getTasks)
  .post(authorize("admin"), ...uploadSingle("voiceRecording", "tasks"), createTask);

router
  .route("/:id")
  .get(getTask)
  .put(authorize("admin", "worker"), ...uploadSingle("voiceRecording", "tasks"), updateTask)
  .delete(authorize("admin"), deleteTask);

router.post("/:id/start", startTask);
router.post("/:id/complete", completeTask);
router.post("/:id/assign", authorize("admin"), assignTask);

// ✅ Image upload routes with Cloudinary (up to 50 images)
router.post(
  "/:id/images",
  authorize("admin", "worker"),
  uploadMultiple("images", 50, "tasks"), // ✅ Cloudinary folder
  handleUploadError,
  uploadTaskImages
);

router.delete(
  "/:id/images/:imageId",
  authorize("admin", "worker"),
  deleteTaskImage
);
router.put(
  "/:id/images/:imageId/visibility",
  authorize("admin"),
  toggleImageVisibility
);

router.put(
  "/:id/images/bulk-visibility",
  authorize("admin"),
  bulkUpdateImageVisibility
);
// ✅ NEW: Client Feedback
router.post(
  "/:id/feedback",
  protect,
  uploadSingle("feedbackImage", "feedback"),
  handleUploadError,
  submitFeedback
);
// ✅ NEW: Client Feedback
router.post("/:id/satisfied", protect, markSatisfied);

// New admin-only endpoint to delete all before images
router.delete("/:id/before-media", authorize("admin"), deleteBeforeMedia);

export default router;
