document.getElementById("register-btn").addEventListener("click", async () => {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    const response = await fetch("https://psolgame-e77454844bbd.herokuapp.com/api/register", {
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
