const solanaWeb3 = require("@solana/web3.js");
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const GameSession = require("../models/GameSession");

// Function to send SOL to winners
async function sendPrize(toWallet, amount) {
    try {
        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
        const fromWallet = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.GAME_WALLET_SECRET)));
        const toPublicKey = new solanaWeb3.PublicKey(toWallet);

        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: fromWallet.publicKey,
                toPubkey: toPublicKey,
                lamports: solanaWeb3.LAMPORTS_PER_SOL * amount,
            })
        );

        const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [fromWallet]);
        return signature;
    } catch (error) {
        console.error("Error sending prize:", error);
        return null;
    }
}

// API to distribute prizes when a game ends
router.post("/distribute-prizes", async (req, res) => {
    try {
        const { gameId } = req.body;
        const game = await GameSession.findById(gameId);
        if (!game) return res.status(404).json({ success: false, message: "Game not found" });

        // Define winners and prize pool
        const totalPool = game.totalPrizePool;
        const winners = game.winners; // Example: [{username, wallet, position}]

        const prizeDistribution = [0.50, 0.30, 0.20]; // 50%, 30%, 20% for top 3

        for (let i = 0; i < winners.length; i++) {
            const winner = winners[i];
            const prizeAmount = totalPool * prizeDistribution[i];
            
            if (prizeAmount > 0) {
                const tx = await sendPrize(winner.wallet, prizeAmount);
                if (tx) {
                    // Store transaction in database
                    await User.findOneAndUpdate(
                        { username: winner.username },
                        { $inc: { balance: prizeAmount }, $push: { transactions: { type: "win", amount: prizeAmount, tx } } }
                    );
                }
            }
        }

        res.json({ success: true, message: "Prizes distributed successfully" });

    } catch (error) {
        console.error("Prize distribution error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
