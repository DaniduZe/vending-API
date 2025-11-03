import express from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  createVending,
  assignVendingToVendor,
  listMyMachines,
  getMachinePublic,
  getInventory,
  upsertInventory,
  deleteVending,
  getPurchaseHistory
} from '../controllers/vendingController.js';

const router = express.Router();

// Admin-only
router.post('/', auth, authorizeRoles(1), createVending);
router.put('/:id/assign', auth, authorizeRoles(1), assignVendingToVendor);
router.delete('/:id', auth, authorizeRoles(1), deleteVending);

// Shared
router.get('/mine', auth, authorizeRoles(1, 2), listMyMachines);
router.get('/:id', auth, getMachinePublic);
router.get('/:id/inventory', auth, getInventory);
router.put('/:id/inventory', auth, authorizeRoles(1, 2), upsertInventory);

// Purchase history
router.get('/history/all', auth, authorizeRoles(1, 2), getPurchaseHistory);

export default router;
