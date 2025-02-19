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
const cors = require("cors");
app.use(cors({ origin: "*" })); // Allows all domains (for testing)

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});




app.use(cors({ origin: "https://gaming-dashboard.webflow.io" })); // ✅ Allow only Webflow



// ✅ Middleware

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html", "css", "js"] }));

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ API Routes (using `import` instead of `require`)
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/prize", prizeRoutes);

// ✅ Rate Limits for Security
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "❌ Too many requests, please slow down!",
});
app.use("/api/buyin", apiLimiter);
app.use("/api/payout", apiLimiter);

// ✅ Multiplayer WebSocket Logic
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

    console.log(`🟢 Player joined Free Play as: ${username} (ID: ${socket.id})`);

    const availableSkins = [
        "textures/playerSkin1.png",
        "textures/playerSkin4.png",
        "textures/playerSkin5.png",
        "textures/playerSkin14.png"
    ];
    let assignedSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];

    connectedPlayers[socket.id] = {
        id: socket.id,
        name: username,
        x: Math.random() * 1000 - 500,
        z: Math.random() * 1000 - 500,
        score: 0,
        skin: assignedSkin,
        mode: "free" // ✅ Track game mode
    };

    // ✅ Send confirmation only to the player who joined
    socket.emit("playerData", { id: socket.id, players: connectedPlayers });

    // ✅ Notify all players about the new player
    io.emit("newPlayer", connectedPlayers[socket.id]);

    updateLeaderboard();
});



    socket.on("playerMove", ({ id, x, z }) => {
        if (connectedPlayers[id]) {
            connectedPlayers[id].x = x;
            connectedPlayers[id].z = z;
            io.emit("updatePlayers", connectedPlayers);
        }
    });

    socket.on("updateScore", ({ id, score }) => {
        if (connectedPlayers[id]) {
            connectedPlayers[id].score = score;
            updateLeaderboard();
        }
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
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
