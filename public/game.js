// Game state
const gameState = {
    playerName: '',
    coins: 0,
    penguin: {
        model: null,
        position: { x: 0, y: 1, z: 0 }, // Altura fixa em 1
        rotation: { y: 0 },
        color: 0x000000,
        hat: 'none',
        clothes: 'none',
        accessories: 'none',
        targetPosition: null,
        isMoving: false
    },
    inventory: [],
    igloo: {
        furniture: [],
        layout: []
    },
    chatBubbles: new Map(),
    currentMinigame: null,
    otherPlayers: new Map(),
    socket: null,
    currentLocation: 'town',
    moveSpeed: 0.3, // Aumentei a velocidade
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2()
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
    scene.background = new THREE.Color(0x87CEEB);
    
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
    
    try {
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Adicionar cursor personalizado
        canvas.style.cursor = 'default';
        
        console.log('Renderer created successfully');
    } catch (error) {
        console.error('Error creating renderer:', error);
        return;
    }
    
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
    try {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2;
        controls.minDistance = 5;
        controls.maxDistance = 20;
        console.log('Controls created successfully');
    } catch (error) {
        console.error('Error creating controls:', error);
    }
    
    // Adicionar eventos de mouse
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onMouseMove);
    
    // Start animation loop
    animate();
    
    console.log('Scene initialized successfully');
}

function onMouseMove(event) {
    // Calcular posição do mouse em coordenadas normalizadas (-1 a +1)
    gameState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    gameState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Atualizar o raycaster
    gameState.raycaster.setFromCamera(gameState.mouse, camera);
    
    // Verificar interseção com o chão
    const intersects = gameState.raycaster.intersectObjects(scene.children, true);
    
    // Mudar cursor se estiver sobre o chão
    const canvas = document.getElementById('game-canvas');
    let isOverGround = false;
    
    for (let intersect of intersects) {
        if (intersect.object.userData && intersect.object.userData.isGround) {
            isOverGround = true;
            break;
        }
    }
    
    if (isOverGround) {
        canvas.style.cursor = 'pointer';
        console.log('Mouse over ground');
    } else {
        canvas.style.cursor = 'default';
    }
}

function onCanvasClick(event) {
    console.log('Canvas clicked!');
    
    // Calcular posição do mouse em coordenadas normalizadas (-1 a +1)
    gameState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    gameState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    console.log('Mouse position:', gameState.mouse);
    
    // Atualizar o raycaster
    gameState.raycaster.setFromCamera(gameState.mouse, camera);
    
    // Verificar interseção com o chão
    const intersects = gameState.raycaster.intersectObjects(scene.children, true);
    console.log('Intersects:', intersects);
    
    for (let intersect of intersects) {
        if (intersect.object.userData && intersect.object.userData.isGround) {
            console.log('Ground clicked at:', intersect.point);
            
            // Criar indicador visual do clique
            createClickIndicator(intersect.point);
            
            // Definir posição alvo
            gameState.penguin.targetPosition = new THREE.Vector3(
                intersect.point.x,
                1, // Altura fixa do pinguim
                intersect.point.z
            );
            gameState.penguin.isMoving = true;
            console.log('Penguin will move to:', gameState.penguin.targetPosition);
            break;
        }
    }
}

