import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  getPaymentAlerts
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadToCloudinary } from '../middleware/upload.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Stats and alerts routes (must be before /:id)
router.get('/stats', authorize('admin'), getInvoiceStats);
router.get('/payment-alerts', authorize('admin'), getPaymentAlerts);

// CRUD routes
router
  .route('/')
  .get(authorize('admin'), getInvoices)
  .post(authorize('admin'), uploadToCloudinary.single('pdfFile'), createInvoice);

router
  .route('/:id')
  .get(getInvoiceById)
  .put(authorize('admin'), uploadToCloudinary.single('pdfFile'), updateInvoice)
  .delete(authorize('admin'), deleteInvoice);

export default router;
