// room-manager.js
// In-memory room manager. Single-file-simplicity for demo.

const { Chess } = require('chess.js');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  makeCode(len = 4) {
    return Math.random().toString(36).substr(2, len).toUpperCase();
  }

  createRoom(displayName, socketId) {
    const roomCode = this.makeCode(4);
    const room = {
      roomCode,
      playersOrder: [], // socket ids in join order
      players: {},      // socketId -> { displayName, encryptedSecret }
      chess: new Chess(),
      status: 'waiting',
      createdAt: Date.now(),
      winner: null
    };
    this.rooms.set(roomCode, room);

    if (socketId) {
      room.playersOrder.push(socketId);
      room.players[socketId] = { displayName: displayName || 'Guest' };
    }

    return roomCode;
  }

  joinRoom(roomCode, socketId, displayName) {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, error: 'Room not found' };
    if (Object.keys(room.players).length >= 2) {
      return { ok: false, error: 'Room full' };
    }

    room.playersOrder.push(socketId);
    room.players[socketId] = { displayName: displayName || 'Guest' };
    return { ok: true };
  }

  leaveRoom(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    delete room.players[socketId];
    room.playersOrder = room.playersOrder.filter(id => id !== socketId);

    if (Object.keys(room.players).length === 0) {
      this.rooms.delete(roomCode);
    } else {
      room.status = 'waiting';
      room.chess = new Chess();
    }
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  getRoomInfo(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      roomCode: room.roomCode,
      players: room.playersOrder.map(id => ({
        id,
        name: room.players[id]?.displayName || 'Guest',
        hasSecret: !!room.players[id]?.encryptedSecret
      })),
      status: room.status,
      fen: room.chess ? room.chess.fen() : null
    };
  }

  setPlayerSecret(roomCode, socketId, encryptedSecret) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.players[socketId]) return false;
    room.players[socketId].encryptedSecret = encryptedSecret;
    return true;
  }

  getPlayerEncryptedSecret(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    return room?.players[socketId]?.encryptedSecret || null;
  }

  canStart(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const ids = Object.keys(room.players);
    if (ids.length !== 2) return false;

    return ids.every(id => !!room.players[id].encryptedSecret);
  }

  startGame(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.status = 'playing';
    room.chess = new Chess();
  }

  getFen(roomCode) {
    const room = this.rooms.get(roomCode);
    return room?.chess ? room.chess.fen() : null;
  }

  getWhiteId(roomCode) {
    const room = this.rooms.get(roomCode);
    return room ? room.playersOrder[0] : null;
  }

  getOpponentId(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return room.playersOrder.find(id => id !== socketId) || null;
  }

  finishGame(roomCode, result) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.status = 'finished';
    room.winner = result?.winner || null;
  }

  getWinnerSocketId(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.chess) return null;

    // Only checkmate produces a winner
    if (room.chess.in_checkmate()) {
      // turn() returns side to move = loser
      const loserIs = room.chess.turn() === 'w' ? 'white' : 'black';
      const winnerColor = loserIs === 'white' ? 'black' : 'white';

      const whiteId = room.playersOrder[0];
      const blackId = room.playersOrder[1];

      return winnerColor === 'white' ? whiteId : blackId;
    }

    return null;
  }
}

module.exports = RoomManager;