function createClickIndicator(position) {
    // Criar um círculo que desaparece gradualmente
    const geometry = new THREE.CircleGeometry(0.5, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(geometry, material);
    circle.rotation.x = -Math.PI / 2;
    circle.position.copy(position);
    circle.position.y = 0.1; // Ligeiramente acima do chão
    scene.add(circle);
    
    // Animar o círculo
    const duration = 1000; // 1 segundo
    const startTime = Date.now();
    
    function animateCircle() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
            circle.scale.set(1 + progress, 1 + progress, 1);
            circle.material.opacity = 0.5 * (1 - progress);
            requestAnimationFrame(animateCircle);
        } else {
            scene.remove(circle);
        }
    }
    
    animateCircle();
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update penguin position and animation
    if (gameState.penguin.model && gameState.penguin.isMoving && gameState.penguin.targetPosition) {
        const target = gameState.penguin.targetPosition;
        const current = gameState.penguin.model.position;
        
        // Calcular direção
        const direction = new THREE.Vector3(
            target.x - current.x,
            0,
            target.z - current.z
        ).normalize();
        
        // Mover pinguim
        const moveDistance = gameState.moveSpeed * 60 * delta;
        current.x += direction.x * moveDistance;
        current.z += direction.z * moveDistance;
        
        // Rotacionar pinguim na direção do movimento
        gameState.penguin.model.rotation.y = Math.atan2(direction.x, direction.z);
        
        // Verificar se chegou ao destino
        const distance = new THREE.Vector2(target.x - current.x, target.z - current.z).length();
        console.log('Distance to target:', distance);
        
        if (distance < 0.1) {
            console.log('Reached destination!');
            gameState.penguin.isMoving = false;
            gameState.penguin.targetPosition = null;
        }
        
        // Limitar movimento dentro dos limites do chão
        const limit = 45;
        current.x = Math.max(-limit, Math.min(limit, current.x));
        current.z = Math.max(-limit, Math.min(limit, current.z));
        
        // Send position update to server
        if (gameState.socket && gameState.socket.readyState === WebSocket.OPEN) {
            gameState.socket.send(JSON.stringify({
                type: 'update_position',
                position: current,
                rotation: { y: gameState.penguin.model.rotation.y }
            }));
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

function createGround() {
    console.log('Creating ground...');
    
    // Criar grupo para o chão
    const groundGroup = new THREE.Group();
    groundGroup.name = 'groundGroup';
    
    // Criar o chão principal
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8BC34A,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData = { isGround: true };
    ground.name = 'ground';
    groundGroup.add(ground);
    
    // Adicionar grid para melhor visualização
    const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x000000);
    gridHelper.position.y = 0.01;
    gridHelper.userData = { isGround: true };
    groundGroup.add(gridHelper);
    
    // Adicionar borda para melhor visualização
    const borderGeometry = new THREE.BoxGeometry(100, 0.1, 100);
    const borderMaterial = new THREE.MeshStandardMaterial({
        color: 0x4CAF50,
        roughness: 0.8,
        metalness: 0.2
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = -0.05;
    border.userData = { isGround: true };
    groundGroup.add(border);
    
    scene.add(groundGroup);
    console.log('Ground created and added to scene');
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
    
    // Posicionar o pinguim acima do chão
    penguin.position.set(0, 1, 0);
    
    gameState.penguin.model = penguin;
    scene.add(penguin);
    
    console.log('Penguin model loaded successfully');
}

function startGame() {
    const name = playerNameInput.value.trim();
    if (name) {
        console.log('Starting game with name:', name);
        gameState.playerName = name;
        nameDisplay.textContent = name;
        
        // Hide menu and show game screen
        menuScreen.classList.add('hidden');
        gameScreen.style.display = 'block';
        
        // Initialize scene
        initScene();
        
        // Create map
        createMap();
        
        // Initialize multiplayer
        initMultiplayer();
        
        console.log('Game started successfully');
    } else {
        alert('Por favor, digite seu nome!');
    }
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        console.log('Sending message:', message);
        
        // Adicionar mensagem ao chat local
        const chatMessage = document.createElement('div');
        chatMessage.textContent = `${gameState.playerName}: ${message}`;
        chatMessages.appendChild(chatMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Criar bolha de chat
        createChatBubble(message);
        
        // Enviar mensagem para o servidor
        if (gameState.socket && gameState.socket.readyState === WebSocket.OPEN) {
            gameState.socket.send(JSON.stringify({
                type: 'chat',
                message: message,
                playerName: gameState.playerName
            }));
        }
        
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
        createdAt: Date.now(),
        message: message
    });
    
    // Posicionar a bolha acima do pinguim
    if (gameState.penguin.model) {
        const screenPos = gameState.penguin.model.position.clone();
        screenPos.project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y - 50}px`;
    }
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
    console.log('Saving customization...');
    
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
            if (node.isMesh) {
                if (node.name === 'body' || node.name === 'head' || node.name === 'leftWing' || node.name === 'rightWing') {
                    node.material.color.setHex(gameState.penguin.color);
                }
            }
        });
        
        // Adicionar acessórios
        addAccessories(hat, clothes, accessories);
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
    console.log('Customization saved successfully');
}

function addAccessories(hat, clothes, accessories) {
    // Remover acessórios existentes
    gameState.penguin.model.children.forEach(child => {
        if (child.userData && child.userData.isAccessory) {
            gameState.penguin.model.remove(child);
        }
    });
    
    // Adicionar chapéu
    if (hat !== 'none') {
        const hatGeometry = new THREE.ConeGeometry(0.5, 1, 32);
        const hatMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        const hatMesh = new THREE.Mesh(hatGeometry, hatMaterial);
        hatMesh.position.y = 1.8;
        hatMesh.userData = { isAccessory: true };
        gameState.penguin.model.add(hatMesh);
    }
    
    // Adicionar roupas
    if (clothes !== 'none') {
        const clothesGeometry = new THREE.BoxGeometry(1.2, 1, 0.8);
        const clothesMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
        const clothesMesh = new THREE.Mesh(clothesGeometry, clothesMaterial);
        clothesMesh.position.y = 0;
        clothesMesh.userData = { isAccessory: true };
        gameState.penguin.model.add(clothesMesh);
    }
    
    // Adicionar acessórios
    if (accessories !== 'none') {
        const accessoryGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        const accessoryMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
        const accessoryMesh = new THREE.Mesh(accessoryGeometry, accessoryMaterial);
        accessoryMesh.position.set(0, 1.2, 0.5);
        accessoryMesh.userData = { isAccessory: true };
        gameState.penguin.model.add(accessoryMesh);
    }
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
    try {
        // Create a temporary link element
        const link = document.createElement('a');
        link.download = 'club-penguin-screenshot.png';
        
        // Get the canvas data URL
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        link.href = canvas.toDataURL('image/png');
        
        // Trigger the download
        link.click();
    } catch (error) {
        console.error('Error taking screenshot:', error);
    }
}

// Add screenshot keyboard shortcut (P key)
document.addEventListener('keydown', (event) => {
    if (event && event.key && typeof event.key === 'string' && event.key.toLowerCase() === 'p') {
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
    // Criar igloo
    const iglooGeometry = new THREE.SphereGeometry(15, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const iglooMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.7,
        metalness: 0.1
    });
    const igloo = new THREE.Mesh(iglooGeometry, iglooMaterial);
    igloo.position.y = 7.5;
    igloo.userData = { isDecoration: true };
    iglooScene.add(igloo);
    
    // Criar móveis
    const furniture = [
        { type: 'bed', position: [-5, 0, -5] },
        { type: 'table', position: [0, 0, 0] },
        { type: 'chair', position: [0, 0, 2] },
        { type: 'bookshelf', position: [5, 0, -5] }
    ];
    
    furniture.forEach(item => {
        const mesh = createFurniture(item.type);
        mesh.position.set(...item.position);
        mesh.userData = { isDecoration: true };
        iglooScene.add(mesh);
    });
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
    try {
        // Determine the correct WebSocket protocol
        const isSecure = window.location.protocol === 'https:';
        const wsProtocol = isSecure ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        
        console.log('Attempting to connect to WebSocket server:', wsUrl);
        
        // Check if WebSocket is supported
        if (!window.WebSocket) {
            console.error('WebSocket is not supported in this browser');
            alert('Seu navegador não suporta WebSocket. O modo multiplayer não estará disponível.');
            return;
        }
        
        // Create WebSocket connection with timeout
        const wsTimeout = setTimeout(() => {
            console.error('WebSocket connection timeout');
            alert('Tempo limite de conexão excedido. O modo multiplayer pode não estar disponível.');
        }, 5000);
        
        gameState.socket = new WebSocket(wsUrl);
        
        // Connection opened
        gameState.socket.onopen = () => {
            clearTimeout(wsTimeout);
            console.log('Successfully connected to server');
            
            // Send initial player info
            if (gameState.penguin && gameState.penguin.model) {
                const initData = {
                    type: 'init',
                    playerName: gameState.playerName,
                    position: gameState.penguin.model.position,
                    rotation: gameState.penguin.model.rotation,
                    color: gameState.penguin.color,
                    hat: gameState.penguin.hat,
                    clothes: gameState.penguin.clothes,
                    accessories: gameState.penguin.accessories
                };
                
                try {
                    gameState.socket.send(JSON.stringify(initData));
                } catch (error) {
                    console.error('Error sending init data:', error);
                }
            } else {
                console.error('Penguin model not initialized');
            }
        };
        
        // Connection error
        gameState.socket.onerror = (error) => {
            clearTimeout(wsTimeout);
            console.error('WebSocket error:', error);
            
            // Show user-friendly error message
            if (isSecure) {
                alert('Não foi possível conectar ao servidor de forma segura. O modo multiplayer pode não estar disponível.');
            } else {
                alert('Não foi possível conectar ao servidor. O modo multiplayer pode não estar disponível.');
            }
        };
        
        // Connection closed
        gameState.socket.onclose = (event) => {
            clearTimeout(wsTimeout);
            console.log('WebSocket connection closed:', event.code, event.reason);
            
            // Only attempt to reconnect if the connection was closed normally or due to timeout
            if (event.code === 1000 || event.code === 1006) {
                console.log('Attempting to reconnect in 5 seconds...');
                setTimeout(() => {
                    console.log('Reconnecting...');
                    initMultiplayer();
                }, 5000);
            }
        };
        
        // Message received
        gameState.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);
                
                if (!data || !data.type) {
                    console.error('Invalid message format:', data);
                    return;
                }
                
                switch(data.type) {
                    case 'init':
                        if (data.players && Array.isArray(data.players)) {
                            data.players.forEach(player => {
                                if (player.id !== data.id) {
                                    createOtherPlayer(player);
                                }
                            });
                        }
                        break;
                        
                    case 'player_joined':
                        if (data.player) {
                            createOtherPlayer(data.player);
                        }
                        break;
                        
                    case 'player_left':
                        if (data.id) {
                            removeOtherPlayer(data.id);
                        }
                        break;
                        
                    case 'player_moved':
                        if (data.id && data.position && data.rotation) {
                            updateOtherPlayerPosition(data.id, data.position, data.rotation);
                        }
                        break;
                        
                    case 'chat':
                        if (data.message && data.id) {
                            createChatBubble(data.message, data.id);
                        }
                        break;
                        
                    case 'player_customized':
                        if (data.id && data.customization) {
                            updateOtherPlayerCustomization(data.id, data.customization);
                        }
                        break;
                        
                    default:
                        console.warn('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };
    } catch (error) {
        console.error('Error initializing multiplayer:', error);
        alert('Erro ao inicializar o modo multiplayer. Algumas funcionalidades podem não estar disponíveis.');
    }
}

function createOtherPlayer(player) {
    console.log('Creating other player:', player);
    
    // Criar um pinguim simples usando geometrias básicas
    const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: player.color || 0x000000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    const bellyGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
    belly.position.z = 0.3;
    
    const headGeometry = new THREE.SphereGeometry(0.7, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ color: player.color || 0x000000 });
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
    const wingMaterial = new THREE.MeshStandardMaterial({ color: player.color || 0x000000 });
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
    
    // Posicionar o pinguim
    penguin.position.set(
        player.position.x,
        player.position.y,
        player.position.z
    );
    penguin.rotation.y = player.rotation.y;
    
    // Adicionar nome do jogador
    const nameLabel = document.createElement('div');
    nameLabel.className = 'player-name';
    nameLabel.textContent = player.name;
    nameLabel.style.position = 'absolute';
    nameLabel.style.color = 'white';
    nameLabel.style.backgroundColor = 'rgba(0,0,0,0.5)';
    nameLabel.style.padding = '2px 5px';
    nameLabel.style.borderRadius = '3px';
    nameLabel.style.fontSize = '12px';
    document.body.appendChild(nameLabel);
    
    penguin.userData = {
        id: player.id,
        name: player.name,
        nameLabel: nameLabel
    };
    
    scene.add(penguin);
    gameState.otherPlayers.set(player.id, penguin);
    
    console.log('Other player created:', penguin);
}

function updateOtherPlayerPosition(playerId, position, rotation) {
    const player = gameState.otherPlayers.get(playerId);
    if (player) {
        console.log('Updating player position:', playerId, position);
        player.position.set(position.x, position.y, position.z);
        player.rotation.y = rotation.y;
        
        // Atualizar posição do nome
        if (player.userData.nameLabel) {
            const screenPos = player.position.clone();
            screenPos.project(camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            player.userData.nameLabel.style.left = `${x}px`;
            player.userData.nameLabel.style.top = `${y - 50}px`;
        }
    }
}

function removeOtherPlayer(playerId) {
    const player = gameState.otherPlayers.get(playerId);
    if (player) {
        console.log('Removing player:', playerId);
        scene.remove(player);
        if (player.userData.nameLabel) {
            player.userData.nameLabel.remove();
        }
        gameState.otherPlayers.delete(playerId);
    }
}

function updateOtherPlayerCustomization(playerId, customization) {
    const player = gameState.otherPlayers.get(playerId);
    if (player) {
        player.traverse((node) => {
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

// Adicionar função para criar o mapa
function createMap() {
    const mapContainer = document.createElement('div');
    mapContainer.id = 'map-container';
    mapContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        padding: 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
    `;
    
    const locations = [
        { id: 'town', name: 'Town Center' },
        { id: 'igloo', name: 'My Igloo' },
        { id: 'sled', name: 'Sled Race' },
        { id: 'fishing', name: 'Fishing' },
        { id: 'dance', name: 'Dance Club' }
    ];
    
    locations.forEach(location => {
        const button = document.createElement('button');
        button.textContent = location.name;
        button.onclick = () => changeLocation(location.id);
        mapContainer.appendChild(button);
    });
    
    document.body.appendChild(mapContainer);
}

function changeLocation(locationId) {
    console.log('Changing location to:', locationId);
    gameState.currentLocation = locationId;
    
    // Enviar atualização para o servidor
    if (gameState.socket && gameState.socket.readyState === WebSocket.OPEN) {
        gameState.socket.send(JSON.stringify({
            type: 'change_location',
            location: locationId
        }));
    }
    
    // Atualizar a cena baseado na localização
    switch(locationId) {
        case 'igloo':
            // Remover cena atual
            while(scene.children.length > 0) { 
                scene.remove(scene.children[0]); 
            }
            
            // Criar nova cena do iglu
            createIglooScene();
            break;
            
        case 'town':
            initScene();
            break;
            
        case 'sled':
            initScene();
            createDecorations('sled');
            break;
            
        case 'fishing':
            initScene();
            createDecorations('fishing');
            break;
            
        case 'dance':
            initScene();
            createDecorations('dance');
            break;
    }
    
    // Criar decorações específicas para o local
    createDecorations(locationId);
}

function createIglooScene() {
    // Criar câmera específica para o iglu
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Criar luzes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Criar chão do iglu
    const floorGeometry = new THREE.CircleGeometry(15, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.7,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = { isGround: true };
    scene.add(floor);
    
    // Criar paredes do iglu
    const wallGeometry = new THREE.SphereGeometry(15, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.BackSide
    });
    const walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.position.y = 7.5;
    scene.add(walls);
    
    // Criar decorações do iglu
    createIglooDecorations();
    
    // Posicionar o pinguim dentro do iglu
    if (gameState.penguin.model) {
        gameState.penguin.model.position.set(0, 1, 0);
    }
}

function createIglooDecorations() {
    // Criar igloo
    const iglooGeometry = new THREE.SphereGeometry(15, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const iglooMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.7,
        metalness: 0.1
    });
    const igloo = new THREE.Mesh(iglooGeometry, iglooMaterial);
    igloo.position.y = 7.5;
    igloo.userData = { isDecoration: true };
    scene.add(igloo);
    
    // Criar móveis
    const furniture = [
        { type: 'bed', position: [-5, 0, -5] },
        { type: 'table', position: [0, 0, 0] },
        { type: 'chair', position: [0, 0, 2] },
        { type: 'bookshelf', position: [5, 0, -5] }
    ];
    
    furniture.forEach(item => {
        const mesh = createFurniture(item.type);
        mesh.position.set(...item.position);
        mesh.userData = { isDecoration: true };
        scene.add(mesh);
    });
}

function createFurniture(type) {
    const furniture = new THREE.Group();
    
    switch(type) {
        case 'bed':
            const bedGeometry = new THREE.BoxGeometry(3, 0.5, 2);
            const bedMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1 });
            const bed = new THREE.Mesh(bedGeometry, bedMaterial);
            bed.position.y = 0.25;
            furniture.add(bed);
            break;
            
        case 'table':
            const tableGeometry = new THREE.BoxGeometry(2, 0.8, 2);
            const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const table = new THREE.Mesh(tableGeometry, tableMaterial);
            table.position.y = 0.4;
            furniture.add(table);
            break;
            
        case 'chair':
            const chairGeometry = new THREE.BoxGeometry(1, 1, 1);
            const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            chair.position.y = 0.5;
            furniture.add(chair);
            break;
            
        case 'bookshelf':
            const shelfGeometry = new THREE.BoxGeometry(2, 3, 0.5);
            const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.position.y = 1.5;
            furniture.add(shelf);
            break;
    }
    
    return furniture;
}

