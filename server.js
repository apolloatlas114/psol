// ===================== PART 1 =====================
import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import prizeRoutes from "./routes/prize.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ===================== PART 2 =====================
// --- Middleware & Static Files ---
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

// ===================== PART 3 =====================
// --- API Routes & Rate Limiting ---
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/prize", prizeRoutes);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "❌ Too many requests, please slow down!"
});
app.use("/api/buyin", apiLimiter);
app.use("/api/payout", apiLimiter);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===================== PART 4 =====================
import { Server as IOServer } from "socket.io";
const io = new IOServer(server, {
  cors: {
    origin: ["https://gaming-dashboard.webflow.io", "http://localhost:5000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Zentrale Spieler-Datenstruktur
let playersState = {}; // Schlüssel: socket.id, Wert: { id, name, x, z, size, score, skin, lobby }
const minPlayersToStart = 2;
const countdownTime = 5;
let waitingRoom = {};  // Temporäre Speicherung während des Wartens
let isGameStarting = false;
let countdownInterval = null;

// Bei Verbindung
io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  // Sende initial den aktuellen Waiting-Room-Zustand
  socket.emit("waitingRoomUpdate", Object.values(waitingRoom));

  socket.on("playerJoin", ({ username }) => {
    if (!username || !username.trim()) {
      socket.emit("error", "❌ ERROR: Invalid username!");
      return;
    }
    username = username.trim().replace(/[^\w\s]/gi, "");
    // Sicherstellen, dass der Username eindeutig ist (im Waiting Room)
    let originalUsername = username, counter = 1;
    while (Object.values(waitingRoom).some(p => p.name === username)) {
      username = `${originalUsername}${counter}`;
      counter++;
    }
    console.log(`🕐 Player joined waiting room: ${username} (ID: ${socket.id})`);
    // Speichere im Waiting Room – später im Spielstart werden die Startpositionen vergeben
    waitingRoom[socket.id] = { id: socket.id, name: username };
    io.emit("waitingRoomUpdate", Object.values(waitingRoom));

    if (Object.keys(waitingRoom).length >= minPlayersToStart && !isGameStarting) {
      isGameStarting = true;
      console.log("Minimum players reached. Starting countdown in 1 second...");
      setTimeout(() => {
        if (Object.keys(waitingRoom).length >= minPlayersToStart) {
          startGameCountdown();
        } else {
          isGameStarting = false;
        }
      }, 1000);
    }
  });

  socket.on("playerMovement", (data) => {
    // data sollte { id, x, z } enthalten (zum Beispiel)
    if (playersState[socket.id]) {
      playersState[socket.id].x = data.x;
      playersState[socket.id].z = data.z;
      // Optionale Logik: Score, Größe etc. können ebenfalls aktualisiert werden
      broadcastState();
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
    delete waitingRoom[socket.id];
    delete playersState[socket.id];
    io.emit("waitingRoomUpdate", Object.values(waitingRoom));
    broadcastState();
  });

  // Sobald der Spielstart erfolgt, wird das waitingRoom-Objekt in playersState überführt
  function startGameCountdown() {
    let countdown = countdownTime;
    console.log(`⏳ Countdown initiated: ${countdown} seconds`);
    countdownInterval = setInterval(() => {
      io.emit("startGameCountdown", countdown);
      console.log(`Countdown tick: ${countdown}`);
      countdown--;
      if (countdown < 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        console.log("Countdown finished. Starting game.");
        startGame();
      }
    }, 1000);
  }

  function startGame() {
    // Erstelle für jeden Spieler Startpositionen und füge sie in playersState ein
    const lobbyId = "lobby-" + Date.now();
    const availableSkins = [
      "textures/playerSkin1.png",
      "textures/playerSkin4.png",
      "textures/playerSkin5.png",
      "textures/playerSkin14.png"
    ];
    for (let id in waitingRoom) {
      const player = waitingRoom[id];
      const randomSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];
      playersState[id] = {
        id,
        name: player.name,
        x: Math.random() * 1000 - 500,
        z: Math.random() * 1000 - 500,
        size: 40,
        score: 0,
        skin: randomSkin,
        mode: "free",
        lobby: lobbyId
      };
      // Sende individuellen gameStart an jeden Spieler
      io.to(id).emit("gameStart", { lobbyId, players: Object.values(playersState) });
    }
    io.emit("gameStart", { lobbyId, players: Object.values(playersState) });
    waitingRoom = {};
    isGameStarting = false;
    broadcastState();
  }

  function broadcastState() {
    // Sende den aktuellen Zustand an alle Clients
    io.emit("stateUpdate", Object.values(playersState));
  }
});
  
// ===================== PART 5 =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
