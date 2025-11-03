import { VendingModel } from '../models/vendingModel.js';
import { InventoryModel } from '../models/inventoryModel.js';
import { ProductsModel } from '../models/productsModel.js';
import { OrdersModel } from '../models/ordersModel.js';

const isAdmin = (req) => req.user?.role === 1;

//
// 🏗️ Create vending machine (Admin only)
//
export const createVending = async (req, res, next) => {
  try {
    if (req.user.role !== 1)
      return res.status(403).json({ message: 'Only admin can create machines' });

    const { location, status, vendor_id } = req.body;
    if (!vendor_id)
      return res.status(400).json({ message: 'Vendor ID required' });

    const machine = await VendingModel.create({ location, status, vendor_id });
    res.status(201).json(machine);
  } catch (e) {
    next(e);
  }
};

//
// 🧩 Assign existing machine to vendor (Admin only)
//
export const assignVendingToVendor = async (req, res, next) => {
  try {
    if (req.user.role !== 1)
      return res.status(403).json({ message: 'Only admin can assign machines' });

    const { vendor_id } = req.body;
    const id = req.params.id;
    const m = await VendingModel.findById(id);
    if (!m) return res.status(404).json({ message: 'Machine not found' });

    const { rows } = await VendingModel.reassignVendor(id, vendor_id);
    res.json({ message: 'Vendor assigned successfully', machine: rows[0] });
  } catch (e) {
    next(e);
  }
};

//
// 📜 List machines (Admin sees all, Vendor sees own)
//
export const listMyMachines = async (req, res, next) => {
  try {
    if (req.user.role === 2) {
      const rows = await VendingModel.findAllByVendor(req.user.id);
      return res.json(rows);
    }
    if (req.user.role === 1) {
      const rows = await VendingModel.findAll();
      return res.json(rows);
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (e) {
    next(e);
  }
};

//
// 🧾 View vending machine details (public)
//
export const getMachinePublic = async (req, res, next) => {
  try {
    const m = await VendingModel.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Not found' });
    res.json({ id: m.id, location: m.location, status: m.status });
  } catch (e) {
    next(e);
  }
};

//
// 📦 View or update inventory
//
export const getInventory = async (req, res, next) => {
  try {
    const m = await VendingModel.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Not found' });

    // Vendor can only see own machine
    if (req.user.role === 2 && m.vendor_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });

    const inv = await InventoryModel.getInventory(m.id);
    res.json(inv);
  } catch (e) {
    next(e);
  }
};

//
// ✏️ Vendor or Admin can update product quantity
//
export const upsertInventory = async (req, res, next) => {
  try {
    const m = await VendingModel.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 2 && m.vendor_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });

    if (![1, 2].includes(req.user.role))
      return res.status(403).json({ message: 'Forbidden' });

    const { product_id, quantity } = req.body;
    const product = await ProductsModel.byId(product_id);
    if (!product) return res.status(400).json({ message: 'Invalid product' });

    const row = await InventoryModel.upsert(m.id, product_id, quantity);
    res.json(row);
  } catch (e) {
    next(e);
  }
};

//
// ❌ Delete vending machine (Admin only)
//
export const deleteVending = async (req, res, next) => {
  try {
    if (req.user.role !== 1)
      return res.status(403).json({ message: 'Only admin can delete machines' });

    await VendingModel.remove(req.params.id, null, true);
    res.json({ message: 'Vending machine deleted' });
  } catch (e) {
    next(e);
  }
};

//
// 📜 View purchase history (Vendor sees their machines, Admin sees all)
//
export const getPurchaseHistory = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 1) {
      const { rows } = await OrdersModel.findAll();
      return res.json(rows);
    }

    if (user.role === 2) {
      const { rows } = await OrdersModel.findByVendor(user.id);
      return res.json(rows);
    }

    return res.status(403).json({ message: 'Forbidden' });
  } catch (e) {
    next(e);
  }
};