function createDecorations(location) {
    // Remover decorações existentes
    scene.children.forEach(child => {
        if (child.userData && child.userData.isDecoration) {
            scene.remove(child);
        }
    });

    switch(location) {
        case 'town':
            createTownDecorations();
            break;
        case 'igloo':
            createIglooDecorations();
            break;
        case 'sled':
            createSledDecorations();
            break;
        case 'fishing':
            createFishingDecorations();
            break;
        case 'dance':
            createDanceDecorations();
            break;
    }
}

function createTownDecorations() {
    // Criar árvores
    for (let i = 0; i < 10; i++) {
        const tree = createTree();
        tree.position.set(
            Math.random() * 80 - 40,
            0,
            Math.random() * 80 - 40
        );
        tree.userData = { isDecoration: true };
        scene.add(tree);
    }

    // Criar bancos
    for (let i = 0; i < 5; i++) {
        const bench = createBench();
        bench.position.set(
            Math.random() * 60 - 30,
            0,
            Math.random() * 60 - 30
        );
        bench.rotation.y = Math.random() * Math.PI * 2;
        bench.userData = { isDecoration: true };
        scene.add(bench);
    }

    // Criar postes de luz
    for (let i = 0; i < 8; i++) {
        const lamp = createLampPost();
        lamp.position.set(
            Math.random() * 70 - 35,
            0,
            Math.random() * 70 - 35
        );
        lamp.userData = { isDecoration: true };
        scene.add(lamp);
    }
}

