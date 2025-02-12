require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

let players = {}; // Track players in real-time

// Connect to MongoDB
async function connectDB() {
    try {
        const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}
connectDB();

app.use(cors());
app.use(express.json());

// API Route to handle matchmaking
app.post('/matchmaking', async (req, res) => {
    const { gameMode, playerId } = req.body;

    if (!gameMode || !playerId) {
        return res.status(400).json({ error: 'Missing gameMode or playerId' });
    }

    const db = client.db('gameDB');
    const matches = db.collection('matches');

    let match = await matches.findOne({ gameMode, status: 'waiting' });
    if (!match) {
        match = {
            gameMode,
            players: [playerId],
            status: 'waiting'
        };
        await matches.insertOne(match);
    } else {
        match.players.push(playerId);
        await matches.updateOne({ _id: match._id }, { $set: { players: match.players } });

        if (match.players.length >= 50) {
            await matches.updateOne({ _id: match._id }, { $set: { status: 'ready' } });
            io.emit('matchReady', match);
        }
    }
    res.json({ success: true, match });
});

// Socket.io for real-time multiplayer
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', ({ playerId, gameMode }) => {
        players[socket.id] = { playerId, gameMode, x: 0, y: 0, mass: 10 };
        io.emit('updatePlayers', players);
    });

    socket.on('move', ({ x, y }) => {
        if (players[socket.id]) {
            players[socket.id].x = x;
            players[socket.id].y = y;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayers', players);
        console.log(`Player disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
