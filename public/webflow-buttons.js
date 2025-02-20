// ✅ Login Button
document.getElementById("login-btn").addEventListener("click", async () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("https://psolgame-e77454844bbd.herokuapp.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
        localStorage.setItem("token", data.token);
        window.location.href = "/dashboard"; // Redirect after login
    } else {
        alert("Login failed: " + data.message);
    }
});

// ✅ Register Button
document.getElementById("register-btn").addEventListener("click", async () => {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    const response = await fetch("https://psolgame-e77454844bbd.herokuapp.com/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
        alert("Account Created! You can now log in.");
    } else {
        alert("Registration failed: " + data.message);
    }
});










// ✅ Register Button - Show Popup
document.getElementById("register-btn").addEventListener("click", () => {
    document.getElementById("popup-reg").style.display = "flex"; // Show Register Popup
    document.getElementById("popup-reg").style.zIndex = "99999"; // Ensure it’s on top
});

// ❌ Close Register Popup
document.getElementById("close-register-popup").addEventListener("click", () => {
    document.getElementById("popup-reg").style.display = "none"; // Hide it
});




























// ✅ Deposit Button
document.getElementById("deposit-btn").addEventListener("click", async () => {
    if (!window.solana) {
        alert("Please install Phantom Wallet");
        return;
    }

    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
    const wallet = window.solana;
    await wallet.connect();

    const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: "Your_Game_Wallet_Address",
            lamports: solanaWeb3.LAMPORTS_PER_SOL * 1, // 1 SOL deposit
        })
    );

    const signature = await wallet.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature);
    alert("Deposit Successful!");
});

// ✅ Withdraw Button
document.getElementById("withdraw-btn").addEventListener("click", async () => {
    const amount = prompt("Enter SOL amount to withdraw:");
    if (!amount) return;

    const response = await fetch("https://psolgame-e77454844bbd.herokuapp.com/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
    });

    const data = await response.json();
    if (data.success) {
        alert(`Withdrawal of ${amount} SOL successful!`);
    } else {
        alert("Withdrawal failed: " + data.message);
    }
});

// ✅ Join Free Game
document.getElementById("free-game-btn").addEventListener("click", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Please log in first!");
        return;
    }

    // ✅ Connect to WebSocket
    const socket = io("https://psolgame-e77454844bbd.herokuapp.com", {
    transports: ["websocket"],
    withCredentials: true
});


    // ✅ Join Free Play Mode
    socket.emit("playerJoin", { username });

    socket.on("playerData", (data) => {
        console.log("✅ Connected to Free Play Mode", data);
        localStorage.setItem("playerData", JSON.stringify(data));
        window.location.href = "https://psolgame-e77454844bbd.herokuapp.com/play?mode=free"; // Redirect after confirmation
    });

    socket.on("error", (message) => {
        console.error("❌ Error:", message);
        alert("Failed to join Free Play: " + message);
    });
});



// ✅ Join Team Cash Game
document.getElementById("team-game-btn").addEventListener("click", async () => {
    window.location.href = "https://psolgame-e77454844bbd.herokuapp.com/play?mode=team";
});

// ✅ Join Coop Cash Game
document.getElementById("coop-game-btn").addEventListener("click", async () => {
    window.location.href = "https://psolgame-e77454844bbd.herokuapp.com/play?mode=coop";
});

// ✅ Join FFA Cash Game
document.getElementById("ffa-game-btn").addEventListener("click", async () => {
    window.location.href = "https://psolgame-e77454844bbd.herokuapp.com/play?mode=ffa";
});

// ✅ Add Friend + Referral
document.getElementById("add-friend-btn").addEventListener("click", async () => {
    const response = await fetch("https://psolgame-e77454844bbd.herokuapp.com/api/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
    });

    const data = await response.json();
    if (data.success) {
        alert(`Referral Link: ${data.link}`);
    } else {
        alert("Failed to generate referral link.");
    }
});

// ✅ Join/Create Clan
document.getElementById("clan-btn").addEventListener("click", () => {
    window.location.href = "/clan";
});

// ✅ Open Chat
document.getElementById("chat-btn").addEventListener("click", () => {
    document.getElementById("chat-container").style.display = "block";
});
