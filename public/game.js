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
    console.log('Initializing scene...');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Create ground
    createGround();
    
    // Load penguin model
    loadPenguinModel();
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Start animation loop
    animate();
    
    console.log('Scene initialized successfully');
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
    console.log('Loading penguin model...');
    
    // Criar um pinguim simples usando geometrias básicas
    const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    const bellyGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
    belly.position.z = 0.3;
    
    const headGeometry = new THREE.SphereGeometry(0.7, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.2;
    
    const beakGeometry = new THREE.ConeGeometry(0.2, 0.5, 32);
    const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.z = 0.5;
    beak.position.y = 1.2;
    beak.rotation.x = -Math.PI / 2;
    
    const leftEyeGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
    leftEye.position.set(0.2, 1.3, 0.5);
    
    const rightEyeGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial);
    rightEye.position.set(-0.2, 1.3, 0.5);
    
    const leftWingGeometry = new THREE.BoxGeometry(0.2, 1, 0.5);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftWing = new THREE.Mesh(leftWingGeometry, wingMaterial);
    leftWing.position.set(1, 0, 0);
    
    const rightWingGeometry = new THREE.BoxGeometry(0.2, 1, 0.5);
    const rightWing = new THREE.Mesh(rightWingGeometry, wingMaterial);
    rightWing.position.set(-1, 0, 0);
    
    const leftFootGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.5);
    const footMaterial = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    const leftFoot = new THREE.Mesh(leftFootGeometry, footMaterial);
    leftFoot.position.set(0.3, -1, 0);
    
    const rightFootGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.5);
    const rightFoot = new THREE.Mesh(rightFootGeometry, footMaterial);
    rightFoot.position.set(-0.3, -1, 0);
    
    // Criar o grupo do pinguim
    const penguin = new THREE.Group();
    penguin.add(body);
    penguin.add(belly);
    penguin.add(head);
    penguin.add(beak);
    penguin.add(leftEye);
    penguin.add(rightEye);
    penguin.add(leftWing);
    penguin.add(rightWing);
    penguin.add(leftFoot);
    penguin.add(rightFoot);
    
    // Adicionar sombras
    penguin.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
    
    gameState.penguin.model = penguin;
    scene.add(penguin);
    
    console.log('Penguin model loaded successfully');
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
    
    // Render scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function startGame() {
    const name = playerNameInput.value.trim();
    if (name) {
        console.log('Starting game with name:', name);
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

// Function to generate penguin texture
function generatePenguinTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
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

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Function to generate hat texture
function generateHatTexture(hatType) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    switch(hatType) {
        case 'santa':
            // Draw Santa hat
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(32, 64);
            ctx.lineTo(96, 64);
            ctx.lineTo(64, 32);
            ctx.fill();
            // Draw white trim
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.rect(32, 64, 64, 8);
            ctx.fill();
            break;
        case 'party':
            // Draw party hat
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(32, 64);
            ctx.lineTo(96, 64);
            ctx.lineTo(64, 32);
            ctx.fill();
            break;
        case 'wizard':
            // Draw wizard hat
            ctx.fillStyle = '#4B0082';
            ctx.beginPath();
            ctx.moveTo(32, 64);
            ctx.lineTo(96, 64);
            ctx.lineTo(64, 16);
            ctx.fill();
            break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Function to generate clothes texture
function generateClothesTexture(clothesType) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    switch(clothesType) {
        case 'tuxedo':
            // Draw tuxedo
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.rect(44, 90, 40, 20);
            ctx.fill();
            // Draw white shirt
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.rect(54, 90, 20, 20);
            ctx.fill();
            break;
        case 'sweater':
            // Draw sweater
            ctx.fillStyle = '#4169E1';
            ctx.beginPath();
            ctx.rect(44, 90, 40, 20);
            ctx.fill();
            break;
        case 'jacket':
            // Draw jacket
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.rect(44, 90, 40, 20);
            ctx.fill();
            break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Function to generate accessories texture
function generateAccessoriesTexture(accessoryType) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    switch(accessoryType) {
        case 'glasses':
            // Draw glasses
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(48, 42, 8, 0, Math.PI * 2);
            ctx.arc(80, 42, 8, 0, Math.PI * 2);
            ctx.stroke();
            // Draw bridge
            ctx.beginPath();
            ctx.moveTo(56, 42);
            ctx.lineTo(72, 42);
            ctx.stroke();
            break;
        case 'scarf':
            // Draw scarf
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.rect(44, 64, 40, 8);
            ctx.fill();
            break;
        case 'bowtie':
            // Draw bowtie
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(64, 64, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function createPenguin(color, hat, clothes, accessories) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: generatePenguinTexture(color),
        transparent: true,
        side: THREE.DoubleSide
    });
    const penguin = new THREE.Mesh(geometry, material);
    
    // Add hat if specified
    if (hat !== 'none') {
        const hatGeometry = new THREE.PlaneGeometry(1, 1);
        const hatMaterial = new THREE.MeshBasicMaterial({
            map: generateHatTexture(hat),
            transparent: true,
            side: THREE.DoubleSide
        });
        const hatMesh = new THREE.Mesh(hatGeometry, hatMaterial);
        hatMesh.position.y = 0.5;
        penguin.add(hatMesh);
    }
    
    // Add clothes if specified
    if (clothes !== 'none') {
        const clothesGeometry = new THREE.PlaneGeometry(1, 1);
        const clothesMaterial = new THREE.MeshBasicMaterial({
            map: generateClothesTexture(clothes),
            transparent: true,
            side: THREE.DoubleSide
        });
        const clothesMesh = new THREE.Mesh(clothesGeometry, clothesMaterial);
        clothesMesh.position.y = -0.2;
        penguin.add(clothesMesh);
    }
    
    // Add accessories if specified
    if (accessories !== 'none') {
        const accessoriesGeometry = new THREE.PlaneGeometry(1, 1);
        const accessoriesMaterial = new THREE.MeshBasicMaterial({
            map: generateAccessoriesTexture(accessories),
            transparent: true,
            side: THREE.DoubleSide
        });
        const accessoriesMesh = new THREE.Mesh(accessoriesGeometry, accessoriesMaterial);
        penguin.add(accessoriesMesh);
    }
    
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