function createTree() {
    const tree = new THREE.Group();
    
    // Tronco
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    tree.add(trunk);
    
    // Copa
    const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 4;
    leaves.castShadow = true;
    tree.add(leaves);
    
    return tree;
}

function createBench() {
    const bench = new THREE.Group();
    
    // Assento
    const seatGeometry = new THREE.BoxGeometry(3, 0.3, 1);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const seat = new THREE.Mesh(seatGeometry, seatMaterial);
    seat.position.y = 0.5;
    seat.castShadow = true;
    bench.add(seat);
    
    // Pernas
    const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-1.3, 0.25, 0);
    leftLeg.castShadow = true;
    bench.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(1.3, 0.25, 0);
    rightLeg.castShadow = true;
    bench.add(rightLeg);
    
    return bench;
}

function createLampPost() {
    const lamp = new THREE.Group();
    
    // Poste
    const postGeometry = new THREE.CylinderGeometry(0.2, 0.2, 5, 8);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 2.5;
    post.castShadow = true;
    lamp.add(post);
    
    // Lâmpada
    const bulbGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bulbMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFF00,
        emissive: 0xFFFF00,
        emissiveIntensity: 0.5
    });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.y = 5;
    lamp.add(bulb);
    
    // Adicionar luz
    const light = new THREE.PointLight(0xFFFF00, 1, 10);
    light.position.y = 5;
    lamp.add(light);
    
    return lamp;
}

