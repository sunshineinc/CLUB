// Game state
const gameState = {
    playerName: '',
    coins: 0,
    penguin: {
        model: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        color: 0x000000,
        hat: 'none',
        clothes: 'none',
        accessories: 'none'
    },
    inventory: [],
    igloo: {
        furniture: [],
        layout: []
    },
    isMoving: false,
    direction: 'right',
    chatBubbles: new Map(),
    currentMinigame: null,
    otherPlayers: new Map(),
    socket: null
};

// Three.js variables
let scene, camera, renderer, controls;
let clock = new THREE.Clock();
let mixer, animations = {};

// Igloo scene variables
let iglooScene, iglooCamera, iglooRenderer;
let selectedFurniture = null;
let placedFurniture = [];

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const playerNameInput = document.getElementById('player-name');
const startButton = document.getElementById('start-button');
const nameDisplay = document.getElementById('name-display');
const coinsDisplay = document.getElementById('coins');
const chatInput = document.getElementById('chat-input');
const sendMessageButton = document.getElementById('send-message');
const chatMessages = document.getElementById('chat-messages');
const customizeButton = document.getElementById('customize-button');
const visitIglooButton = document.getElementById('visit-igloo');
const openShopButton = document.getElementById('open-shop');
const customizationPanel = document.getElementById('customization-panel');
const shopPanel = document.getElementById('shop-panel');
const iglooPanel = document.getElementById('igloo-panel');
const penguinColorInput = document.getElementById('penguin-color');
const hatSelect = document.getElementById('hat-select');
const clothesSelect = document.getElementById('clothes-select');
const accessoriesSelect = document.getElementById('accessories-select');
const saveCustomizationButton = document.getElementById('save-customization');
const closeCustomizationButton = document.getElementById('close-customization');
const closeShopButton = document.getElementById('close-shop');
const closeIglooButton = document.getElementById('close-igloo');

// Event Listeners
startButton.addEventListener('click', startGame);
document.addEventListener('keydown', handleKeyPress);
document.addEventListener('keyup', handleKeyUp);
sendMessageButton.addEventListener('click', sendMessage);
customizeButton.addEventListener('click', () => customizationPanel.classList.remove('hidden'));
visitIglooButton.addEventListener('click', () => {
    iglooPanel.classList.remove('hidden');
    initIglooScene();
});
openShopButton.addEventListener('click', () => shopPanel.classList.remove('hidden'));
saveCustomizationButton.addEventListener('click', saveCustomization);
closeCustomizationButton.addEventListener('click', () => customizationPanel.classList.add('hidden'));
closeShopButton.addEventListener('click', () => shopPanel.classList.add('hidden'));
closeIglooButton.addEventListener('click', () => iglooPanel.classList.add('hidden'));

// Initialize Three.js scene
function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create ground
    createGround();
    
    // Load penguin model
    loadPenguinModel();
    
    // Position camera
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Start animation loop
    animate();
}

function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8BC34A,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function loadPenguinModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('assets/penguin.glb', (gltf) => {
        gameState.penguin.model = gltf.scene;
        gameState.penguin.model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        
        // Set up animations
        mixer = new THREE.AnimationMixer(gameState.penguin.model);
        gltf.animations.forEach((clip) => {
            animations[clip.name] = mixer.clipAction(clip);
        });
        
        scene.add(gameState.penguin.model);
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update penguin position and animation
    if (gameState.penguin.model) {
        if (gameState.isMoving) {
            const speed = 5 * delta;
            if (gameState.direction === 'left') {
                gameState.penguin.model.position.x -= speed;
                gameState.penguin.model.rotation.y = Math.PI;
            } else {
                gameState.penguin.model.position.x += speed;
                gameState.penguin.model.rotation.y = 0;
            }
            
            // Send position update to server
            if (gameState.socket && gameState.socket.readyState === WebSocket.OPEN) {
                gameState.socket.send(JSON.stringify({
                    type: 'update_position',
                    position: gameState.penguin.model.position,
                    rotation: { y: gameState.penguin.model.rotation.y }
                }));
            }
            
            // Play walking animation
            if (animations.walk) {
                animations.walk.play();
            }
        } else {
            // Play idle animation
            if (animations.idle) {
                animations.idle.play();
            }
        }
    }
    
    // Update animations
    if (mixer) {
        mixer.update(delta);
    }
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    // Update chat bubbles
    updateChatBubbles();
    
    renderer.render(scene, camera);
}

function startGame() {
    const name = playerNameInput.value.trim();
    if (name) {
        gameState.playerName = name;
        nameDisplay.textContent = name;
        menuScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        initScene();
        initMultiplayer();
    } else {
        alert('Por favor, digite seu nome!');
    }
}

function handleKeyPress(event) {
    switch(event.key) {
        case 'ArrowLeft':
            gameState.isMoving = true;
            gameState.direction = 'left';
            break;
        case 'ArrowRight':
            gameState.isMoving = true;
            gameState.direction = 'right';
            break;
    }
}

function handleKeyUp(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        gameState.isMoving = false;
    }
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (message && gameState.socket && gameState.socket.readyState === WebSocket.OPEN) {
        gameState.socket.send(JSON.stringify({
            type: 'chat',
            message: message
        }));
        
        chatInput.value = '';
    }
}

