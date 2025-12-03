import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import pool from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import userRoutes from './routes/userRoutes.js';
import vendingRoutes from './routes/vendingRoutes.js';
import productRoutes from './routes/productRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';

import { initMqtt } from './config/mqtt.js';
import { wireUpMqttAck } from './services/mqttAckListener.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// REST API routes
app.use('/api/users', userRoutes);
app.use('/api/vending', vendingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchase', purchaseRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// 🔄 Initialize MQTT connection
const mqttClient = initMqtt();
wireUpMqttAck(mqttClient);

// ✅ Database check
pool.query('SELECT 1')
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch((e) => console.error('DB error:', e.message));

// 🚀 Start server
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
