// Event: Spawnt einen lila Radius auf dem Spielfeld und triggert weitere Logik (z.B. Boss-Spawn)

/**
 * Zeichnet einen halbtransparenten lila Kreis auf das Canvas.
 * @param {CanvasRenderingContext2D} ctx - Der Canvas-Kontext.
 * @param {number} x - X-Position des Kreismittelpunkts.
 * @param {number} y - Y-Position des Kreismittelpunkts.
 * @param {number} radius - Radius des Kreises.
 */
function drawPurpleRadius(ctx, x, y, radius) {
    ctx.save();
    ctx.globalAlpha = 0.3; // Transparenz
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#b266ff'; // Lila Farbton
    ctx.fill();
    ctx.restore();
}

/**
 * Startet das Boss-Event und gibt die Kreis-Parameter zurück.
 * @param {object} game - Das Game-Objekt oder Spielfeld.
 * @param {number} radius - Der Radius des Events.
 * @returns {object} - Die Position und der Radius des Kreises.
 */
function startBossEvent(game, radius = 200) {
    // Zufällige Position auf dem Spielfeld bestimmen
    const x = Math.random() * game.width;
    const y = Math.random() * game.height;
    // Kreis-Parameter speichern oder weitergeben
    game.bossEvent = { x, y, radius, active: true };
    // (Optional: Hier Boss spawnen)
    return { x, y, radius };
}

module.exports = {
    drawPurpleRadius,
    startBossEvent
};
