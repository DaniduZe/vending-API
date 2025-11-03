import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserModel } from "../models/userModel.js";
import { VendingModel } from "../models/vendingModel.js";
import { InventoryModel } from "../models/inventoryModel.js";
import { OrdersModel } from "../models/ordersModel.js";
import { getMqtt } from "../config/mqtt.js";

export const initCustomerSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("📱 Customer connected:", socket.id);

    let user = null; // store logged-in user
    let currentMachine = null;

    // 🧩 LOGIN EVENT
    socket.on("login", async (data) => {
      try {
        const { email, password } = data;
        const u = await UserModel.findByEmail(email);
        if (!u || u.role !== 3) {
          return socket.emit("error", { message: "Invalid credentials" });
        }
        const ok = await bcrypt.compare(password, u.password);
        if (!ok) return socket.emit("error", { message: "Invalid credentials" });

        const token = jwt.sign(
          { id: u.id, email: u.email, role: u.role },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );
        user = { id: u.id, email: u.email, role: u.role };
        socket.emit("loginSuccess", { token, user });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // 🧩 FETCH ALL VENDING MACHINES (public)
    socket.on("getMachines", async () => {
      try {
        const rows = await VendingModel.findAllByVendor(1); // or all
        socket.emit("machinesList", rows);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // 🧩 SELECT A MACHINE
    socket.on("selectMachine", async (machineId) => {
      currentMachine = machineId;
      socket.join(`machine:${machineId}`);
      socket.emit("machineSelected", { machine_id: machineId });
    });

    // 🧩 FETCH PRODUCTS IN SELECTED MACHINE
    socket.on("getProducts", async () => {
      try {
        if (!currentMachine)
          return socket.emit("error", { message: "Select a machine first" });
        const inv = await InventoryModel.getInventory(currentMachine);
        socket.emit("productsList", inv);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // 🧩 BUY PRODUCT
    socket.on("buyProduct", async (data) => {
      try {
        if (!user || user.role !== 3)
          return socket.emit("error", { message: "Unauthorized" });
        if (!currentMachine)
          return socket.emit("error", { message: "No machine selected" });

        const { items } = data; // [{ product_id, quantity }]
        const ok = await InventoryModel.checkAvailability(currentMachine, items);
        if (!ok) return socket.emit("error", { message: "Out of stock" });

        const order = await OrdersModel.create({
          machine_id: currentMachine,
          customer_id: user.id,
          payload: items,
        });

        const topic = `vending/${currentMachine}`;
        const payload = JSON.stringify({ orderId: order.id, items });
        const mqtt = getMqtt();
        mqtt.publish(topic, payload, { qos: 1 });

        socket.emit("orderPlaced", {
          order_id: order.id,
          status: "pending",
          machine_id: currentMachine,
        });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Customer disconnected:", socket.id);
    });
  });
};
