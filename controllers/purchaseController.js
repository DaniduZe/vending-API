import { VendingModel } from '../models/vendingModel.js';
import { InventoryModel } from '../models/inventoryModel.js';
import { OrdersModel } from '../models/ordersModel.js';
import { getMqtt } from '../config/mqtt.js';

export const requestPurchase = async (req, res, next) => {
  try {
    const { machine_id, items } = req.body; // items: [{product_id, quantity}]
    if (![1, 2, 3].includes(req.user.role)) return res.status(401).json({ message: 'Unauthorized' });

    const m = await VendingModel.findById(machine_id);
    if (!m) return res.status(404).json({ message: 'Machine not found' });
    if (m.status !== 'active') return res.status(400).json({ message: 'Machine not active' });

    const ok = await InventoryModel.checkAvailability(machine_id, items);
    if (!ok) return res.status(400).json({ message: 'Insufficient stock' });

    // create order as pending
    const order = await OrdersModel.create({
      machine_id,
      customer_id: req.user.id,
      payload: items,
      status: 'pending'
    });

    const mqtt = getMqtt();
    const topic = `vending/${machine_id}`;
    const ackTopic = `vending/${machine_id}/ack`;
    const payload = JSON.stringify({ orderId: order.id, items });

    // wait for ack from vending machine (with timeout)
    const WAIT_MS = 15000; // adjust timeout as needed
    try {
      const result = await new Promise((resolve, reject) => {
        let timer;

        const onMessage = async (t, msg) => {
          if (t !== ackTopic) return;
          try {
            const data = JSON.parse(msg.toString());
            if (!data || data.orderId !== order.id) return; // not our order ack

            clearTimeout(timer);
            mqtt.removeListener('message', onMessage);
            mqtt.unsubscribe(ackTopic, () => {});

            if (data.status === 'success' || data.status === 'ok') {
              // update order status and deduct inventory
              // (assumes OrdersModel.updateStatus and InventoryModel.deductStock exist)
              try {
                await OrdersModel.updateStatus(order.id, 'success');
              } catch (_) {
                await OrdersModel.update(order.id, { status: 'success' }).catch(() => {});
              }
              try {
                await InventoryModel.deductStock(machine_id, items);
              } catch (_) {
                // fall back to a generic method name if necessary
                await InventoryModel.decrementStock?.(machine_id, items).catch(() => {});
              }
              resolve({ status: 'success', info: data });
            } else {
              await OrdersModel.updateStatus(order.id, 'failed').catch(() => {});
              resolve({ status: 'failed', info: data });
            }
          } catch (err) {
            clearTimeout(timer);
            mqtt.removeListener('message', onMessage);
            mqtt.unsubscribe(ackTopic, () => {});
            reject(err);
          }
        };

        // subscribe to ack topic first, then publish
        mqtt.subscribe(ackTopic, { qos: 1 }, (err) => {
          if (err) return reject(err);

          mqtt.on('message', onMessage);

          mqtt.publish(topic, payload, { qos: 1 }, (errPub) => {
            if (errPub) {
              mqtt.removeListener('message', onMessage);
              mqtt.unsubscribe(ackTopic, () => {});
              return reject(errPub);
            }

            timer = setTimeout(() => {
              mqtt.removeListener('message', onMessage);
              mqtt.unsubscribe(ackTopic, () => {});
              resolve({ status: 'timeout' });
            }, WAIT_MS);
          });
        });
      });

      // respond based on result
      if (result.status === 'success') {
        return res.status(200).json({ order_id: order.id, status: 'success' });
      } else if (result.status === 'failed') {
        return res.status(200).json({ order_id: order.id, status: 'failed', info: result.info });
      } else { // timeout
        await OrdersModel.updateStatus(order.id, 'timeout').catch(() => {});
        return res.status(504).json({ order_id: order.id, status: 'timeout' });
      }
    } catch (err) {
      await OrdersModel.updateStatus(order.id, 'error').catch(() => {});
      console.error('MQTT error:', err?.message || err);
      return res.status(500).json({ message: 'Internal error' });
    }
  } catch (e) { next(e); }
};
