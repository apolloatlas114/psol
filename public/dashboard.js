async function fetchUserBalance() {
    const token = localStorage.getItem("token");
    const response = await fetch("https://yourgame.herokuapp.com/api/user/balance", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();
    if (data.success) {
        document.getElementById("wallet-balance").innerText = `SOL Balance: ${data.balance} SOL`;
    }
}

// Show winning notification
async function checkRecentWinnings() {
    const token = localStorage.getItem("token");
    const response = await fetch("https://yourgame.herokuapp.com/api/user/recent-winnings", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();
    if (data.success && data.recentWin > 0) {
        alert(`🎉 Congratulations! You won ${data.recentWin} SOL. Your wallet has been credited.`);
    }
}

// Run balance update and winnings check when dashboard loads
window.onload = function() {
    fetchUserBalance();
    checkRecentWinnings();
};
