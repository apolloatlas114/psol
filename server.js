// server.js
import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { MyRoom } from "./rooms/MyRoom.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// CORS und statische Dateien
app.use(cors({
  origin: ["https://gaming-dashboard.webflow.io", "http://localhost:5000"],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Optionaler Colyseus-Monitor (zur Überwachung des Servers)
app.use("/colyseus", monitor());

// Erstelle Colyseus-Server und definiere den Raum "my_room"
const gameServer = new Server({ server });
gameServer.define("my_room", MyRoom);

// Starte den Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Colyseus Server running on http://localhost:${PORT}`));
