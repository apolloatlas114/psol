import { io } from "https://cdn.jsdelivr.net/npm/socket.io-client@4.5.4/dist/socket.io.esm.min.js";

export const socket = io("https://psolgame-e77454844bbd.herokuapp.com/");

let players = {};
let currentPlayer = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeMultiplayer();

    const startButton = document.getElementById("startGameButton");
    if (startButton) {
        startButton.addEventListener("click", () => {
            let usernameInput = document.getElementById("username").value.trim();
            if (!usernameInput) {
                alert("Please enter a username!");
                return;
            }

            // ✅ Store name correctly
            localStorage.setItem("playerName", usernameInput);

            // ✅ Hide name entry and show game
            document.getElementById("nameEntry").style.display = "none";
            document.getElementById("gameCanvas").style.display = "block";

            console.log(`📨 Sending playerJoin event with username: "${usernameInput}"`);

            // ✅ Emit event with correct username
            socket.emit("playerJoin", { username: usernameInput });
        });
    } else {
        console.error("❌ ERROR: 'startGameButton' not found in the document!");
    }
});

function initializeMultiplayer() {
    let username = localStorage.getItem("playerName");

    if (!username) {
        document.getElementById("nameEntry").style.display = "block";
        document.getElementById("gameCanvas").style.display = "none";
        return;
    }

    username = username.trim();
    console.log(`📝 Retrieved Name from Storage: "${username}"`);

    document.getElementById("nameEntry").style.display = "none";
    document.getElementById("gameCanvas").style.display = "block";

    // ✅ Send the correct username stored in localStorage
    socket.emit("playerJoin", { username });

    socket.on("playerData", (data) => {
        players = data.players;

        if (players[socket.id]) {
            currentPlayer = players[socket.id];
            console.log(`✅ You are playing as: ${currentPlayer.name}, Skin: ${currentPlayer.skin}`);
        } else {
            console.error("❌ ERROR: Player name was not properly received!");
        }

        renderPlayers();
    });
}

socket.on("newPlayer", (player) => {
    console.log(`🟢 New player joined: ${player.name}`);
    players[player.id] = player;
    renderPlayers();
});

socket.on("updatePlayers", (playersData) => {
    players = playersData;
    renderPlayers();
});

socket.on("updateLeaderboard", (leaderboard) => {
    console.log("📊 Updating Leaderboard:", leaderboard);
    updateLeaderboardUI(leaderboard);
});

socket.on("removePlayer", (playerId) => {
    console.log(`❌ Removing player: ${playerId}`);
    delete players[playerId];
    renderPlayers();
});

document.addEventListener("mousemove", (event) => {
    if (!currentPlayer) return;

    const rect = document.getElementById("gameCanvas").getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    let targetPosition = { x: mouseX * 500, z: mouseY * 500 };

    currentPlayer.x = targetPosition.x;
    currentPlayer.z = targetPosition.z;

    socket.emit("playerMove", { id: socket.id, x: currentPlayer.x, z: currentPlayer.z });
});

function sendScoreUpdate(score) {
    if (!currentPlayer) return;

    console.log(`📨 Sending score update: ${score}`);
    socket.emit("updateScore", { id: socket.id, name: currentPlayer.name, score });
}

function updateLeaderboardUI(leaderboard) {
    let leaderboardElement = document.getElementById("leaderboard-list");
    if (!leaderboardElement) return;

    leaderboardElement.innerHTML = leaderboard
        .map((player, index) => `<li>#${index + 1}: ${player.name} - ${player.score}</li>`)
        .join("");

    if (!leaderboard.some(p => p.id === socket.id)) {
        if (currentPlayer) {
            leaderboardElement.innerHTML += `<li>🔹 ${currentPlayer.name} - ${currentPlayer.score}</li>`;
        }
    }
}

function renderPlayers() {
    console.log("🔄 Rendering players...");
    Object.values(players).forEach(player => {
        console.log(`🔹 Player: ${player.name} at X: ${player.x}, Z: ${player.z}`);
    });
}
