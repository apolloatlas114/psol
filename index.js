const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

let players = {};
let food = [];
let projectiles = [];

// Spawn food
function spawnFood() {
    if (food.length < 500) {
        food.push({
            id: Date.now() + Math.random(),
            x: Math.random() * 5000,
            y: Math.random() * 5000
        });
    }
}

setInterval(spawnFood, 100);

// Handle player connections
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Add new player
    socket.on('joinGame', (username) => {
        players[socket.id] = {
            id: socket.id,
            username,
            x: Math.random() * 5000,
            y: Math.random() * 5000,
            size: 20,
            speed: 5,
            score: 0
        };

        // Send initial game state to the new player
        socket.emit('gameState', { players, food, projectiles });

        // Notify other players about the new player
        io.emit('updateState', { players, food, projectiles });
    });

    // Handle player movement
    socket.on('move', (movement) => {
        const player = players[socket.id];
        if (!player) return;

        const dx = movement.dx;
        const dy = movement.dy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;

            player.x += normalizedX * player.speed;
            player.y += normalizedY * player.speed;

            // Adjust speed based on size
            player.speed = Math.max(1, 10 / Math.sqrt(player.size));
        }

        io.emit('updateState', { players, food, projectiles });
    });

    // Handle splitting (Spacebar)
    socket.on('split', () => {
        const player = players[socket.id];
        if (!player || player.size < 20) return;

        const halfSize = player.size / 2;
        player.size = halfSize;

        const splitPlayer = {
            id: `${socket.id}-split-${Date.now()}`,
            username: `${player.username} (Split)`,
            x: player.x + halfSize,
            y: player.y + halfSize,
            size: halfSize,
            speed: Math.max(5, 15 / Math.sqrt(halfSize)),
            score: 0
        };

        players[splitPlayer.id] = splitPlayer;

        io.emit('updateState', { players, food, projectiles });
    });

    // Handle shooting projectiles (W key)
    socket.on('shoot', (mousePosition) => {
        const player = players[socket.id];
        if (!player || player.size < 5) return;

        const dx = mousePosition.dx;
        const dy = mousePosition.dy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;

            projectiles.push({
                id: Date.now() + Math.random(),
                x: player.x,
                y: player.y,
                vx: normalizedX * 10,
                vy: normalizedY * 10
            });

            // Reduce player's size slightly when shooting
            player.size -= 2;

            io.emit('updateState', { players, food, projectiles });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('updateState', { players, food, projectiles });
    });
});

// Collision detection and game updates
function checkCollisions() {
    // Player-Food collisions
    for (let id in players) {
        let player = players[id];
        food = food.filter(f => {
            let dx = f.x - player.x;
            let dy = f.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.size) {
                player.size += 1; // Increase size when eating food
                player.score += 10; // Increase score when eating food
                return false; // Remove this food item
            }
            
            return true; // Keep this food item
        });
    }

    // Player-Projectile collisions
    projectiles.forEach((proj) => {
        for (let id in players) {
            let player = players[id];
            
            let dx = proj.x - player.x;
            let dy = proj.y - player.y;
            
            if (Math.sqrt(dx * dx + dy * dy) < player.size && proj.ownerId !== id) {
                player.size -= 5; // Reduce size when hit by projectile
                
                if (player.size <= 0) {
                    delete players[id]; // Remove the eaten player
                    io.emit('playerEaten', id);
                }
                
                break;
            }
        }
        
        proj.x += proj.vx;
        proj.y += proj.vy;
    });

    io.emit('updateState', { players, food, projectiles });
}

setInterval(checkCollisions, 100);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
