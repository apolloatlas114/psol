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
// --- CORS & Middleware ---
app.use(cors({
  origin: ["https://gaming-dashboard.webflow.io", "http://localhost:5000"],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html", "css", "js"] }));

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ===================== PART 3 =====================
// --- API Routes ---
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/prize", prizeRoutes);

// --- Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "❌ Too many requests, please slow down!"
});
app.use("/api/buyin", apiLimiter);
app.use("/api/payout", apiLimiter);

// --- Serve the Game Page ---
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

// Use Maps for robust state management.
const minPlayersToStart = 2;
const countdownTime = 5;
let waitingRoom = new Map();
let isGameStarting = false;
let countdownInterval = null;
let connectedPlayers = new Map();
let leaderboard = [];
let players = []; // (For in-game state if needed later)

io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  // Immediately send the current waiting room state to the new connection.
  socket.emit("waitingRoomUpdate", Array.from(waitingRoom.values()));
  console.log("Emitting current waiting room:", Array.from(waitingRoom.values()));

  socket.on("playerJoin", ({ username }) => {
    try {
      if (!username || !username.trim()) {
        socket.emit("error", "❌ ERROR: Invalid username!");
        return;
      }
      // Simple sanitization: remove any non-alphanumeric characters except spaces
      username = username.trim().replace(/[^\w\s]/gi, "");
      let originalUsername = username;
      let counter = 1;
      // Ensure unique username in waiting room.
      while ([...waitingRoom.values()].some(p => p.name === username)) {
        username = `${originalUsername}${counter}`;
        counter++;
      }
      console.log(`🕐 Player joined waiting room: ${username} (ID: ${socket.id})`);
      waitingRoom.set(socket.id, { id: socket.id, name: username });
      connectedPlayers.set(socket.id, { id: socket.id, name: username, score: 0 });
      const fullState = Array.from(waitingRoom.values());
      io.emit("waitingRoomUpdate", fullState);
      console.log("Waiting room now:", fullState.map(p => p.name));

      if (waitingRoom.size >= minPlayersToStart && !isGameStarting) {
        isGameStarting = true;
        console.log("Minimum players reached. Starting countdown in 1 second...");
        setTimeout(() => {
          if (waitingRoom.size >= minPlayersToStart) {
            startGameCountdown();
          } else {
            isGameStarting = false;
          }
        }, 1000);
      }
    } catch (err) {
      console.error("❌ Error in playerJoin handler:", err);
    }
  });

  socket.on("leaveWaitingRoom", ({ username }) => {
    try {
      console.log(`❌ Player left waiting room: ${username || socket.id}`);
      waitingRoom.delete(socket.id);
      io.emit("waitingRoomUpdate", Array.from(waitingRoom.values()));
      if (waitingRoom.size < minPlayersToStart && countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        isGameStarting = false;
        io.emit("startGameCountdown", "Waiting for more players...");
      }
    } catch (err) {
      console.error("❌ Error in leaveWaitingRoom handler:", err);
    }
  });

  socket.on("disconnect", () => {
    try {
      console.log(`❌ Player disconnected: ${socket.id}`);
      waitingRoom.delete(socket.id);
      connectedPlayers.delete(socket.id);
      io.emit("waitingRoomUpdate", Array.from(waitingRoom.values()));
      if (waitingRoom.size < minPlayersToStart && countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        isGameStarting = false;
        io.emit("startGameCountdown", "Waiting for more players...");
      }
      players = players.filter(p => p.id !== socket.id);
    } catch (err) {
      console.error("❌ Error during disconnect handling:", err);
    }
  });

  socket.on("updateScore", ({ id, score }) => {
    try {
      if (connectedPlayers.has(id)) {
        let player = connectedPlayers.get(id);
        player.score = score;
        connectedPlayers.set(id, player);
        updateLeaderboard();
      }
    } catch (err) {
      console.error("❌ Error updating score:", err);
    }
  });

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
    if (waitingRoom.size < minPlayersToStart) {
      isGameStarting = false;
      return;
    }
    console.log("🚀 Starting match with players:", Array.from(waitingRoom.values()).map(p => p.name));
    let lobbyId = "lobby-" + Date.now();
    let playersInGame = [];
    const availableSkins = [
      "textures/playerSkin1.png",
      "textures/playerSkin4.png",
      "textures/playerSkin5.png",
      "textures/playerSkin14.png"
    ];
    waitingRoom.forEach((player) => {
      const randomSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];
      playersInGame.push({
        id: player.id,
        name: player.name,
        x: Math.random() * 1000 - 500,
        z: Math.random() * 1000 - 500,
        size: 40,
        score: 0,
        skin: randomSkin,
        mode: "free",
        lobby: lobbyId
      });
      io.to(player.id).emit("gameStart", { lobbyId, players: playersInGame });
    });
    io.emit("gameStart", { lobbyId, players: playersInGame });
    waitingRoom.clear();
    isGameStarting = false;
  }
});

function updateLeaderboard() {
  let arr = Array.from(connectedPlayers.values()).filter(p => p.name && p.name.trim() !== "");
  leaderboard = arr.sort((a, b) => b.score - a.score).slice(0, 10);
  io.emit("updateLeaderboard", leaderboard);
  console.log("🏆 New Leaderboard Data:", leaderboard);
}

// ===================== PART 5 =====================
// --- Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
