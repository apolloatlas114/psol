import express from "express";
import Transaction from "../models/Transaction.js";

const router = express.Router();

// Save a new buy-in transaction
router.post("/buyin", async (req, res) => {
  try {
    const { playerWallet, amount, gameMode } = req.body;

    if (!playerWallet || !amount || !gameMode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTransaction = new Transaction({ playerWallet, amount, gameMode });
    await newTransaction.save();

    console.log(`💰 Buy-in saved for ${playerWallet} (${amount} SOL) in ${gameMode}`);
    res.json({ success: true, message: "Buy-in recorded", transactionId: newTransaction._id });
  } catch (error) {
    console.error("❌ Error saving transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
