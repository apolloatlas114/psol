import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ✅ Login API (For Backend, No `document.getElementById()`)
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.status(400).json({ success: false, message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Invalid password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({ success: true, token, username: user.username, balance: user.balance });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ✅ Register API (For Backend, No `document.getElementById()`)
router.post("/register", async (req, res) => {
    try {
        const { username, password, solanaAddress } = req.body;
        const existingUser = await User.findOne({ username });

        if (existingUser) return res.status(400).json({ success: false, message: "Username already taken" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, solanaAddress });

        await newUser.save();
        res.json({ success: true, message: "Account created!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error registering." });
    }
});

export default router;
