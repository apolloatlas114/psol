import express from "express";
import User from "../models/User.js";
import GameSession from "../models/GameSession.js";

const router = express.Router();

router.post("/distribute-prizes", async (req, res) => {
    try {
        const { gameId } = req.body;
        const game = await GameSession.findById(gameId);
        if (!game) return res.status(404).json({ success: false, message: "Game not found" });

        for (let winner of game.winners) {
            await User.findOneAndUpdate(
                { username: winner.username },
                { $inc: { balance: winner.prize } }
            );
        }

        res.json({ success: true, message: "Prizes distributed!" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;
