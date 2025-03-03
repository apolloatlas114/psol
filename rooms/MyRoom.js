// rooms/MyRoom.js
import pkg from "colyseus";
const { Room } = pkg;
import { Schema, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  constructor() {
    super();
    this.id = "";
    this.name = "";
    this.x = 0;
    this.z = 0;
    this.size = 40;
    this.score = 0;
    this.skin = "";
    this.mode = "free";
    this.lobby = "";
  }
}

Player.schema = {
  id: "string",
  name: "string",
  x: "number",
  z: "number",
  size: "number",
  score: "number",
  skin: "string",
  mode: "string",
  lobby: "string"
};

export class MyRoomState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}

MyRoomState.schema = {
  players: { map: Player }
};

export class MyRoom extends Room {
  onCreate(options) {
    console.log("Room created with options:", options);
    this.setState(new MyRoomState());
  }
  
  onJoin(client, options) {
    console.log(`${client.sessionId} joined with options:`, options);
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.username || "Anonymous";
    player.x = Math.random() * 1000 - 500;
    player.z = Math.random() * 1000 - 500;
    player.skin = "textures/playerSkin1.png";
    player.lobby = "lobby-" + Date.now();
    
    this.state.players.set(client.sessionId, player);
    
    console.log("Broadcasting state update:", this.state);
    this.broadcast("stateUpdate", this.state);
  }
  
  onMessage(client, message) {
    console.log("Received message from", client.sessionId, ":", message);
    const player = this.state.players.get(client.sessionId);
    if (player && message.action === "move") {
      player.x = message.x;
      player.z = message.z;
      this.broadcast("stateUpdate", this.state);
    }
  }
  
  onLeave(client, consented) {
    console.log(`${client.sessionId} left.`);
    this.state.players.delete(client.sessionId);
    this.broadcast("stateUpdate", this.state);
  }
  
  onDispose() {
    console.log("Dispose room");
  }
}
