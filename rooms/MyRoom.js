// rooms/MyRoom.js
import { Room } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

// Definiere das Spieler-Schema
export class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") size = 40;
  @type("number") score = 0;
  @type("string") skin = "";
  @type("string") mode = "free";
  @type("string") lobby = "";
}

// Definiere den Raum-Zustand
export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema();
}

export class MyRoom extends Room {
  onCreate(options) {
    console.log("Room created with options:", options);
    this.setState(new MyRoomState());
  }
  
  onJoin(client, options) {
    console.log(client.sessionId, "joined.");
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.username || "Anonymous";
    player.x = Math.random() * 1000 - 500;
    player.z = Math.random() * 1000 - 500;
    player.size = 40;
    player.score = 0;
    player.skin = "textures/playerSkin1.png";
    player.lobby = "lobby-" + Date.now();
    
    this.state.players.set(client.sessionId, player);
    // Broadcast Update an alle Clients (für Lobby/Warteraum)
    this.broadcast("waitingRoomUpdate", Array.from(this.state.players.values()));
    
    // Sende auch den kompletten Zustand an den neu beigetretenen Client
    client.send("stateUpdate", this.state);
  }
  
  onMessage(client, message) {
    // Beispiel: Verarbeite Bewegungsupdates (z.B. { action: "move", x, z })
    const player = this.state.players.get(client.sessionId);
    if (player && message.action === "move") {
      player.x = message.x;
      player.z = message.z;
      // Sende den aktualisierten Zustand an alle Clients
      this.broadcast("stateUpdate", this.state);
      // Ebenfalls in der Lobby könntest du ein waitingRoomUpdate senden, wenn nötig.
    }
  }
  
  onLeave(client, consented) {
    console.log(client.sessionId, "left.");
    this.state.players.delete(client.sessionId);
    this.broadcast("stateUpdate", this.state);
    this.broadcast("waitingRoomUpdate", Array.from(this.state.players.values()));
  }
  
  onDispose() {
    console.log("Dispose room");
  }
}
