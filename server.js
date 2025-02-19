import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import path from "path";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// ✅ Rate Limits
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "❌ Too many requests, please slow down!",
});

app.use("/api/buyin", apiLimiter);
app.use("/api/payout", apiLimiter);

// ✅ Lobby System
const MAX_PLAYERS_PER_LOBBY = 50;
let lobbies = []; // Stores active lobbies

io.on("connection", (socket) => {
    console.log(`🟢 Player connected: ${socket.id}`);

    socket.on("playerJoin", ({ username }) => {
        if (!username || username.trim() === "") {
            console.error("❌ ERROR: Invalid name!");
            return;
        }

        username = username.trim();

        let assignedLobby = null;
        for (let lobby of lobbies) {
            if (lobby.players.length < MAX_PLAYERS_PER_LOBBY) {
                assignedLobby = lobby;
                break;
            }
        }

        if (!assignedLobby) {
            assignedLobby = { id: `Lobby-${lobbies.length + 1}`, players: [] };
            lobbies.push(assignedLobby);
        }

        const player = {
            id: socket.id,
            name: username,
            score: 40,
            lobby: assignedLobby.id,
        };

        assignedLobby.players.push(player);
        socket.join(assignedLobby.id);
        socket.emit("lobbyAssigned", assignedLobby.id);
        io.to(assignedLobby.id).emit("updateLobby", assignedLobby.players);

        console.log(`📢 ${username} joined ${assignedLobby.id}`);

        // ✅ Sync player movement & score
        socket.on("updateScore", ({ score }) => {
            player.score = score;
            io.to(assignedLobby.id).emit("updateLobby", assignedLobby.players);
        });

        socket.on("updatePosition", ({ x, y, z }) => {
            player.x = x;
            player.y = y;
            player.z = z;
            io.to(assignedLobby.id).emit("updateLobby", assignedLobby.players);
        });

        socket.on("disconnect", () => {
            console.log(`❌ Player disconnected: ${socket.id}`);
            assignedLobby.players = assignedLobby.players.filter(p => p.id !== socket.id);

            if (assignedLobby.players.length === 0) {
                lobbies = lobbies.filter(l => l.id !== assignedLobby.id);
                console.log(`🗑️ ${assignedLobby.id} removed (empty)`);
            } else {
                io.to(assignedLobby.id).emit("updateLobby", assignedLobby.players);
            }
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
