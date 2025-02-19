import mongoose from "mongoose";

const GameSessionSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    players: [{ username: String, wallet: String, score: Number }],
    totalPrizePool: { type: Number, required: true },
    winners: [{ username: String, wallet: String, position: Number, prize: Number }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("GameSession", GameSessionSchema);