function createSledDecorations() {
    // Criar pista de trenó
    const trackGeometry = new THREE.BoxGeometry(20, 0.5, 100);
    const trackMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.3,
        metalness: 0.8
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.position.set(0, -0.25, 0);
    track.rotation.x = -Math.PI / 12;
    track.userData = { isDecoration: true };
    scene.add(track);
    
    // Adicionar árvores de neve
    for (let i = 0; i < 20; i++) {
        const tree = createSnowTree();
        tree.position.set(
            Math.random() * 40 - 20,
            0,
            Math.random() * 80 - 40
        );
        tree.userData = { isDecoration: true };
        scene.add(tree);
    }
}

function createSnowTree() {
    const tree = new THREE.Group();
    
    // Tronco
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    tree.add(trunk);
    
    // Copa com neve
    const leavesGeometry = new THREE.ConeGeometry(1.5, 3, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 3;
    tree.add(leaves);
    
    // Neve na copa
    const snowGeometry = new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const snow = new THREE.Mesh(snowGeometry, snowMaterial);
    snow.position.y = 3.5;
    tree.add(snow);
    
    return tree;
}

function createFishingDecorations() {
    // Criar lago
    const lakeGeometry = new THREE.CircleGeometry(20, 32);
    const lakeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1E90FF,
        roughness: 0.2,
        metalness: 0.8
    });
    const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
    lake.rotation.x = -Math.PI / 2;
    lake.userData = { isDecoration: true };
    scene.add(lake);
    
    // Adicionar doca
    const dockGeometry = new THREE.BoxGeometry(5, 0.5, 10);
    const dockMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const dock = new THREE.Mesh(dockGeometry, dockMaterial);
    dock.position.set(0, 0, -10);
    dock.userData = { isDecoration: true };
    scene.add(dock);
    
    // Adicionar árvores
    for (let i = 0; i < 15; i++) {
        const tree = createTree();
        tree.position.set(
            Math.random() * 40 - 20,
            0,
            Math.random() * 40 - 20
        );
        tree.userData = { isDecoration: true };
        scene.add(tree);
    }
}

function createDanceDecorations() {
    // Criar pista de dança
    const danceFloorGeometry = new THREE.BoxGeometry(20, 0.2, 20);
    const danceFloorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        roughness: 0.3,
        metalness: 0.8
    });
    const danceFloor = new THREE.Mesh(danceFloorGeometry, danceFloorMaterial);
    danceFloor.userData = { isDecoration: true };
    scene.add(danceFloor);
    
    // Adicionar luzes
    for (let i = 0; i < 8; i++) {
        const light = new THREE.PointLight(0xFF0000, 1, 10);
        light.position.set(
            Math.random() * 16 - 8,
            5,
            Math.random() * 16 - 8
        );
        light.userData = { isDecoration: true };
        scene.add(light);
    }
    
    // Adicionar bar
    const barGeometry = new THREE.BoxGeometry(10, 1, 1);
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    bar.position.set(0, 0.5, -10);
    bar.userData = { isDecoration: true };
    scene.add(bar);
} 