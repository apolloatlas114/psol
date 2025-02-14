import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  playerWallet: { type: String, required: true }, // Player's Solana Wallet
  amount: { type: Number, required: true }, // Buy-in amount (SOL)
  gameMode: { type: String, required: true }, // e.g., "FFA", "Team", "Coop"
  status: { type: String, default: "pending" }, // pending → completed → refunded (if needed)
  timestamp: { type: Date, default: Date.now }, // Auto timestamp
});

export default mongoose.model("Transaction", transactionSchema);
