import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  getPaymentAlerts,
  updatePaymentStatus
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

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
  .post(authorize('admin'), ...uploadSingle('pdfFile', 'invoices'), createInvoice);

router
  .route('/:id')
  .get(getInvoiceById)
  .put(authorize('admin'), ...uploadSingle('pdfFile', 'invoices'), updateInvoice)
  .delete(authorize('admin'), deleteInvoice);

// Payment status update route
router.put('/:id/payment-status', authorize('admin'), updatePaymentStatus);

export default router;