function createChatBubble(message) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = message;
    document.body.appendChild(bubble);
    
    const id = Date.now();
    gameState.chatBubbles.set(id, {
        element: bubble,
        createdAt: Date.now()
    });
}

function updateChatBubbles() {
    const now = Date.now();
    gameState.chatBubbles.forEach((bubble, id) => {
        if (now - bubble.createdAt > 5000) {
            bubble.element.remove();
            gameState.chatBubbles.delete(id);
        } else if (gameState.penguin.model) {
            const screenPos = gameState.penguin.model.position.clone();
            screenPos.project(camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            bubble.element.style.left = `${x}px`;
            bubble.element.style.top = `${y - 50}px`;
        }
    });
}

function saveCustomization() {
    const color = penguinColorInput.value;
    const hat = hatSelect.value;
    const clothes = clothesSelect.value;
    const accessories = accessoriesSelect.value;
    
    gameState.penguin.color = parseInt(color.replace('#', '0x'));
    gameState.penguin.hat = hat;
    gameState.penguin.clothes = clothes;
    gameState.penguin.accessories = accessories;
    
    // Update penguin model
    if (gameState.penguin.model) {
        gameState.penguin.model.traverse((node) => {
            if (node.isMesh && node.name === 'body') {
                node.material.color.setHex(gameState.penguin.color);
            }
        });
    }
    
    // Send customization to server
    if (gameState.socket && gameState.socket.readyState === WebSocket.OPEN) {
        gameState.socket.send(JSON.stringify({
            type: 'customize',
            color: gameState.penguin.color,
            hat: hat,
            clothes: clothes,
            accessories: accessories
        }));
    }
    
    customizationPanel.classList.add('hidden');
}

// Minigames
function startMinigame(type) {
    switch(type) {
        case 'sled':
            startSledRace();
            break;
        case 'fishing':
            startFishing();
            break;
        case 'dance':
            startDance();
            break;
    }
}

function startSledRace() {
    // Implement sled race minigame
    const coins = Math.floor(Math.random() * 50) + 50;
    addCoins(coins);
    alert(`Você ganhou ${coins} moedas na corrida de trenó!`);
}

function startFishing() {
    // Implement fishing minigame
    const coins = Math.floor(Math.random() * 30) + 20;
    addCoins(coins);
    alert(`Você ganhou ${coins} moedas pescando!`);
}

function startDance() {
    // Implement dance minigame
    const coins = Math.floor(Math.random() * 40) + 30;
    addCoins(coins);
    alert(`Você ganhou ${coins} moedas dançando!`);
}

function addCoins(amount) {
    gameState.coins += amount;
    coinsDisplay.textContent = `Moedas: ${gameState.coins}`;
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Screenshot functionality
function takeScreenshot() {
    // Create a temporary link element
    const link = document.createElement('a');
    link.download = 'club-penguin-screenshot.png';
    
    // Get the canvas data URL
    const canvas = document.getElementById('game-canvas');
    link.href = canvas.toDataURL('image/png');
    
    // Trigger the download
    link.click();
}

// Add screenshot keyboard shortcut (P key)
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'p') {
        takeScreenshot();
    }
});

function initIglooScene() {
    iglooScene = new THREE.Scene();
    iglooCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    iglooRenderer = new THREE.WebGLRenderer({ antialias: true });
    iglooRenderer.setSize(window.innerWidth, window.innerHeight);
    iglooRenderer.shadowMap.enabled = true;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    iglooScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    iglooScene.add(directionalLight);

    // Create igloo walls
    createIglooWalls();

    // Position camera
    iglooCamera.position.set(0, 5, 10);
    iglooCamera.lookAt(0, 0, 0);

    // Add orbit controls for igloo view
    const iglooControls = new THREE.OrbitControls(iglooCamera, iglooRenderer.domElement);
    iglooControls.enableDamping = true;
    iglooControls.dampingFactor = 0.05;

    // Start igloo animation loop
    animateIgloo();
}

