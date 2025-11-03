import express from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { createProduct, listProducts } from '../controllers/productsController.js';

const router = express.Router();
router.get('/', auth, listProducts);
router.post('/', auth, authorizeRoles(1,2), createProduct);
export default router;
