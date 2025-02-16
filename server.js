import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

// Fix "__dirname" for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

// Middleware & Static Files
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html", "css", "js"] })); // ✅ FIXED SYNTAX


// Rate Limiting for Security
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "❌ Too many requests, please slow down!",
});

app.use("/api/buyin", apiLimiter);
app.use("/api/payout", apiLimiter);

// Ban System
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

// Leaderboard & Game Timer Variables
let leaderboard = [];
let poolMoney = 1000000;
let gameTimer = 20 * 60; // 20 minutes in seconds




// Start Game Timer & Send Updates
function startGameTimer() {
    const timer = setInterval(() => {
        if (gameTimer > 0) {
            gameTimer--;
            io.emit("updateTimer", gameTimer);
        } else {
            clearInterval(timer);
            io.emit("gameOver");
        }
    }, 1000);
}

// Multiplayer System (Auto-Skins & Random Names)
const availableSkins = [
    "textures/playerSkin1.png",
    "textures/playerSkin4.png",
    "textures/playerSkin5.png",
    "textures/playerSkin14.png",
];

const randomNames = ["Shadow", "NeonWarrior", "Hyper", "CyberGhost", "PixelFreak", "GlitchMaster"];

// Store all connected players
let connectedPlayers = {};

// WebSocket Events for Multiplayer


io.on("connection", (socket) => {
    console.log("⚡ Player connected:", socket.id);

    // Assign a unique name
    function getRandomName() {
        let name;
        do {
            name = randomNames[Math.floor(Math.random() * randomNames.length)];
        } while (Object.values(connectedPlayers).some(p => p.name === name)); 
        return name;
    }

    const randomSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];
    const randomName = getRandomName();
    const randomX = Math.random() * 1000 - 500;
    const randomZ = Math.random() * 1000 - 500;

    connectedPlayers[socket.id] = {
        id: socket.id,
        name: randomName,
        x: randomX,
        z: randomZ,
        score: 0,
        skin: randomSkin
    };

    // Send player data
    socket.emit("playerData", { id: socket.id, players: connectedPlayers });

    // Broadcast new player
    io.emit("newPlayer", connectedPlayers[socket.id]);

    // Handle movement updates
    socket.on("updatePosition", (data) => {
        if (connectedPlayers[socket.id]) {
            connectedPlayers[socket.id].x = data.x;
            connectedPlayers[socket.id].z = data.z;
            io.emit("updatePosition", { id: socket.id, x: data.x, z: data.z });
        }
    });

    // Handle score updates
    socket.on("updateScore", (score) => {
        if (connectedPlayers[socket.id]) {
            connectedPlayers[socket.id].score = score;
            updateLeaderboard(socket.id, connectedPlayers[socket.id].name, score);
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("❌ Player disconnected:", socket.id);
        delete connectedPlayers[socket.id];
        io.emit("removePlayer", socket.id);
    });
});



 

    // Handle movement updates
    socket.on("updatePosition", (data) => {
        if (connectedPlayers[socket.id]) {
            connectedPlayers[socket.id].x = data.x;
            connectedPlayers[socket.id].z = data.z;
            io.emit("updatePosition", { id: socket.id, x: data.x, z: data.z });
        }
    });

    // Handle score updates
function updateLeaderboard(playerID, playerName, score) {
    leaderboard = leaderboard.filter((p) => p.id !== playerID);
    leaderboard.push({ id: playerID, name: playerName, score: score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    io.emit("updateLeaderboard", leaderboard);
}



    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("❌ Player disconnected:", socket.id);
        delete connectedPlayers[socket.id];
        io.emit("removePlayer", socket.id);
    });
});

// Express Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// MongoDB Connection (Optional for Free-to-Play)
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout after 5 sec for better stability
    })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));