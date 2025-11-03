import { ProductsModel } from '../models/productsModel.js';

//
// 🧩 Add Product (Admin or Vendor)
//
export const createProduct = async (req, res, next) => {
  try {
    // Only Admin or Vendor can add products
    if (![1, 2].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or vendor can add products' });
    }

    const { sku, name, price_cents } = req.body;
    if (!sku || !name || !price_cents) {
      return res.status(400).json({ message: 'sku, name, and price_cents are required' });
    }

    const product = await ProductsModel.create({
      sku,
      name,
      price_cents,
      created_by: req.user.id
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

//
// 🧩 List Products
// - Admin → All products
// - Vendor → Own products
// - Customer → All public products
//
export const listProducts = async (req, res, next) => {
  try {
    let products;
    if (req.user.role === 1 || req.user.role === 3) {
      products = await ProductsModel.all();
    } else if (req.user.role === 2) {
      products = await ProductsModel.byCreator(req.user.id);
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(products);
  } catch (err) {
    next(err);
  }
};
