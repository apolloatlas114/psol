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

    if (!username) return;

    username = username.trim();
    console.log(`📝 Retrieved Name from Storage: "${username}"`);

    // ✅ Send the correct username stored in localStorage
    socket.emit("playerJoin", { username });

    socket.on("waitingRoomUpdate", (waitingPlayers) => {
        console.log("🕐 Waiting Room Updated:", waitingPlayers);

        let waitingList = document.getElementById("waiting-room-list");
        if (waitingList) {
            waitingList.innerHTML = waitingPlayers.map(p => `<li>${p.name}</li>`).join("");
        }

        document.getElementById("waiting-room").style.display = "block"; // ✅ Show waiting room
    });

    socket.on("gameStart", (data) => {
        document.getElementById("waiting-room").style.display = "none"; // ✅ Hide waiting room
        document.getElementById("gameCanvas").style.display = "block"; // ✅ Show game
        console.log("🚀 Game started!");

        players = data;
        if (players[socket.id]) {
            currentPlayer = players[socket.id];
            console.log(`✅ You are playing as: ${currentPlayer.name}, Skin: ${currentPlayer.skin}`);
        }

        renderPlayers();
    });

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
}

function updateLeaderboardUI(leaderboard) {
    let leaderboardElement = document.getElementById("leaderboard-list");
    if (!leaderboardElement) return;

    leaderboardElement.innerHTML = leaderboard
        .map((player, index) => `<li>#${index + 1}: ${player.name} - ${player.score}</li>`)
        .join("");
}

function renderPlayers() {
    console.log("🔄 Rendering players...");
    Object.values(players).forEach(player => {
        console.log(`🔹 Player: ${player.name} at X: ${player.x}, Z: ${player.z}`);
    });
}
