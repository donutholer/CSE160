// asg3.js

// ── Globals & Constants ──────────────────────────────────────────────────────
let canvas, gl;
let a_Position, a_UV;
let u_ModelMatrix, u_GlobalRotateMatrix;
let u_ViewMatrix, u_ProjectionMatrix;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;
let u_FragColor, u_texColorWeight, u_whichTexture;
let camera;
let g_worldCubes = [];
let g_vertexCount;
let map2D = [];

// fps / overlay
let fpsCounter;
let startOverlay;

const SIZE        = 32;
const MAX_HEIGHT  = 15;
const BORDER1     = 2;  // grass ring thickness
const BORDER2     = 4;  // dirt ring thickness
const BORDER3     = 6;  // stone ring thickness
const TOWER_SIZE  = 4;  // central tower size

const MOUSE_SENSITIVITY = 0.05;

// smoother motion
const keys = { w: false, a: false, s: false, d: false };


// for pointer‑lock dragging
let isDragging = false;

// ── shader sources ───────────────────────────────────────────────────────────
const VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix 
                * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;

const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  varying vec2 v_UV;
  uniform sampler2D u_Sampler0; // sky
  uniform sampler2D u_Sampler1; // dirt
  uniform sampler2D u_Sampler2; // grass
  uniform sampler2D u_Sampler3; // stone
  uniform float u_texColorWeight;
  uniform int u_whichTexture;
  void main() {
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;                       // flat color
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) {
      gl_FragColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 2) {
      gl_FragColor = texture2D(u_Sampler2, v_UV);
    } else if (u_whichTexture == 3) {
      gl_FragColor = texture2D(u_Sampler3, v_UV);
    } else {
      gl_FragColor = vec4(v_UV, 0.0, 1.0);               // debug UV
    }
  }`;

// ── map def ───────────────────────────────────────────────────────────


function generateTerrainMatrix() {
  const SIZE = 32;
  // Start with all grass (height = 1)
  const map = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));

  // clear a spawn area in the very center
  const spawnSize  = 6;
  const spawnStart = Math.floor(SIZE/2) - Math.floor(spawnSize/2);
  const spawnEnd   = spawnStart + spawnSize - 1;
  for (let i = spawnStart; i <= spawnEnd; i++) {
    for (let j = spawnStart; j <= spawnEnd; j++) {
      map[i][j] = 1;
    }
  }

  // structures mostly 1 x 1 skinny pillars
  const structureTypes = [
    { size: 1, height: 4, weight: 5 },  // common small pillars
    { size: 1, height: 8, weight: 2 },  // rare tall pillars
    { size: 2, height: 6, weight: 1 }   // very rare 2×2 medium towers
  ];
  const totalWeight = structureTypes.reduce((s,t) => s + t.weight, 0);

  // single big 4×4 tower near but not on the spawn
  const center = SIZE / 2;
  const towerOffset = 4; // distance from center
  const towerSize   = 4;
  const towerHeight = 12;
  const towerX = Math.floor(center + towerOffset);
  const towerY = Math.floor(center - towerOffset);
  for (let dx = 0; dx < towerSize; dx++) {
    for (let dy = 0; dy < towerSize; dy++) {
      map[towerX + dx][towerY + dy] = towerHeight;
    }
  }

  // randomly sprinkle skinny pillars, biased toward edges
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      // skip spawn and big tower area
      if (
        (i >= spawnStart && i <= spawnEnd && j >= spawnStart && j <= spawnEnd) ||
        (i >= towerX && i < towerX + towerSize &&
         j >= towerY && j < towerY + towerSize)
      ) {
        continue;
      }

      // distance from center (0 = center, ~1 = corner)
      const dx = (i - center) / center;
      const dy = (j - center) / center;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // prob increases toward edges
      const p = 0.1 + 0.4 * dist;  // between 10% (center) and ~50% (corners)
      if (Math.random() > p) continue;

      // choose a structure type by weight
      let r = Math.random() * totalWeight;
      let type = structureTypes.find(t => {
        r -= t.weight;
        return r <= 0;
      });

      // Place it if it fits and doesn't collide
      if (i + type.size <= SIZE && j + type.size <= SIZE) {
        let canPlace = true;
        for (let di = 0; di < type.size && canPlace; di++) {
          for (let dj = 0; dj < type.size; dj++) {
            if (map[i + di][j + dj] !== 1) {
              canPlace = false;
              break;
            }
          }
        }
        if (!canPlace) continue;

        for (let di = 0; di < type.size; di++) {
          for (let dj = 0; dj < type.size; dj++) {
            map[i + di][j + dj] = type.height;
          }
        }
      }
    }
  }

  return map;
}




// textures gl and init
function sendTextureToGLSL(image, texUnit, unitIndex, samplerUniform) {

  const texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(texUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
    gl.UNSIGNED_BYTE, image
  );

  gl.uniform1i(samplerUniform, unitIndex);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl     = canvas.getContext('webgl');
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return false;

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;
  a_Position           = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV                 = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler0           = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1           = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2           = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3           = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_texColorWeight     = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_whichTexture       = gl.getUniformLocation(gl.program, 'u_whichTexture');

  // Set up VBO for a unit cube
  const cube       = new Cube();
  g_vertexCount    = cube.vertices.length / 8;
  const vbo        = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 8, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, FSIZE * 8, FSIZE * 6);
  gl.enableVertexAttribArray(a_UV);

  return true;
}

function initTextures() {
  // Skybox  unit 0
  const skyImg = new Image();
  skyImg.onload = () => {
    console.log('skyImg loaded:', skyImg.width, '×', skyImg.height);
    sendTextureToGLSL(skyImg, gl.TEXTURE0, 0, u_Sampler0);
  };
  skyImg.src = './imgs/skybox.jpeg';

  // Dirt unit 1
  const dirtImg = new Image();
  dirtImg.onload = () => {
    console.log('dirtImg loaded:', dirtImg.width, '×', dirtImg.height);
    sendTextureToGLSL(dirtImg, gl.TEXTURE1, 1, u_Sampler1);
  };
  dirtImg.src = './imgs/dirt.jpg';

  // Grass unit 2
  const grassImg = new Image();
  grassImg.onload = () => {
    console.log('grassImg loaded:', grassImg.width, '×', grassImg.height);
    sendTextureToGLSL(grassImg, gl.TEXTURE2, 2, u_Sampler2);
  };
  grassImg.src = './imgs/grass.jpg';

  // Stone unit 3
  const stoneImg = new Image();
  stoneImg.onload = () => {
    console.log('✅ stoneImg loaded:', stoneImg.width, '×', stoneImg.height);
    sendTextureToGLSL(stoneImg, gl.TEXTURE3, 3, u_Sampler3);
  };
  stoneImg.src = './imgs/stone.jpg';

  return true;
}

// ── Scene Construction ───────────────────────────────────────────────────────
function buildMapFromArray(map2D) {
  const half = SIZE / 2;
  
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const height = map2D[row][col];
      
      // Skip if height is 0 (empty space)
      if (height <= 0) continue;
      
      // Create stack of cubes for this cell
      for (let y = 0; y < height; y++) {
        const cube = new Cube();
        const x = row - half + 0.5;
        const z = col - half + 0.5;
        
        cube.matrix.setTranslate(x, y, z);
        
        // Assign textures based on height
        if (y === 0) {
          cube.textureNum = 2; // Grass at ground level
        } else if (y === height-1) {
          if (height > 15) cube.textureNum = 3; 
          else cube.textureNum = 1; // Dirt on top of shorter structures
        } else {
          cube.textureNum = 3; // Stone for middle layers
        }
        
        cube.color = [1, 1, 1, 1];
        g_worldCubes.push(cube);
      }
    }
  }
}
// to have ground as multiple cubes
function createTiledGround() {
  const GROUND_SIZE = 100; // Same overall size as before
  const TILE_SIZE = 1;     // Each cube is 1 x 1 unit
  const TILES = GROUND_SIZE / TILE_SIZE;
  const Y_POS = -0.1;      // Same Y position as before

  for (let x = 0; x < TILES; x++) {
    for (let z = 0; z < TILES; z++) {
      const groundTile = new Cube();
      groundTile.matrix
        .setTranslate(
          x * TILE_SIZE - GROUND_SIZE/2, // Center the ground
          Y_POS,
          z * TILE_SIZE - GROUND_SIZE/2
        )
        .scale(TILE_SIZE, 0.1, TILE_SIZE)
        .translate(-0.5, 0, -0.5); // Cube centering
      
      groundTile.textureNum = 2; // Grass texture
      groundTile.color = [1, 1, 1, 1];
      g_worldCubes.push(groundTile);
    }
  }
}

function setupScene() {
  // clear old values
  g_worldCubes.length = 0;

  createTiledGround();

  // Terrain + Tower
  
  buildMapFromArray(map2D);

  // Skybox
  const skybox = new Cube();
  skybox.isSkybox = true;
  skybox.matrix
    .setTranslate(0, 0, 0)
    .scale(200, 200, 200)
    .translate(-0.5, -0.5, -0.5);
  skybox.textureNum = 0;
  skybox.color      = [1, 1, 1, 1];
  g_worldCubes.push(skybox);
}

// ── Input Handling ───────────────────────────────────────────────────────────
// function addControls(ev) {
//   switch (ev.keyCode) {
//     case 87: camera.moveForward();  break;
//     case 83: camera.moveBackwards(); break;
//     case 65: camera.moveLeft();     break;
//     case 68: camera.moveRight();    break;
//     case 81: camera.panLeft();      break;
//     case 69: camera.panRight();     break;
//   }
// }


function enablePointerLock() {
  canvas.requestPointerLock =
    canvas.requestPointerLock ||
    canvas.mozRequestPointerLock ||
    canvas.webkitRequestPointerLock;
  canvas.onclick = () => canvas.requestPointerLock();
}

function lockChange() {
  const locked = document.pointerLockElement === canvas;
  console.log('pointer locked?', locked);
}

function onPointerMove(e) {
  const yaw   = e.movementX * MOUSE_SENSITIVITY;
  const pitch = -e.movementY * MOUSE_SENSITIVITY;

  camera.yaw   = (camera.yaw   || 0) + yaw;
  camera.pitch = (camera.pitch || 0) + pitch;

  camera.updateView();
}

// check for constant movement
document.addEventListener('keydown', e => {
  if (e.code==='KeyW') keys.w = true;
  if (e.code==='KeyA') keys.a = true;
  if (e.code==='KeyS') keys.s = true;
  if (e.code==='KeyD') keys.d = true;
});
document.addEventListener('keyup', e => {
  if (e.code==='KeyW') keys.w = false;
  if (e.code==='KeyA') keys.a = false;
  if (e.code==='KeyS') keys.s = false;
  if (e.code==='KeyD') keys.d = false;
});

function applyMovement(dt) {
  // forward vector
  const forward = new Vector3(camera.at.elements);
  forward.sub(camera.eye).normalize().mul(camera.speed * dt);
  // side vector
  const side = Vector3.cross(camera.up, forward).normalize().mul(camera.speed * dt);

  if (keys.w) { camera.eye.add(forward); camera.at.add(forward); }
  if (keys.s) { camera.eye.sub(forward); camera.at.sub(forward); }
  if (keys.a) { camera.eye.add(side);    camera.at.add(side);    }
  if (keys.d) { camera.eye.sub(side);    camera.at.sub(side);    }

  camera.updateView();
}

// see what block we are looking at
function getTargetCell(minHeight = 2, maxDistance = 8.0) {
  // 1) Build inverse of Projection View matrix
  const invVP = new Matrix4()
    .set(camera.projectionMatrix)   // camera.projectionMatrix is a Matrix4
    .multiply(camera.viewMatrix)    // camera.viewMatrix is a Matrix4
    .invert();                       

  // 2) Define clip‐space points at screen center as Vector4s
  const nearPoint = new Vector4([0, 0, -1, 1]);
  const farPoint  = new Vector4([0, 0,  1, 1]);

  // 3) Unproject to world space
  const wpNearV4 = invVP.multiplyVector4(nearPoint);
  const wpFarV4  = invVP.multiplyVector4(farPoint);
  // Perspective divide
  const wpNear = wpNearV4.elements;
  const wpFar  = wpFarV4.elements;
  for (let k = 0; k < 3; k++) {
    wpNear[k] /= wpNear[3];
    wpFar[k]  /= wpFar[3];
  }

  // 4) Ray origin & direction
  const origin = new Vector3(wpNear.slice(0, 3));
  const dir    = new Vector3(wpFar.slice(0, 3))
                    .sub(origin)
                    .normalize();

  // 5) Ray‐march in small increments to catch narrow cubes
  const step = 0.02;
  for (let t = step; t < maxDistance; t += step) {
    const px = origin.elements[0] + dir.elements[0] * t;
    const py = origin.elements[1] + dir.elements[1] * t;
    const pz = origin.elements[2] + dir.elements[2] * t;

    // World X,Z map indices
    const i = Math.floor(px + SIZE / 2);
    const j = Math.floor(pz + SIZE / 2);
    if (i < 0 || i >= SIZE || j < 0 || j >= SIZE) continue;

    // Hit when stack height les than eq minHeight and ray is at or below its top
    if (map2D[i][j] >= minHeight && py <= map2D[i][j]) {
      return { row: i, col: j };
    }
  }

  return null;
}


function getCenterRay() {
  // Compute NDC coordinates of canvas center
  const nx = 0, ny = 0;           // normalized device coords center (0,0)
  const nearPointNDC = [nx, ny, -1, 1];
  const farPointNDC  = [nx, ny,  1, 1];

  // Build the inverse VP matrix
  const vpMat = new Matrix4()
    .set(projectionMatrix)        // your camera.projectionMatrix
    .multiply(camera.viewMatrix);
  vpMat.invert();                 // now VP^ -1

  // 3) Transform to world space
  const wpNear = vpMat.multiplyVector4(nearPointNDC);
  const wpFar  = vpMat.multiplyVector4(farPointNDC);
  // perspective divide
  for (let i=0; i<3; i++) {
    wpNear[i] /= wpNear[3];
    wpFar[i]  /= wpFar[3];
  }

  // 4) Ray origin & direction
  const origin    = new Vector3(wpNear.slice(0,3));
  const dirVec    = new Vector3(wpFar.slice(0,3));
  dirVec.sub(origin).normalize();
  return { origin, dir: dirVec };
}




// ── Render Loop ─────────────────────────────────────────────────────────────
let lastTime = performance.now();
function renderLoop(now = performance.now()) {

  const deltaTime = (now - lastTime) / 1000; // this is seconds
  lastTime = now;
  applyMovement(deltaTime);

  // compute fps
  const fps = Math.round(1 / deltaTime);
  fpsCounter.textContent = `${fps} FPS`;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix,       false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, new Matrix4().elements);

  for (const c of g_worldCubes) {
    if (c.isSkybox) {
      gl.depthMask(false);
      gl.uniform1i(u_whichTexture, c.textureNum);
    } else {
      gl.depthMask(true);
      gl.uniform1i(u_whichTexture, c.textureNum);
    }
    gl.uniform1f(u_texColorWeight, 1.0);
    gl.uniform4fv(u_FragColor, c.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, c.matrix.elements);
    c.render();
  }

  requestAnimationFrame(renderLoop);
}

// ── Main Entry Point ─────────────────────────────────────────────────────────
function main() {
  startOverlay = document.getElementById('startOverlay');

  startOverlay.addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      startOverlay.style.display = 'none';
    } else {
      // If they exit (e.g. Esc), show it again
      startOverlay.style.display = 'flex';
    }
  });

  setupWebGL();
  connectVariablesToGLSL();
  initTextures();


  enablePointerLock();
  canvas.addEventListener('mousedown', e => {
    if (document.pointerLockElement !== canvas) return;
  
    let target;
    if (e.button === 0)      target = getTargetCell(2);  // break
    else if (e.button === 2) target = getTargetCell(1);  // place
    else return;
  
    if (!target) return;
    const { row, col } = target;
  
    if (e.button === 0) {
      map2D[row][col] = Math.max(1, map2D[row][col] - 1);
    } else {
      map2D[row][col] = Math.min(MAX_HEIGHT, map2D[row][col] + 1);
    }
    setupScene();
  });
  
  
  
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('pointerlockchange', lockChange, false);
  document.addEventListener('mousemove', onPointerMove, false);

  camera = new Camera(canvas);
  // adjust spawn height
  camera.eye.elements[1] += 2.0;
  camera.updateView();

  fpsCounter = document.getElementById('fpsCounter');

  map2D = generateTerrainMatrix();

  setupScene();
  renderLoop();
}
