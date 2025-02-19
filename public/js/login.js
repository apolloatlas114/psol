document.getElementById("login-btn").addEventListener("click", async () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("https://psolgame-e77454844bbd.herokuapp.com/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
        localStorage.setItem("token", data.token);
        alert("Login Successful!");
        window.location.href = "/dashboard"; // Redirect to the game dashboard
    } else {
        alert("Login failed: " + data.message);
    }
});
