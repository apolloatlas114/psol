import { io } from "../server.js";

const MAP_SIZE = 10000; 
const BASE_SPEED = 15; 
const BASE_ZOOM = 1200; 

let players = {};
let food = [];




setTimeout(() => {
    io.on("connection", (socket) => {
        console.log(`🟢 Player connected: ${socket.id}`);

        players[socket.id] = {
            id: socket.id,
            x: Math.random() * MAP_SIZE,
            y: Math.random() * MAP_SIZE,
            size: 30,
            speed: BASE_SPEED,
            zoom: BASE_ZOOM,
            targetZoom: BASE_ZOOM, // 🔥 Neuer Wert für sanftes Zoomen
            score: 0
        };

        socket.emit("playerId", socket.id);
        socket.emit("gameState", { players: Object.values(players), food });

        socket.on("move", ({ x, y }) => {
            if (players[socket.id]) {
                const player = players[socket.id];
                const dx = x - player.x;
                const dy = y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 🔥 Spieler wird langsamer beim Wachsen
                player.speed = Math.max(2, BASE_SPEED - player.size / 50); 

                if (distance > 0) {
                    player.x += (dx / distance) * player.speed;
                    player.y += (dy / distance) * player.speed;
                }

                io.emit("updatePlayers", Object.values(players));
            }
        });

        socket.on("disconnect", () => {
            console.log(`🔴 Player disconnected: ${socket.id}`);
            delete players[socket.id];
            io.emit("updatePlayers", Object.values(players));
        });
    });
}, 100); 

// 🔥 Nahrung spawnen
function spawnFood() {
    while (food.length < 3000) {
        food.push({
            id: Date.now() + Math.random(),
            x: Math.random() * MAP_SIZE,
            y: Math.random() * MAP_SIZE,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`
        });
    }
}
setInterval(spawnFood, 500);

// 🔥 **Perfekte Kollision & Absorption der Nahrung**
function checkCollisions() {
    for (let id in players) {
        let player = players[id];
        let newFood = [];

        food.forEach((f) => {
            let dx = f.x - player.x;
            let dy = f.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // 🔥 Essen wird angesaugt (Black Hole Effekt)
            if (distance < player.size * 4) {
                f.x += dx * -0.2; 
                f.y += dy * -0.2;
            }

            // 🔥 Nahrung wird sicher absorbiert
            if (distance < player.size * 1.5) {
                player.size += 1;
                player.score += 10;

                // 🔥 Spieler wird langsamer & Ziel-Zoom wird gesetzt
                player.speed = Math.max(2, BASE_SPEED - player.size / 50);
                player.targetZoom = BASE_ZOOM + player.size * 10; // 🔥 Sanfte Anpassung
            } else {
                newFood.push(f);
            }
        });

        food = newFood;
    }
}
setInterval(checkCollisions, 100);






async function endGame(gameId, winners) {
    try {
        const response = await fetch("https://psolgame-e77454844bbd.herokuapp.com/api/prize/distribute-prizes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId, winners }),
        });

        const data = await response.json();
        if (data.success) {
            console.log("Prizes successfully sent!");
        } else {
            console.error("Prize distribution failed:", data.message);
        }
    } catch (error) {
        console.error("Error ending game:", error);
    }
}

// Call `endGame` when a match finishes
function checkGameOver(gameId) {
    const game = activeGames[gameId];
    if (!game) return;

    if (Date.now() >= game.endTime) {
        console.log(`Game ${gameId} ended. Processing winners...`);

        const sortedPlayers = game.players.sort((a, b) => b.score - a.score);
        const winners = sortedPlayers.slice(0, 3).map((player, index) => ({
            username: player.username,
            wallet: player.wallet,
            position: index + 1
        }));

        endGame(gameId, winners);
        delete activeGames[gameId];
    }
}









// 🔥 **Sanfte Kamera-Zoom-Anpassung**
function smoothZoomUpdate() {
    for (let id in players) {
        let player = players[id];

        // 🔥 Langsame Interpolation für weiches Zoomen
        player.zoom += (player.targetZoom - player.zoom) * 0.1; 

        // Begrenzung, damit es nicht zu weit oder zu wenig zoomt
        player.zoom = Math.max(BASE_ZOOM, Math.min(player.zoom, BASE_ZOOM + 5000));
    }
}
setInterval(smoothZoomUpdate, 50);
