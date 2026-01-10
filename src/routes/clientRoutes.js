import express from 'express';
import {
  clientLogin,
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientTasks,
  toggleClientStatus 
} from '../controllers/clientController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// Public route
router.post('/login', clientLogin);

// Protected routes
router.get('/', protect, authorize('admin'), getClients);
router.get('/:id', protect, getClient);
router.get('/:id/tasks', protect, getClientTasks);

// Admin only routes
router.post('/', protect, authorize('admin'), uploadSingle('contractPdf'), createClient);
router.put('/:id', protect, uploadSingle('contractPdf'), updateClient);
router.delete('/:id', protect, authorize('admin'), deleteClient);
router.put('/:id/toggle-status', protect, authorize('admin'), toggleClientStatus);

export default router;