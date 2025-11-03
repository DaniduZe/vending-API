import { VendingModel } from '../models/vendingModel.js';
import { InventoryModel } from '../models/inventoryModel.js';
import { OrdersModel } from '../models/ordersModel.js';
import { getMqtt } from '../config/mqtt.js';

export const requestPurchase = async (req, res, next) => {
  try {
    const { machine_id, items } = req.body; // items: [{product_id, quantity}]
    if (![1,2,3].includes(req.user.role)) return res.status(401).json({ message: 'Unauthorized' });

    const m = await VendingModel.findById(machine_id);
    if (!m) return res.status(404).json({ message: 'Machine not found' });
    if (m.status !== 'active') return res.status(400).json({ message: 'Machine not active' });

    const ok = await InventoryModel.checkAvailability(machine_id, items);
    if (!ok) return res.status(400).json({ message: 'Insufficient stock' });

    const order = await OrdersModel.create({
      machine_id,
      customer_id: req.user.id,
      payload: items
    });

    const topic = `vending/${machine_id}`;
    const payload = JSON.stringify({ orderId: order.id, items });
    const mqtt = getMqtt();
    mqtt.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) console.error('MQTT publish error:', err.message);
    });

    res.status(202).json({ order_id: order.id, status: 'pending' });
  } catch (e) { next(e); }
};
