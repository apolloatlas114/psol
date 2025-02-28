// rooms/MyRoom.js
import { Room } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

// Definiere einen Spieler als Schema
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
    this.setState(new MyRoomState());
    console.log("Room created with options:", options);
  }
  
  onJoin(client, options) {
    console.log(client.sessionId, "joined.");
    // Erstelle einen neuen Spieler
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
    
    // Broadcaste den neuen Zustand an alle Clients
    this.broadcast("stateUpdate", this.state);
  }
  
  onMessage(client, message) {
    // Beispiel: Verarbeite Bewegungsupdates
    const player = this.state.players.get(client.sessionId);
    if (player && message.action === "move") {
      player.x = message.x;
      player.z = message.z;
      // Hier können Score und andere Werte aktualisiert werden
      this.broadcast("stateUpdate", this.state);
    }
  }
  
  onLeave(client, consented) {
    console.log(client.sessionId, "left.");
    this.state.players.delete(client.sessionId);
    this.broadcast("stateUpdate", this.state);
  }
  
  onDispose() {
    console.log("Dispose room");
  }
}