function createIglooWalls() {
    // Create igloo dome
    const domeGeometry = new THREE.SphereGeometry(10, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.7,
        metalness: 0.1
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 5;
    iglooScene.add(dome);

    // Create floor
    const floorGeometry = new THREE.CircleGeometry(10, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8BC34A,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    iglooScene.add(floor);
}

function animateIgloo() {
    requestAnimationFrame(animateIgloo);
    iglooRenderer.render(iglooScene, iglooCamera);
}

function placeFurniture(furnitureType) {
    const furnitureGeometry = new THREE.BoxGeometry(1, 1, 1);
    const furnitureMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const furniture = new THREE.Mesh(furnitureGeometry, furnitureMaterial);
    
    // Position furniture in front of the camera
    const position = new THREE.Vector3();
    iglooCamera.getWorldDirection(position);
    position.multiplyScalar(5);
    furniture.position.copy(position);
    
    iglooScene.add(furniture);
    placedFurniture.push(furniture);
}

// Add event listeners for furniture placement
document.querySelectorAll('.place-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const furnitureType = e.target.parentElement.querySelector('span').textContent;
        placeFurniture(furnitureType);
    });
});

// Initialize WebSocket connection
function initMultiplayer() {
    gameState.socket = new WebSocket(`ws://${window.location.host}`);
    
    gameState.socket.onopen = () => {
        console.log('Connected to server');
    };
    
    gameState.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'init':
                // Initialize other players
                data.players.forEach(player => {
                    if (player.id !== data.id) {
                        createOtherPlayer(player);
                    }
                });
                break;
                
            case 'player_joined':
                createOtherPlayer(data.player);
                break;
                
            case 'player_left':
                removeOtherPlayer(data.id);
                break;
                
            case 'player_moved':
                updateOtherPlayerPosition(data.id, data.position, data.rotation);
                break;
                
            case 'chat':
                createChatBubble(data.message, data.id);
                break;
                
            case 'player_customized':
                updateOtherPlayerCustomization(data.id, data.customization);
                break;
        }
    };
}

function createOtherPlayer(player) {
    const loader = new THREE.GLTFLoader();
    loader.load('assets/penguin.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(player.position.x, player.position.y, player.position.z);
        model.rotation.y = player.rotation.y;
        
        // Apply customization
        model.traverse((node) => {
            if (node.isMesh && node.name === 'body') {
                node.material.color.setHex(player.color);
            }
        });
        
        scene.add(model);
        gameState.otherPlayers.set(player.id, {
            model: model,
            name: player.name
        });
    });
}

function removeOtherPlayer(playerId) {
    const player = gameState.otherPlayers.get(playerId);
    if (player) {
        scene.remove(player.model);
        gameState.otherPlayers.delete(playerId);
    }
}

function updateOtherPlayerPosition(playerId, position, rotation) {
    const player = gameState.otherPlayers.get(playerId);
    if (player) {
        player.model.position.set(position.x, position.y, position.z);
        player.model.rotation.y = rotation.y;
    }
}

function updateOtherPlayerCustomization(playerId, customization) {
    const player = gameState.otherPlayers.get(playerId);
    if (player) {
        player.model.traverse((node) => {
            if (node.isMesh && node.name === 'body') {
                node.material.color.setHex(customization.color);
            }
        });
    }
}

function createPenguin(color, hat, clothes, accessories) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const texture = new THREE.TextureLoader().load(`/generate-penguin?color=${color}&hat=${hat}&clothes=${clothes}&accessories=${accessories}`);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const penguin = new THREE.Mesh(geometry, material);
    penguin.position.set(0, 0, 0);
    return penguin;
}

function createPlayer(playerData) {
    const penguin = createPenguin(
        playerData.color,
        playerData.hat,
        playerData.clothes,
        playerData.accessories
    );
    penguin.userData.id = playerData.id;
    penguin.userData.name = playerData.name;
    scene.add(penguin);
    return penguin;
}

function customizePenguin(color, hat, clothes, accessories) {
    const texture = new THREE.TextureLoader().load(`/generate-penguin?color=${color}&hat=${hat}&clothes=${clothes}&accessories=${accessories}`);
    player.material.map = texture;
    player.material.needsUpdate = true;
    
    ws.send(JSON.stringify({
        type: 'customize',
        color: color,
        hat: hat,
        clothes: clothes,
        accessories: accessories
    }));
} 