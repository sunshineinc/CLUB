const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route handler
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
    const playerId = Date.now().toString();
    
    // Send initial player data
    ws.send(JSON.stringify({
        type: 'init',
        id: playerId,
        players: Array.from(players.values())
    }));
    
    // Add player to players map
    players.set(playerId, {
        id: playerId,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        color: 0x000000,
        hat: 'none',
        clothes: 'none',
        accessories: 'none'
    });
    
    // Broadcast new player to all clients
    broadcast({
        type: 'player_joined',
        player: players.get(playerId)
    });
    
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
                    });
                }
                break;
                
            case 'chat':
                broadcast({
                    type: 'chat',
                    id: playerId,
                    message: data.message
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

function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
}); 