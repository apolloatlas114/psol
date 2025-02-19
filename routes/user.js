import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.get("/balance", async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.user.id });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, balance: user.balance });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;
