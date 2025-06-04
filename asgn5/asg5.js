// --- Global Variables ---
let scene, camera, renderer;
const cubes = []; // For decorative cubes
const goldBlocks = []; // For pick-up-able gold blocks
let goldPickedUpCount = 0; // Counter for picked up gold
let totalGoldBlocks = 0; // Total gold blocks to collect
let goldCounterElement; // HTML element for displaying the count
let portalInteriorMeshes = []; // To store the portal interior blocks
let portalActivated = false; // Flag to track if portal is active

let textureLoader;
let portalTexture; // << MOVED DECLARATION TO GLOBAL SCOPE
let gltfLoader;
let pigModel; 
let snowmanModel; 
let blazeModel1, blazeModel2; 
let modelBoundingBoxHelper; 
let pigMixer; 
let snowmanMixer; 
const clock = new THREE.Clock(); 

// --- FPS Controls Variables ---
let controlsEnabled = false;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3(); 
const direction = new THREE.Vector3(); 
let prevTime = performance.now();    

let pitchObject; 
let yawObject;   

const PI_2 = Math.PI / 2; 

// HTML Elements for instructions overlay
let blocker, instructions;

// --- Initialization Function ---
function init() {
    blocker = document.getElementById('blocker');
    instructions = document.getElementById('instructions');
    goldCounterElement = document.getElementById('gold-counter'); 

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x111111, 8, 70);

    // 2. Camera Setup for FPS Controls
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    pitchObject = new THREE.Object3D();
    pitchObject.add(camera);
    yawObject = new THREE.Object3D();
    yawObject.position.y = 1.7; 
    yawObject.add(pitchObject);
    scene.add(yawObject);

    // 3. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; 
    document.body.appendChild(renderer.domElement);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x505050, 0.9); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0x777777, 0.25); 
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    const skyColor = 0x404050;  
    const groundColor = 0x352F2A;  
    const hemisphereIntensity = 0.65; 
    const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, hemisphereIntensity);
    scene.add(hemisphereLight);

    // 5. Texture Loader
    textureLoader = new THREE.TextureLoader();
    const netherrackTexture = textureLoader.load('imgs/netherrack.png', (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        console.log("Netherrack texture loaded.");
    });
    const obsidianTexture = textureLoader.load(
        'imgs/obsidian.png', 
        (texture) => { 
            texture.encoding = THREE.sRGBEncoding;
            console.log("Obsidian texture loaded.");
        },
        undefined, 
        (err) => { 
            console.error("ERROR LOADING OBSIDIAN TEXTURE (imgs/obsidian.png):", err);
        }
    );
    const glowstoneTexture = textureLoader.load('imgs/glowstone.png', (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        console.log("Glowstone texture loaded.");
    });
    // portalTexture is now global, assigned here
    portalTexture = textureLoader.load('imgs/portal.png', (texture) => { 
        texture.encoding = THREE.sRGBEncoding;
        console.log("Portal texture loaded and available for use. Image data:", texture.image); 
    });
    const goldBlockTexture = textureLoader.load('imgs/gold_block.png', (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        console.log("Gold block texture loaded.");
    });


    // Load Skybox Texture (Cave)
    const skyboxTexture = textureLoader.load('imgs/cave.jpg', () => { 
        skyboxTexture.mapping = THREE.EquirectangularReflectionMapping;
        skyboxTexture.encoding = THREE.sRGBEncoding;
        scene.background = skyboxTexture;
        scene.environment = skyboxTexture; 
        console.log("Cave skybox texture loaded and applied.");
    }, undefined, (err) => {
        console.error("Error loading cave.jpg skybox texture:", err);
        scene.background = new THREE.Color(0x222222); 
    });


    // 6. GLTF Loader for 3D Models
    gltfLoader = new THREE.GLTFLoader();

    // Load Pig Model
    gltfLoader.load(
        'models/pig.glb',
        function (gltf) {
            pigModel = gltf.scene;
            const modelScale = 0.6;
            pigModel.scale.set(modelScale, modelScale, modelScale);
            const box = new THREE.Box3().setFromObject(pigModel);
            const center = box.getCenter(new THREE.Vector3());
            pigModel.position.sub(center);
            pigModel.position.y = -box.min.y;
            pigModel.position.z = -8;
            pigModel.position.x = 5;
            pigModel.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material) {
                        if (node.material.map) node.material.map.encoding = THREE.sRGBEncoding;
                        if (node.material.emissiveMap) node.material.emissiveMap.encoding = THREE.sRGBEncoding;
                    }
                }
            });
            scene.add(pigModel);
            if (gltf.animations && gltf.animations.length) {
                pigMixer = new THREE.AnimationMixer(pigModel);
                let animationToPlay = gltf.animations[0];
                const idleAnimation = THREE.AnimationClip.findByName(gltf.animations, 'Idle');
                if (idleAnimation) animationToPlay = idleAnimation;
                else {
                    const walkAnimation = THREE.AnimationClip.findByName(gltf.animations, 'Walk');
                    if (walkAnimation) animationToPlay = walkAnimation;
                }
                if(animationToPlay){
                    const action = pigMixer.clipAction(animationToPlay);
                    action.play();
                }
            }
        },
        undefined, 
        (error) => { console.error('Error loading pig.glb:', error); }
    );

    // Load Snowman Model
    gltfLoader.load(
        'models/snowman.glb',
        function (gltf) {
            snowmanModel = gltf.scene;
            const modelScale = 0.07; 
            snowmanModel.scale.set(modelScale, modelScale, modelScale);
            const box = new THREE.Box3().setFromObject(snowmanModel);
            const center = box.getCenter(new THREE.Vector3());
            snowmanModel.position.sub(center); 
            snowmanModel.position.y = -box.min.y;
            snowmanModel.position.z = -12;
            snowmanModel.position.x = -6;
            snowmanModel.rotation.y = Math.PI / 3;
            snowmanModel.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material) {
                        if (node.material.map) node.material.map.encoding = THREE.sRGBEncoding;
                        if (node.material.emissiveMap) node.material.emissiveMap.encoding = THREE.sRGBEncoding;
                    }
                }
            });
            scene.add(snowmanModel);
            if (gltf.animations && gltf.animations.length) {
                snowmanMixer = new THREE.AnimationMixer(snowmanModel);
                const animationToPlay = gltf.animations[0]; 
                if(animationToPlay){
                    const action = snowmanMixer.clipAction(animationToPlay);
                    action.play();
                }
            }
        },
        undefined, 
        (error) => { console.error('Error loading snowman.glb:', error); }
    );

    gltfLoader.load(
        'models/blaze.glb',
        function (gltf) {
            const blazeScale = 0.09; 
            blazeModel1 = gltf.scene.clone(); 
            blazeModel1.scale.set(blazeScale, blazeScale, blazeScale);
            blazeModel1.position.set(-8, 2.2, -17); 
            blazeModel1.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material && node.material.map) node.material.map.encoding = THREE.sRGBEncoding;
                }
            });
            scene.add(blazeModel1);
            blazeModel2 = gltf.scene.clone(); 
            blazeModel2.scale.set(blazeScale, blazeScale, blazeScale);
            blazeModel2.position.set(-18, 2.2, -15); 
            blazeModel2.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    if (node.material && node.material.map) node.material.map.encoding = THREE.sRGBEncoding;
                }
            });
            scene.add(blazeModel2);
        },
        undefined, 
        (error) => { console.error('Error loading blaze.glb:', error); }
    );


    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1); 
    
    const allFacesObsidianMaterial = new THREE.MeshStandardMaterial({
        map: obsidianTexture,
        color: 0xffffff, 
        roughness: 0.85, 
        metalness: 0.02 
    });
    
    const allFacesNetherrackMaterial = new THREE.MeshStandardMaterial({
        map: netherrackTexture,
        color: 0xffffff, 
        roughness: 0.9, 
        metalness: 0.02 
    });
    
    const allFacesGoldMaterial = new THREE.MeshStandardMaterial({
        map: goldBlockTexture,
        color: 0xffffff, 
        roughness: 0.6,  
        metalness: 0.5   
    });


    const cubePositions = [
        [-5, 0.5, 2], [0, 0.5, -6], [5, 0.5, 2],
        [-8, 0.5, -10], [0, 0.5, -15], [8, 0.5, -10],
        [-10, 0.5, -4], [10, 0.5, -4],
        [-3, 0.5, -13], [3, 0.5, -13],
        [0, 3.0, -9]
    ];
    cubePositions.forEach((pos, index) => {
        let currentMaterial;
        if (index % 2 === 0) { 
            currentMaterial = allFacesNetherrackMaterial;
        } else { 
            currentMaterial = allFacesObsidianMaterial;
        }
        const cube = new THREE.Mesh(cubeGeometry, currentMaterial);
        cube.position.set(pos[0], pos[1], pos[2]);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        cubes.push(cube); 
    });

    // gold blocks location
    const goldBlockPositions = [
        { x: 0, y: 0.5, z: -10 }, { x: 5, y: 0.5, z: -15 }, { x: -5, y: 0.5, z: -15 },
        { x: 10, y: 0.5, z: -5 }, { x: -10, y: 0.5, z: -5 }, { x: 0, y: 0.5, z: 5 },
        { x: 15, y: 0.5, z: 0 }, { x: -15, y: 0.5, z: 0 }, { x: 8, y: 0.5, z: 8 },
        { x: -8, y: 0.5, z: 8 }, { x: 12, y: 0.5, z: -12 }, { x: -12, y: 0.5, z: 12 }
    ];
    totalGoldBlocks = goldBlockPositions.length; 
    updateGoldCounterDisplay(); 

    goldBlockPositions.forEach(pos => {
        const goldBlock = new THREE.Mesh(cubeGeometry, allFacesGoldMaterial);
        goldBlock.position.set(pos.x, pos.y, pos.z);
        goldBlock.castShadow = true;
        goldBlock.receiveShadow = true;
        scene.add(goldBlock);
        goldBlocks.push(goldBlock); 
    });


    // netherrack ground
    const groundTileSize = 1;
    const groundGridSize = 50;
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: netherrackTexture,
        color: 0x656565,
        roughness: 0.99, 
        metalness: 0.0 
    });
    const groundBlockGeometry = new THREE.BoxGeometry(groundTileSize, groundTileSize, groundTileSize);

    for (let i = -groundGridSize / 2; i < groundGridSize / 2; i++) {
        for (let j = -groundGridSize / 2; j < groundGridSize / 2; j++) {
            const groundBlock = new THREE.Mesh(groundBlockGeometry, groundMaterial);
            groundBlock.position.set(
                i * groundTileSize + groundTileSize / 2,
                -groundTileSize / 2, 
                j * groundTileSize + groundTileSize / 2
            );
            groundBlock.receiveShadow = true;
            scene.add(groundBlock);
        }
    }

    // Glowstone Blocks
    const glowstoneMaterial = new THREE.MeshStandardMaterial({
        map: glowstoneTexture,
        emissive: 0xffffcc, 
        emissiveIntensity: 1.5, 
        emissiveMap: glowstoneTexture,
        roughness: 0.9, 
        metalness: 0.0
    });
    const glowstoneGeometry = new THREE.BoxGeometry(groundTileSize, groundTileSize, groundTileSize);
    
    const numberOfGlowstones = 10; 
    const usedPositions = new Set(); 

    for (let k = 0; k < numberOfGlowstones; k++) {
        const glowstoneBlock = new THREE.Mesh(glowstoneGeometry, glowstoneMaterial.clone()); 

        let randomGridX, randomGridZ, positionKey;
        do {
            randomGridX = Math.floor(Math.random() * groundGridSize) - groundGridSize / 2;
            randomGridZ = Math.floor(Math.random() * groundGridSize) - groundGridSize / 2;
            positionKey = `${randomGridX},${randomGridZ}`;
        } while (usedPositions.has(positionKey) && usedPositions.size < groundGridSize * groundGridSize); 
        
        usedPositions.add(positionKey);
        
        glowstoneBlock.position.set(
            randomGridX * groundTileSize + groundTileSize / 2,
            groundTileSize / 2, 
            randomGridZ * groundTileSize + groundTileSize / 2
        );
        glowstoneBlock.castShadow = false; 
        scene.add(glowstoneBlock);

        const glowstonePointLight = new THREE.PointLight(0xffddaa, 1.5, 22); 
        glowstonePointLight.position.copy(glowstoneBlock.position);
        glowstonePointLight.castShadow = false; 
        scene.add(glowstonePointLight);
    }

    const portalWidth = 4; 
    const portalHeight = 6; 
    const portalBlockSize = 1; 
    const portalFrameMaterial = allFacesObsidianMaterial; 

    const portalBaseX = -20; 
    const portalBaseZ = -18; 

    for (let y = 0; y < portalHeight; y++) {
        for (let x = 0; x < portalWidth; x++) {
            if (y === 0 || y === portalHeight - 1 || x === 0 || x === portalWidth - 1) {
                const obsidianBlock = new THREE.Mesh(cubeGeometry, portalFrameMaterial); 
                obsidianBlock.position.set(
                    portalBaseX + (x - (portalWidth - 1) / 2) * portalBlockSize,
                    y * portalBlockSize + portalBlockSize / 2, 
                    portalBaseZ
                );
                obsidianBlock.castShadow = true;
                obsidianBlock.receiveShadow = true;
                scene.add(obsidianBlock);
            }
        }
    }

    const initialPortalInteriorMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0, 
        side: THREE.DoubleSide
    });

    for (let iy = 1; iy < portalHeight - 1; iy++) { 
        for (let ix = 1; ix < portalWidth - 1; ix++) { 
            const portalPlaneBlock = new THREE.Mesh(cubeGeometry, initialPortalInteriorMaterial.clone()); 
            portalPlaneBlock.position.set(
                portalBaseX + (ix - (portalWidth - 1) / 2) * portalBlockSize,
                iy * portalBlockSize + portalBlockSize / 2,
                portalBaseZ
            );
            portalPlaneBlock.castShadow = false;
            portalPlaneBlock.receiveShadow = false; 
            scene.add(portalPlaneBlock);
            portalInteriorMeshes.push(portalPlaneBlock); 
        }
    }
    console.log("Nether portal created (interior initially empty). Portal interior meshes count:", portalInteriorMeshes.length);


    instructions.addEventListener('click', function () {
        renderer.domElement.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('pointerlockerror', onPointerLockError, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', onWindowResize, false);
}

function updateGoldCounterDisplay() {
    if (goldCounterElement) {
        goldCounterElement.textContent = `Gold: ${goldPickedUpCount}/${totalGoldBlocks}`;
    }
}

function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement) {
        controlsEnabled = true;
        blocker.classList.add('hidden');
        document.addEventListener('mousemove', onMouseMove, false);
    } else {
        controlsEnabled = false;
        blocker.classList.remove('hidden');
        document.removeEventListener('mousemove', onMouseMove, false);
        moveForward = false; moveBackward = false; moveLeft = false; moveRight = false;
    }
}

