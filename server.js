import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

// Fix "__dirname" für ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// ✅ Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ✅ Middleware & Static Files
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html", "css", "js"] }));

console.log("📂 Serving static files from:", path.join(__dirname, "public"));

// ✅ Sicherstellen, dass `style.css` richtig ausgeliefert wird
app.use("/style.css", (req, res) => {
  res.type("text/css");
  res.sendFile(path.join(__dirname, "public", "style.css"));
});

// ✅ Rate Limiting für Sicherheit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "❌ Too many requests, please slow down!",
});

app.use("/api/buyin", apiLimiter);
app.use("/api/payout", apiLimiter);

// ✅ Ban-System
const bannedIPs = new Set();
app.use((req, res, next) => {
  if (bannedIPs.has(req.ip)) {
    return res.status(403).json({ error: "❌ You are banned from this server!" });
  }
  next();
});

app.post("/ban", (req, res) => {
  const { ip } = req.body;
  if (ip) {
    bannedIPs.add(ip);
    console.log(`🚨 Banned IP: ${ip}`);
    res.json({ success: true, message: `🚨 IP ${ip} is now banned.` });
  } else {
    res.status(400).json({ error: "❌ No IP provided!" });
  }
});

// ✅ Registrierungssystem mit Rate-Limit
const registeredIPs = new Set();
const registeredWallets = new Set();

const accountCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "❌ Too many accounts created from this IP, try again later.",
});

app.post("/register", accountCreationLimiter, async (req, res) => {
  const { email, password, wallet } = req.body;
  const userIP = req.ip;

  if (!email || !password || !wallet) {
    return res.status(400).json({ error: "❌ Missing required fields!" });
  }

  if (registeredIPs.has(userIP)) {
    return res.status(403).json({ error: "❌ Registration blocked: Too many accounts from this IP!" });
  }

  if (registeredWallets.has(wallet)) {
    return res.status(403).json({ error: "❌ Wallet already registered!" });
  }

  console.log(`🆕 New user registered: ${email} | Wallet: ${wallet} | IP: ${userIP}`);
  registeredIPs.add(userIP);
  registeredWallets.add(wallet);

  res.json({ success: true, message: "✅ Registration successful!" });
});

// ✅ Load Routes
import buyinRoutes from "./routes/buyinRoute.js";
import payoutRoutes from "./routes/payoutRoute.js";
import matchmakingRoutes from "./routes/matchmakingRoute.js";

app.use("/api", buyinRoutes);
app.use("/api", payoutRoutes);
app.use("/api", matchmakingRoutes);

// ✅ Leaderboard & Timer Variablen
let leaderboard = [];
let poolMoney = 1000000;
let gameTimer = 20 * 60; // 20 Minuten in Sekunden

// ✅ Leaderboard aktualisieren
function updateLeaderboard(playerName, score) {
  leaderboard.push({ name: playerName, score: score });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
}

// ✅ Spiel-Timer starten & an Clients senden
function startGameTimer() {
  const timer = setInterval(() => {
    if (gameTimer > 0) {
      gameTimer--;
      io.emit("updateTimer", gameTimer); // Timer an alle Spieler senden
    } else {
      clearInterval(timer);
      io.emit("gameOver");
    }
  }, 1000);
}

// ✅ WebSocket Events für Spieler
io.on("connection", (socket) => {
  console.log("⚡ Ein Spieler hat sich verbunden:", socket.id);

  socket.emit("updateLeaderboard", leaderboard); // Sende aktuelles Leaderboard

  socket.on("updateScore", (data) => {
    updateLeaderboard(data.playerName, data.score);
    io.emit("updateLeaderboard", leaderboard); // Broadcast an alle
  });

  socket.on("disconnect", () => {
    console.log("❌ Spieler getrennt:", socket.id);
  });
});



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});



// ✅ Lade Game-Logik (NACHDEM `io` läuft)
import("./game/gameLogic.js")
  .then(() => console.log("✅ gameLogic.js loaded successfully"))
  .catch((err) => console.error("❌ Error loading gameLogic.js:", err));

// ✅ MongoDB Verbindung mit besserer Performance
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout nach 5 Sek. für bessere Stabilität
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));



// ✅ Server starten
const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));
