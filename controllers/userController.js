import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserModel } from '../models/userModel.js';

dotenv.config();

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await UserModel.findByEmail(email);
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const validRoles = [1, 2, 3];
    const userRole = validRoles.includes(role) ? role : 3;

    const hashed = await bcrypt.hash(password, 10);
    const user = await UserModel.createUser({ name, email, password: hashed, role: userRole });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await UserModel.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
