import express from 'express';
import { register, login, getAllUsers, deleteUser } from '../controllers/userController.js';
import { auth } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.get('/', auth, authorizeRoles(1), getAllUsers);
router.delete('/:id', auth, authorizeRoles(1), deleteUser);
export default router;
