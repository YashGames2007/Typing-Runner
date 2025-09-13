const Game = require("../models/Game"); // MongoDB schema
const paragraphs = [
  "The quick brown fox jumps over the lazy dog.",
  "Typing speed is a useful skill for programmers.",
  "Socket.IO enables real-time communication.",
  "Practice makes perfect in every typing race."
];


const rooms = {};

// --- Helper: pick random paragraph ---
function getRandomParagraph() {
  return paragraphs[Math.floor(Math.random() * paragraphs.length)];
}

// --- Helper: calculate player speed ---
function calculateSpeed(wpm, acc) {
  if (wpm < 10 || acc < 0.5) return 0;
  const accFactor = Math.pow(acc, 2.2); // punish low accuracy
  const wpmFactor = Math.min(wpm / 100, 2.0); // normalize to 100 WPM
  return wpmFactor * accFactor * 2.0; // scale to fit your game
}

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);    
    // --- Join a room ---
    socket.on("join-game", ({ roomId, name }) => {
      if (!/^[A-Z]{2}[0-9]{2}$/.test(roomId)) {
        socket.emit("error-message", "Room ID must be 2 letters + 2 numbers (e.g. AB12).");
        console.log("Invalid room ID:", roomId , name);
        
        return;
      }
      if (!name || rooms[roomId]?.some(p => p.name === name)) {
        socket.emit("error-message", "Name is required and must be unique in the room.");
        return;
      }

      if (!rooms[roomId]) rooms[roomId] = [];

      rooms[roomId].push({
        name,
        progress: 0,
        wpm: 0,
        acc: 1,
        speed: 0,
        socketId: socket.id,
        ready: false,
      });

      socket.join(roomId);
      io.to(roomId).emit("player-list", rooms[roomId]);
    });

    // --- Player ready ---
    socket.on("player-ready", ({ roomId, name }) => {
      const player = rooms[roomId]?.find(p => p.name === name);
      if (player) {
        player.ready = true;
        io.to(roomId).emit("player-list", rooms[roomId]);
      }
    });

    // --- Start game ---
    socket.on("start-game", ({ roomId }) => {
      if (rooms[roomId] && rooms[roomId].length > 0 && rooms[roomId].every(p => p.ready)) {
        const paragraph = getRandomParagraph();
        rooms[roomId].forEach(p => { p.progress = 0; p.ready = false; });
        io.to(roomId).emit("game-start", { paragraph });
      } else {
        socket.emit("error-message", "All players must be ready to start the game.");
      }
    });

    // --- Update progress (where speed formula is used) ---
    socket.on("progress-update", ({ roomId, name, progress, wpm, acc }) => {
      const player = rooms[roomId]?.find(p => p.name === name);
      if (player) {
        player.progress = progress;
        player.wpm = wpm;
        player.acc = acc;
        player.speed = calculateSpeed(wpm, acc);

        io.to(roomId).emit("leaderboard-update", rooms[roomId]);
      }
    });

    // --- Game over ---
    socket.on("game-over", ({ roomId, winner }) => {
      io.to(roomId).emit("game-over", { winner });

      const game = new Game({
        roomId,
        players: rooms[roomId],
        paragraph: "", // Optional: store actual paragraph
        winner,
      });
      game.save();
    });

    // --- Disconnect cleanup ---
    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const idx = rooms[roomId].findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          rooms[roomId].splice(idx, 1);
          io.to(roomId).emit("player-list", rooms[roomId]);
        }
      }
    });
  });
};
    