const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static('./'));

// Store connected players
const players = new Map();

// API endpoint to get penguin customization options
app.get('/penguin-options', (req, res) => {
    res.json({
        colors: ['default', 'red', 'blue', 'green'],
        hats: ['none', 'santa', 'party', 'wizard'],
        clothes: ['none', 'tuxedo', 'sweater', 'jacket'],
        accessories: ['none', 'glasses', 'scarf', 'bowtie']
    });
});

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    players.set(playerId, {
        id: playerId,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        color: 'default',
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