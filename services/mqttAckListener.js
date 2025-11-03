import { OrdersModel } from '../models/ordersModel.js';
import { InventoryModel } from '../models/inventoryModel.js';
import { VendingModel } from '../models/vendingModel.js';

export const wireUpMqttAck = (mqttClient, io) => {
  mqttClient.on('message', async (topic, message) => {
    try {
      const parts = topic.split('/');
      if (parts.length !== 3 || parts[0] !== 'vending' || parts[2] !== 'ack') return;

      const machineId = parseInt(parts[1], 10);
      const ack = JSON.parse(message.toString());

      const order = await OrdersModel.byId(ack.orderId);
      if (!order || order.machine_id !== machineId) return;

      if (ack.success) {
        const items = ack.items.map(it => ({ product_id: it.product_id, delta: -Math.abs(it.quantity) }));
        await InventoryModel.adjustMany(machineId, items);
        await OrdersModel.setStatus(order.id, 'success');

        const m = await VendingModel.findById(machineId);
        if (m) {
          io.to(`machine:${machineId}`).emit('inventoryUpdated', { machine_id: machineId });
          io.to(`user:${m.vendor_id}`).emit('orderUpdated', { order_id: order.id, status: 'success' });
        }
      } else {
        await OrdersModel.setStatus(order.id, 'failed');
      }
    } catch (e) {
      console.error('ACK handling error:', e.message);
    }
  });
};
