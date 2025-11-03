import mqtt from 'mqtt';
import dotenv from 'dotenv';
dotenv.config();

let client;

export const initMqtt = () => {
  if (client) return client;

  const options = {};
  if (process.env.MQTT_USERNAME) options.username = process.env.MQTT_USERNAME;
  if (process.env.MQTT_PASSWORD) options.password = process.env.MQTT_PASSWORD;

  client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883', options);

  client.on('connect', () => {
    console.log('🔌 MQTT connected:', process.env.MQTT_URL || 'mqtt://localhost:1883');
    client.subscribe('vending/+/ack', (err) => {
      if (err) console.error('MQTT subscribe error:', err.message);
    });
  });

  client.on('error', (e) => console.error('MQTT error:', e.message));
  return client;
};

export const getMqtt = () => client;
