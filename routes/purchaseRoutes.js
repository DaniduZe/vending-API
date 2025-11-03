import express from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { requestPurchase } from '../controllers/purchaseController.js';

const router = express.Router();
router.post('/', auth, requestPurchase);
export default router;
