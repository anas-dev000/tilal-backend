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
import { getAllSites, getSiteById } from '../controllers/siteController.js';
import { getClients, getClient } from '../controllers/clientController.js';
import { protect, accountantOnly } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication and accountant role
router.use(protect);
router.use(accountantOnly);

// Invoice Statistics & Alerts (must be before /:id routes)
router.get('/invoices/stats', getInvoiceStats);
router.get('/invoices/payment-alerts', getPaymentAlerts);

// Invoice CRUD operations
router
  .route('/invoices')
  .get(getInvoices)
  .post(uploadSingle('pdfFile', 'invoices'), createInvoice);

router
  .route('/invoices/:id')
  .get(getInvoiceById)
  .put(uploadSingle('pdfFile', 'invoices'), updateInvoice)
  .delete(deleteInvoice);

// Sites (read-only for invoice creation - accountants can view sites but not modify)
router.get('/sites', getAllSites);
router.get('/sites/:id', getSiteById);

// Clients (read-only for accountants)
router.get('/clients', getClients);
router.get('/clients/:id', getClient);

export default router;
