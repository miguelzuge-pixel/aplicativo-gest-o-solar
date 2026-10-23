// Servidor Express + WebSocket. Os dados são simulados e não representam medição real.
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { WebSocketServer, WebSocket } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DEVICES_FILE = path.join(DATA_DIR, "devices.json");

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const defaultDevices = [
  { id: "ac-sala", name: "Ar-condicionado", room: "Sala", category: "Climatização", watts: 1200, hoursPerDay: 6, active: true, expectedWatts: 1100 },
  { id: "fridge", name: "Geladeira", room: "Cozinha", category: "Cozinha", watts: 180, hoursPerDay: 24, active: true, expectedWatts: 220 },
  { id: "shower", name: "Chuveiro elétrico", room: "Banheiro", category: "Aquecimento", watts: 5500, hoursPerDay: 0.7, active: true, expectedWatts: 5500 },
  { id: "tv", name: "Smart TV", room: "Sala", category: "Eletrônicos", watts: 110, hoursPerDay: 5, active: true, expectedWatts: 150 },
  { id: "laptop", name: "Notebook", room: "Quarto", category: "Eletrônicos", watts: 65, hoursPerDay: 7, active: true, expectedWatts: 90 },
  { id: "lights", name: "Iluminação LED", room: "Área externa", category: "Iluminação", watts: 90, hoursPerDay: 5, active: true, expectedWatts: 100 },
  { id: "washer", name: "Máquina de lavar", room: "Área de serviço", category: "Lavanderia", watts: 600, hoursPerDay: 0.8, active: true, expectedWatts: 700 }
];

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DEVICES_FILE)) fs.writeFileSync(DEVICES_FILE, JSON.stringify(defaultDevices, null, 2));
}
function readDevices() {
  ensureDataFile();
  try { return JSON.parse(fs.readFileSync(DEVICES_FILE, "utf8")); }
  catch (err) { console.error("Falha ao ler devices.json:", err.message); return defaultDevices; }
}
function writeDevices(devices) {
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2));
}
let devices = readDevices();
let history = [];
const startedAt = Date.now();
let currentReading = null;

function hourFactor(hour = new Date().getHours()) {
  // Curva residencial aproximada: baixa de madrugada, alta de manhã e no início da noite.
  if (hour >= 0 && hour < 6) return 0.42;
  if (hour >= 6 && hour < 9) return 0.85;
  if (hour >= 9 && hour < 17) return 0.65;
  if (hour >= 17 && hour < 22) return 1.18;
  return 0.58;
}
function generateReading() {
  const hour = new Date().getHours();
  const factor = hourFactor(hour);
  const deviceReadings = devices.map((device) => {
    const isOn = device.active && Math.random() > (device.id === "shower" ? 0.78 : 0.25);
    const anomaly = Math.random() > 0.965 ? 1.7 : 1;
    const watts = isOn ? Math.max(0, device.watts * factor * (0.82 + Math.random() * 0.36) * anomaly) : 0;
    return { id: device.id, name: device.name, room: device.room, category: device.category, watts: Math.round(watts), active: isOn, expectedWatts: device.expectedWatts };
  });
  const totalWatts = deviceReadings.reduce((sum, d) => sum + d.watts, 0);
  const reading = {
    type: "consumption",
    timestamp: new Date().toISOString(),
    powerKw: Number((totalWatts / 1000).toFixed(3)),
    totalWatts: Math.round(totalWatts),
    devices: deviceReadings,
    simulated: true
  };
  currentReading = reading;
  history.push(reading);
  if (history.length > 240) history.shift();
  return reading;
}
function broadcast(payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}
function tick() {
  const reading = generateReading();
  broadcast(reading);
}
tick();
setInterval(tick, 3000);

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "initial", reading: currentReading, history }));
  socket.on("error", (err) => console.error("Erro WebSocket:", err.message));
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) }));
app.get("/api/consumption", (_req, res) => res.json({ reading: currentReading, history, simulated: true }));
app.get("/api/devices", (_req, res) => res.json({ devices }));
app.put("/api/devices/:id", (req, res) => {
  const index = devices.findIndex((d) => d.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Equipamento não encontrado." });
  const allowed = ["name", "room", "category", "watts", "hoursPerDay", "active", "expectedWatts"];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  if (updates.name !== undefined && (typeof updates.name !== "string" || !updates.name.trim())) {
    return res.status(400).json({ error: "O nome não pode ficar vazio." });
  }
  if (updates.watts !== undefined && (!Number.isFinite(Number(updates.watts)) || Number(updates.watts) < 0 || Number(updates.watts) > 20000)) {
    return res.status(400).json({ error: "Potência inválida." });
  }
  devices[index] = { ...devices[index], ...updates };
  writeDevices(devices);
  broadcast({ type: "devices-updated", devices });
  res.json({ device: devices[index] });
});
app.get("/api/report", (_req, res) => {
  res.json({
    generatedAt: new Date().toISOString(),
    simulated: true,
    readings: history,
    devices: devices.map((d) => ({
      ...d,
      estimatedDailyKwh: Number((d.watts * d.hoursPerDay / 1000).toFixed(2))
    }))
  });
});
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

server.listen(PORT, () => console.log(`Energia Smart disponível em http://localhost:${PORT}`));
