import express from "express";
import Payout from "../models/Payout.js";

const router = express.Router();

async function sendSolanaPayment(wallet, amount) {
  console.log(`💸 Sending ${amount} SOL to ${wallet}...`);
  return new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated delay
}

// Distribute payouts to winners
router.post("/payout", async (req, res) => {
  try {
    const { gameId, winners } = req.body;

    if (!gameId || !winners.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let payoutResults = [];
    for (const winner of winners) {
      await sendSolanaPayment(winner.playerWallet, winner.amount);
      payoutResults.push({ playerWallet: winner.playerWallet, amount: winner.amount });
    }

    const newPayout = new Payout({ gameId, winners: payoutResults, status: "completed" });
    await newPayout.save();

    console.log(`✅ Payouts completed for game ${gameId}`);
    res.json({ success: true, message: "Payouts processed successfully!" });
  } catch (error) {
    console.error("❌ Error processing payouts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
