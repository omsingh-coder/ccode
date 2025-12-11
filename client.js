// client.js
// Minimal mobile-friendly chess UI + socket.io client
const socket = io();

// UI elements
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const quickBtn = document.getElementById('quickBtn');
const nameInput = document.getElementById('nameInput');
const roomCodeInput = document.getElementById('roomCodeInput');

const boardSection = document.getElementById('boardSection');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesList = document.getElementById('movesList');

const secretModal = document.getElementById('secretModal');
const secretInput = document.getElementById('secretInput');
const submitSecretBtn = document.getElementById('submitSecretBtn');

const revealModal = document.getElementById('revealModal');
const revealedSecret = document.getElementById('revealedSecret');
const closeRevealBtn = document.getElementById('closeRevealBtn');

let currentRoom = null;
let myId = null;
let selectedFrom = null;
let boardStateFEN = null;
let mySocketId = null;
let playerColor = 'white'; // first joined = white

// tiny unicode pieces mapping
const PIECES = {
  'p':'♟','r':'♜','n':'♞','b':'♝','q':'♛','k':'♚',
  'P':'♙','R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔'
};

// helpers
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function downloadFenToBoard(fen){
  // create board squares and pieces from FEN
  boardEl.innerHTML = '';
  const rows = fen.split(' ')[0].split('/');
  let rank = 8;
  for (let r of rows) {
    let file = 0;
    for (let ch of r) {
      if (/\d/.test(ch)) {
        const n = parseInt(ch,10);
        for (let i=0;i<n;i++){
          const sq = createSquare(rank, file, null);
          boardEl.appendChild(sq);
          file++;
        }
      } else {
        const sq = createSquare(rank, file, ch);
        boardEl.appendChild(sq);
        file++;
      }
    }
    rank--;
  }
}

function createSquare(rank, file, pieceChar){
  const sq = document.createElement('div');
  sq.className = 'square ' + (((rank + file) % 2 === 0) ? 'light' : 'dark');
  sq.dataset.coord = ${'abcdefgh'[file]}${rank};
  if (pieceChar) {
    const span = document.createElement('div');
    span.textContent = PIECES[pieceChar] || '?';
    span.style.fontSize = '28px';
    span.dataset.piece = pieceChar;
    sq.appendChild(span);
  }
  // touch handlers
  sq.addEventListener('click', () => onSquareClick(sq.dataset.coord, sq));
  return sq;
}

function onSquareClick(coord, sqEl){
  if (!selectedFrom) {
    // pick up if contains a piece
    if (sqEl.querySelector('[data-piece]')) {
      selectedFrom = coord;
      sqEl.style.outline = '3px solid rgba(245,158,11,0.6)';
    }
  } else {
    const to = coord;
    // send move
    socket.emit('make_move', { roomCode: currentRoom, from: selectedFrom, to }, (res) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
    // clear selection visuals
    document.querySelectorAll('.square').forEach(s => s.style.outline = 'none');
    selectedFrom = null;
  }
}

// create room
createBtn.addEventListener('click', () => {
  const name = nameInput.value || 'Guest';
  socket.emit('create_room', { displayName: name }, (res) => {
    if (res && res.roomCode) {
      currentRoom = res.roomCode;
      roomCodeInput.value = currentRoom;
      enterRoomUI();
      alert('Room created: ' + currentRoom + '\nShare this code or invite link.');
    }
  });
});

// join
joinBtn.addEventListener('click', () => {
  const code = (roomCodeInput.value || '').trim().toUpperCase();
  if (!code) return alert('Room code daalo.');
  const name = nameInput.value || 'Guest';
  socket.emit('join_room', { roomCode: code, displayName: name }, (res) => {
    if (res && res.error) return alert(res.error);
    currentRoom = code;
    enterRoomUI();
  });
});

// quick join: try join code in input else use last known
quickBtn.addEventListener('click', () => {
  const code = (roomCodeInput.value || '').trim().toUpperCase();
  if (!code) return alert('Room code daalo for quick join.');
  joinBtn.click();
});

// when in room, show secret modal to submit secret
function enterRoomUI(){
  show(secretModal);
  show(boardSection);
  statusEl.textContent = 'Room: ' + currentRoom + ' — submit secret to start';
  // request room info to set color
  socket.emit('request_room_info', { roomCode: currentRoom }, (info) => {
    if (info && info.players) {
      // if first joined, you are white
      const me = socket.id;
      mySocketId = socket.id;
      playerColor = info.players[0] && info.players[0].id === mySocketId ? 'white' : 'black';
    }
  });
}

// submit secret
submitSecretBtn.addEventListener('click', () => {
  const secret = secretInput.value || '';
  if (secret.trim().length === 0) return alert('Secret thoda likho.');
  socket.emit('submit_secret', { roomCode: currentRoom, secret }, (res) => {
    if (res && res.error) return alert(res.error);
    hide(secretModal);
    statusEl.textContent = 'Secret submitted — waiting for opponent';
  });
});

// socket events
socket.on('connect', () => {
  mySocketId = socket.id;
});

socket.on('room_update', info => {
  if (!info) return;
  // update status
  const players = info.players || [];
  statusEl.textContent = Players: ${players.map(p=>p.name).join(' & ')} • ${info.status};
});

socket.on('game_start', data => {
  boardStateFEN = data.fen;
  downloadFenToBoard(boardStateFEN);
  statusEl.textContent = 'Game started • good luck';
});

socket.on('move_made', data => {
  if (!data) return;
  boardStateFEN = data.fen;
  downloadFenToBoard(boardStateFEN);
  // append move
  if (data.move && data.move.san) {
    const div = document.createElement('div');
    div.textContent = data.move.san;
    movesList.appendChild(div);
    movesList.scrollTop = movesList.scrollHeight;
  }
});

socket.on('game_over', data => {
  statusEl.textContent = 'Game over • ' + (data.reason || '');
});

socket.on('reveal_opponent_secret', data => {
  if (data && data.secret) {
    revealedSecret.textContent = data.secret;
    show(revealModal);
  }
});

closeRevealBtn.addEventListener('click', () => {
  hide(revealModal);
});

// initial board (starting FEN)
downloadFenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
