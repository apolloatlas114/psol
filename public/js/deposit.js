document.getElementById("deposit-btn").addEventListener("click", async () => {
    if (!window.solana) {
        alert("Please install Phantom Wallet");
        return;
    }

    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
    const wallet = window.solana;
    await wallet.connect();

    const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: "Your_Game_Wallet_Address",
            lamports: solanaWeb3.LAMPORTS_PER_SOL * 1, // 1 SOL deposit
        })
    );

    const signature = await wallet.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature);

    alert("Deposit Successful!");
});
