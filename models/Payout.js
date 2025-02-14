import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema({
  gameId: { type: String, required: true }, // The Game Session ID
  winners: [{ playerWallet: String, amount: Number }], // List of winners and payout amounts
  status: { type: String, default: "pending" }, // pending → completed
  timestamp: { type: Date, default: Date.now }, // Auto timestamp
});

export default mongoose.model("Payout", payoutSchema);
