// server.js
import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import prizeRoutes from "./routes/prize.js";
import { MyRoom } from "./rooms/MyRoom.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ["https://gaming-dashboard.webflow.io", "http://localhost:5000"],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html", "css", "js"] }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/prize", prizeRoutes);

// Optionaler Colyseus-Monitor (nur wenn benötigt)
app.use("/colyseus", monitor());

const gameServer = new Server({ server });

// Definiere den Raum "my_room"
gameServer.define("my_room", MyRoom);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Colyseus Server running on http://localhost:${PORT}`)
);
