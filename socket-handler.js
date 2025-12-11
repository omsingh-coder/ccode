// socket-handler.js
// All socket events and high-level coordination (uses room-manager, chess-logic, secret-encryption)

const RoomManager = require('./room-manager');
const ChessLogic = require('./chess-logic');
const { encryptSecret, decryptSecret } = require('./secret-encryption');

module.exports = function(io) {
  const rooms = new RoomManager();

  io.on('connection', socket => {
    console.log('conn:', socket.id);

    socket.on('create_room', (data, cb) => {
      const { displayName } = data || {};
      const roomCode = rooms.createRoom(displayName, socket.id);
      socket.join(roomCode);
      cb && cb({ ok: true, roomCode });
      io.to(roomCode).emit('room_update', rooms.getRoomInfo(roomCode));
    });

    socket.on('join_room', (data, cb) => {
      const { roomCode, displayName } = data || {};
      const res = rooms.joinRoom(roomCode, socket.id, displayName);
      if (!res.ok) return cb && cb({ error: res.error });
      socket.join(roomCode);
      cb && cb({ ok: true });
      io.to(roomCode).emit('room_update', rooms.getRoomInfo(roomCode));
    });

    socket.on('submit_secret', (data, cb) => {
      const { roomCode, secret } = data || {};
      const room = rooms.getRoom(roomCode);
      if (!room) return cb && cb({ error: 'Room not found' });
      const enc = encryptSecret(String(secret || ''));
      rooms.setPlayerSecret(roomCode, socket.id, enc);
      cb && cb({ ok: true });
      io.to(roomCode).emit('room_update', rooms.getRoomInfo(roomCode));
      // Auto-start if two players + both secrets present
      if (rooms.canStart(roomCode)) {
        rooms.startGame(roomCode);
        io.to(roomCode).emit('game_start', { fen: rooms.getFen(roomCode), whitePlayerId: rooms.getWhiteId(roomCode) });
      }
    });

    socket.on('make_move', (data, cb) => {
      const { roomCode, from, to, promotion } = data || {};
      const room = rooms.getRoom(roomCode);
      if (!room) return cb && cb({ error: 'Room not found' });
      const moveRes = ChessLogic.makeMove(room, { from, to, promotion });
      if (!moveRes.ok) return cb && cb({ error: moveRes.error });
      // broadcast updated fen and move
      io.to(roomCode).emit('move_made', { fen: room.chess.fen(), move: moveRes.move });
      // check game over
      if (room.chess.game_over()) {
        rooms.finishGame(roomCode, moveRes.result || {});
        io.to(roomCode).emit('game_over', { reason: moveRes.reason  'finished', result: moveRes.result  null });
        // Reveal opponent secret to winner only
        const winnerSocketId = rooms.getWinnerSocketId(roomCode);
        if (winnerSocketId) {
          const opponentId = rooms.getOpponentId(roomCode, winnerSocketId);
          const opponentEnc = rooms.getPlayerEncryptedSecret(roomCode, opponentId);
          if (opponentEnc) {
            try {
              const secret = decryptSecret(opponentEnc);
              io.to(winnerSocketId).emit('reveal_opponent_secret', { secret });
            } catch (e) {
              console.error('decrypt fail', e);
            }
          }
        }
      }
      cb && cb({ ok: true });
      io.to(roomCode).emit('room_update', rooms.getRoomInfo(roomCode));
    });

    socket.on('request_room_info', (data, cb) => {
      const { roomCode } = data || {};
      cb && cb(rooms.getRoomInfo(roomCode));
    });

    socket.on('disconnecting', () => {
      for (const roomCode of socket.rooms) {
        if (roomCode === socket.id) continue;
        rooms.leaveRoom(roomCode, socket.id);
        io.to(roomCode).emit('room_update', rooms.getRoomInfo(roomCode));
      }
    });
  });
};
