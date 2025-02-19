import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import prizeRoutes from "./routes/prize.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// ✅ Apply correct CORS settings for HTTP Requests
const corsOptions = {
    origin: "https://gaming-dashboard.webflow.io", // Allow requests from Webflow
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
};

app.use(cors(corsOptions));

const server = http.createServer(app);

// ✅ Fix CORS for WebSockets
const io = new Server(server, {
    cors: {
        origin: "https://gaming-dashboard.webflow.io", // Allow Webflow to connect
        methods: ["GET", "POST"],
        credentials: true
    }
});

// ✅ Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html", "css", "js"] }));

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ API Routes
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/prize", prizeRoutes);

// ✅ Apply Rate Limits for Security
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "❌ Too many requests, please slow down!",
});
app.use("/api/buyin", apiLimiter);
app.use("/api/payout", apiLimiter);

// ✅ WebSocket (Multiplayer Logic)
let connectedPlayers = {};
let leaderboard = [];

io.on("connection", (socket) => {
    console.log(`🟢 Player connected: ${socket.id}`);

    socket.on("playerJoin", ({ username }) => {
        if (!username || username.trim() === "") {
            socket.emit("error", "❌ ERROR: No valid name entered!");
            return;
        }

        username = username.trim();
        let originalUsername = username;
        let counter = 1;

        while (Object.values(connectedPlayers).some(p => p.name === username)) {
            username = `${originalUsername}${counter}`;
            counter++;
        }

        console.log(`🟢 Player joined as: ${username} (ID: ${socket.id})`);

        connectedPlayers[socket.id] = {
            id: socket.id,
            name: username,
            x: Math.random() * 1000 - 500,
            z: Math.random() * 1000 - 500,
            score: 0,
            mode: "free"
        };

        // ✅ Send confirmation only to the player who joined
        socket.emit("playerData", { id: socket.id, players: connectedPlayers });

        // ✅ Notify all players about the new player
        io.emit("newPlayer", connectedPlayers[socket.id]);

        updateLeaderboard();
    });

    socket.on("disconnect", () => {
        console.log(`❌ Player disconnected: ${socket.id}`);
        delete connectedPlayers[socket.id];
        io.emit("removePlayer", socket.id);
        updateLeaderboard();
    });
});

function updateLeaderboard() {
    leaderboard = Object.values(connectedPlayers)
        .filter(p => p.name)
        .map(p => ({ id: p.id, name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    io.emit("updateLeaderboard", leaderboard);
}

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port http://localhost:${PORT}`));
