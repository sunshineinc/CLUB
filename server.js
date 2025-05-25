const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static('./'));

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

// Store connected players
const players = new Map();

// Function to generate penguin image
function generatePenguinImage(color, hat, clothes, accessories) {
    const canvas = createCanvas(128, 128);
    const ctx = canvas.getContext('2d');

    // Draw penguin body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(64, 64, 40, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw white belly
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(64, 74, 25, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw face
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(64, 45, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw beak
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(64, 45);
    ctx.lineTo(80, 45);
    ctx.lineTo(64, 55);
    ctx.fill();

    // Draw eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(58, 42, 3, 0, Math.PI * 2);
    ctx.arc(70, 42, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw hat if specified
    if (hat !== 'none') {
        ctx.fillStyle = hat;
        ctx.beginPath();
        ctx.ellipse(64, 25, 30, 15, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw clothes if specified
    if (clothes !== 'none') {
        ctx.fillStyle = clothes;
        ctx.beginPath();
        ctx.rect(44, 90, 40, 20);
        ctx.fill();
    }

    // Draw accessories if specified
    if (accessories !== 'none') {
        ctx.fillStyle = accessories;
        ctx.beginPath();
        ctx.arc(64, 64, 45, 0, Math.PI * 2);
        ctx.stroke();
    }

    return canvas.toBuffer();
}

// API endpoint to generate penguin image
app.get('/generate-penguin', (req, res) => {
    const { color, hat, clothes, accessories } = req.query;
    const imageBuffer = generatePenguinImage(
        color || '#000000',
        hat || 'none',
        clothes || 'none',
        accessories || 'none'
    );
    
    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length
    });
    res.end(imageBuffer);
});

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    players.set(playerId, {
        id: playerId,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        color: 0x000000,
        hat: 'none',
        clothes: 'none',
        accessories: 'none',
        name: 'Penguin'
    });

    // Send current players to new player
    ws.send(JSON.stringify({
        type: 'init',
        id: playerId,
        players: Array.from(players.values())
    }));

    // Broadcast new player to all other players
    broadcast({
        type: 'player_joined',
        player: players.get(playerId)
    }, ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'update_position':
                const player = players.get(playerId);
                if (player) {
                    player.position = data.position;
                    player.rotation = data.rotation;
                    broadcast({
                        type: 'player_moved',
                        id: playerId,
                        position: data.position,
                        rotation: data.rotation
                    }, ws);
                }
                break;
            
            case 'chat':
                broadcast({
                    type: 'chat',
                    id: playerId,
                    message: data.message,
                    name: players.get(playerId).name
                });
                break;
            
            case 'customize':
                const playerToUpdate = players.get(playerId);
                if (playerToUpdate) {
                    playerToUpdate.color = data.color;
                    playerToUpdate.hat = data.hat;
                    playerToUpdate.clothes = data.clothes;
                    playerToUpdate.accessories = data.accessories;
                    broadcast({
                        type: 'player_customized',
                        id: playerId,
                        customization: {
                            color: data.color,
                            hat: data.hat,
                            clothes: data.clothes,
                            accessories: data.accessories
                        }
                    });
                }
                break;
        }
    });

    ws.on('close', () => {
        players.delete(playerId);
        broadcast({
            type: 'player_left',
            id: playerId
        });
    });
});

function broadcast(data, exclude = null) {
    wss.clients.forEach((client) => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
}); 