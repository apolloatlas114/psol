import { io } from "https://cdn.socket.io/4.5.4/dist/socket.io.esm.min.js";

// Connect to WebSocket Server
export const socket = io("https://psolgame-e77454844bbd.herokuapp.com/");

// Basis-Warteraum-Logik (wird hier hauptsächlich zum Debuggen genutzt)
document.addEventListener("DOMContentLoaded", () => {
  initializeMultiplayer();

  const freeJoinButton = document.getElementById("freeJoinButton");
  if (freeJoinButton) {
    freeJoinButton.addEventListener("click", (e) => {
      e.preventDefault();
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
      localStorage.setItem("gameData", JSON.stringify({ username }));
      socket.emit("playerJoin", { username });
      const waitingPopup = document.getElementById("freeWaitingPopup");
      if (waitingPopup) waitingPopup.style.display = "block";
    });
  } else {
    console.error("❌ ERROR: 'freeJoinButton' not found!");
  }

  socket.on("waitingRoomUpdate", (waitingPlayers) => {
    console.log("🕐 Waiting Room Updated:", waitingPlayers);
    let waitingList = document.getElementById("freeWaitingList");
    if (waitingList) {
      waitingList.innerHTML = waitingPlayers.map(p => `<li>${p.name}</li>`).join("");
    }
    const waitingPopup = document.getElementById("freeWaitingPopup");
    if (waitingPopup) waitingPopup.style.display = "block";
  });

  socket.on("startGameCountdown", (countdown) => {
    console.log(`⏳ Game starting in ${countdown} seconds...`);
    const countdownElement = document.getElementById("waiting-room-countdown");
    if (countdownElement) {
      countdownElement.innerText = `Game starts in ${countdown} seconds...`;
    }
  });

  socket.on("gameStart", (data) => {
    if (!data || !data.players || data.players.length === 0) return;
    console.log("🚀 Game started!", data);
    const waitingPopup = document.getElementById("freeWaitingPopup");
    if (waitingPopup) waitingPopup.style.display = "none";
    const gameCanvas = document.getElementById("gameCanvas");
    if (gameCanvas) gameCanvas.style.display = "block";
    renderPlayers(data.players);
  });
});

function renderPlayers(playersData) {
  console.log("🔄 Rendering players...");
  playersData.forEach(player => {
    console.log(`🔹 Player: ${player.name} at X: ${player.x}, Z: ${player.z}`);
  });
}