function onPointerLockError() {
    console.error('PointerLockError: Unable to lock pointer.');
    instructions.innerHTML = 'Pointer lock failed. <br> Try clicking again. <br> (Sometimes browser extensions can interfere)';
}

function onMouseMove(event) {
    if (!controlsEnabled) return;
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    yawObject.rotation.y -= movementX * 0.002;
    pitchObject.rotation.x -= movementY * 0.002;
    pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = true; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
        case 'ArrowDown': case 'KeyS': moveBackward = true; break;
        case 'ArrowRight': case 'KeyD': moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = false; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
        case 'ArrowDown': case 'KeyS': moveBackward = false; break;
        case 'ArrowRight': case 'KeyD': moveRight = false; break;
    }
}
// window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

//  animation loop
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controlsEnabled) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        const moveSpeed = 10.0;
        if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * 10.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * 10.0 * delta;
        
        const playerPosition = yawObject.position; 

        const pickupDistance = 1.5; 
        for (let i = goldBlocks.length - 1; i >= 0; i--) { 
            const goldBlock = goldBlocks[i];
            const distanceToBlock = playerPosition.distanceTo(goldBlock.position);
            if (distanceToBlock < pickupDistance) {
                scene.remove(goldBlock); 
                goldBlocks.splice(i, 1); 
                goldPickedUpCount++; 
                updateGoldCounterDisplay();
                console.log("Gold block picked up! Total:", goldPickedUpCount);
            }
        }

        yawObject.translateX(-velocity.x * delta);
        yawObject.translateZ(velocity.z * delta);
    }

    if (!portalActivated && goldPickedUpCount === totalGoldBlocks) {
        if (typeof portalTexture !== 'undefined' && portalTexture && portalTexture.image) { 
            portalActivated = true;
            console.log("All gold collected! Activating portal...");
            console.log("Portal Texture is loaded, image data exists.");
            console.log("Number of portal interior meshes to update:", portalInteriorMeshes.length);

            const activePortalFaceMaterial = new THREE.MeshBasicMaterial({ 
                map: portalTexture, 
                side: THREE.DoubleSide, 
                transparent: true,
            });
            const invisibleSideMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.0,
                side: THREE.DoubleSide
            });

            portalInteriorMeshes.forEach((mesh, meshIndex) => {
                console.log(`Updating material for portal interior mesh ${meshIndex + 1}/${portalInteriorMeshes.length}`);
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => {
                        if (mat.dispose) mat.dispose();
                    });
                } else if (mesh.material && mesh.material.dispose) {
                    mesh.material.dispose();
                }

                mesh.material = [
                    invisibleSideMaterial.clone(), // right (+X)
                    invisibleSideMaterial.clone(), // left (-X)
                    invisibleSideMaterial.clone(), // top (+Y)
                    invisibleSideMaterial.clone(), // bottom (-Y)
                    activePortalFaceMaterial.clone(), // front (+Z)
                    activePortalFaceMaterial.clone()  // back (-Z)
                ];
            });
            console.log("Portal materials updated for all interior meshes.");
        } else if (goldPickedUpCount === totalGoldBlocks) { 
            console.warn("Portal texture not yet fully loaded (portalTexture or portalTexture.image is null/undefined). Will try again next frame.");
        }
    }


    prevTime = time;

    cubes.forEach((cube, index) => {
        const speedFactor = 0.003 + (index % 5) * 0.0015;
        const rotationAxis = index % 3;
        if (rotationAxis === 0) { cube.rotation.x += speedFactor; cube.rotation.y += speedFactor * 0.7; }
        else if (rotationAxis === 1) { cube.rotation.y -= speedFactor; cube.rotation.z += speedFactor * 0.7; }
        else { cube.rotation.z -= speedFactor; cube.rotation.x -= speedFactor * 0.7; }
    });

    const goldSpinSpeed = 0.025;
    goldBlocks.forEach(block => {
        block.rotation.x += goldSpinSpeed * 0.7; 
        block.rotation.y += goldSpinSpeed;       
    });


    if (pigMixer) pigMixer.update(delta);
    if (snowmanMixer) snowmanMixer.update(delta);

    const blazeSpinSpeed = 0.02;
    if (blazeModel1) {
        blazeModel1.rotation.y += blazeSpinSpeed;
    }
    if (blazeModel2) {
        blazeModel2.rotation.y -= blazeSpinSpeed; 
    }

    renderer.render(scene, camera);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
animate();
