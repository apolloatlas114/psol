import express from "express";

const router = express.Router();

router.post("/matchmaking", async (req, res) => {
  const { gameMode, playerId } = req.body;
  if (!gameMode || !playerId) {
    return res.status(400).json({ error: "Missing gameMode or playerId" });
  }
  
  // Simulated matchmaking logic (to be expanded)
  res.json({ success: true, match: { gameMode, playerId, status: "waiting" } });
});

export default router;
