import { io } from "https://cdn.jsdelivr.net/npm/socket.io-client@4.5.4/dist/socket.io.esm.min.js";

// Connect to WebSocket Server
export const socket = io("https://psolgame-e77454844bbd.herokuapp.com/");

// Global variables
let players = {};
let currentPlayer = null;
let isInWaitingRoom = false; // ✅ Prevent immediate game start
let isGameStarting = false;  // ✅ Prevents double game start

document.addEventListener("DOMContentLoaded", () => {
  initializeMultiplayer();

  // Find Free-to-Play Join Button
  const freeJoinButton = document.getElementById("freeJoinButton");
  if (freeJoinButton) {
    freeJoinButton.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent form submission

      const usernameInput = document.getElementById("freeUsernameInput");
      if (!usernameInput) {
        console.error("❌ ERROR: 'freeUsernameInput' not found!");
        return;
      }

      let username = usernameInput.value.trim();
      if (!username) {
        alert("⚠️ Please enter a username!");
        return;
      }

      console.log(`📨 Sending playerJoin event with username: "${username}"`);

      // ✅ Store username locally using the same key as in HTML/gameData
      localStorage.setItem("gameData", JSON.stringify({ username }));

      // ✅ Ensure player stays in waiting room (prevent auto-start)
      isInWaitingRoom = true;

      // ✅ Send request to join waiting room
      socket.emit("playerJoin", { username });

      // ✅ Show waiting room UI
      const waitingPopup = document.getElementById("freeWaitingPopup");
      if (waitingPopup) {
        waitingPopup.style.display = "block";
      }
    });
  } else {
    console.error("❌ ERROR: 'freeJoinButton' not found!");
  }
});

// ✅ Ensure game starts only after enough players are in the waiting room
function initializeMultiplayer() {
  socket.on("waitingRoomUpdate", (waitingPlayers) => {
    console.log("🕐 Waiting Room Updated:", waitingPlayers);

    let waitingList = document.getElementById("freeWaitingList");
    if (waitingList) {
      waitingList.innerHTML = waitingPlayers.map(p => `<li>${p.name}</li>`).join("");
    }

    // ✅ Ensure the UI remains open
    const waitingPopup = document.getElementById("freeWaitingPopup");
    if (waitingPopup) {
      waitingPopup.style.display = "block";
    }
  });

  // ✅ Listen for game start countdown
  socket.on("startGameCountdown", (countdown) => {
    console.log(`⏳ Game starting in ${countdown} seconds...`);
    const countdownElement = document.getElementById("waiting-room-countdown");
    if (countdownElement) {
      countdownElement.innerText = `Game starts in ${countdown} seconds...`;
    }
  });

  // ✅ Prevent Immediate Game Start and handle game start event
  socket.on("gameStart", (data) => {
    if (!isInWaitingRoom || isGameStarting) return; // Prevent multiple game starts
    isGameStarting = true;

    console.log("🚀 Game started!");

    // Hide Waiting Room UI
    const waitingPopup = document.getElementById("freeWaitingPopup");
    if (waitingPopup) {
      waitingPopup.style.display = "none";
    }

    // Show Game Canvas
    const gameCanvas = document.getElementById("gameCanvas");
    if (gameCanvas) {
      gameCanvas.style.display = "block";
    }

    players = data.players;
    if (players[socket.id]) {
      currentPlayer = players[socket.id];
      console.log(`✅ You are playing as: ${currentPlayer.name}, Skin: ${currentPlayer.skin}`);
    }

    renderPlayers();
  });
}

// ✅ Render Players in Console for Debugging
function renderPlayers() {
  console.log("🔄 Rendering players...");
  Object.values(players).forEach(player => {
    console.log(`🔹 Player: ${player.name} at X: ${player.x}, Z: ${player.z}`);
  });
}
