// asg3.js

// ── Globals & Constants ──────────────────────────────────────────────────────
let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_GlobalRotateMatrix;
let u_ViewMatrix, u_ProjectionMatrix;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;
let u_FragColor, u_texColorWeight, u_whichTexture;
let u_showNormals;
let showNormals = false;
let camera;
let g_worldCubes = [];
let g_vertexCount;
let g_sphere;
let g_lightPos = [0,1,0];
let g_lightBaseX = 0.0;
let lightCube;


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
// ——— Vertex Shader ———
const VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  // new: world‐space pos
  varying vec3 v_Position;
  varying vec2 v_UV;
  varying vec3 v_Normal;

  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;
    v_Position = worldPos.xyz;
    v_UV       = a_UV;
    v_Normal   = normalize((u_ModelMatrix * vec4(a_Normal,0.0)).xyz);

    gl_Position = u_ProjectionMatrix
                * u_ViewMatrix
                * u_GlobalRotateMatrix
                * worldPos;
  }`;



const FSHADER_SOURCE = `
  precision mediump float;
  varying vec3 v_Position;
  varying vec2 v_UV;
  varying vec3 v_Normal;

  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;
  uniform int u_whichTexture;
  uniform int u_showNormals;

  // our light
  uniform vec3 u_LightPosition;
  uniform vec3 u_LightColor;

  void main() {
    // 1) normal‐viz pastel
    if (u_showNormals == 1) {
      vec3 n = normalize(v_Normal);
      gl_FragColor = vec4(n*0.5+0.5, 1.0);
      return;
    }

    // 2) lighting branch for cube==“light” or for any object you tag as -1
    if (u_whichTexture == -1) {
      // Lambert diffuse + small ambient
      vec3 base = u_FragColor.rgb;
      vec3 L = normalize(u_LightPosition - v_Position);
      float diff = max(dot(normalize(v_Normal), L), 0.0);
      vec3 ambient = 0.2 * u_LightColor;
      vec3 diffuse = diff * u_LightColor;
      vec3 color = ambient + diffuse;
      gl_FragColor = vec4(color * base, u_FragColor.a);
      return;
    }

    // 3) room flat shade...
    if (u_whichTexture < 0) {
      vec3 n = normalize(v_Normal);
      vec3 an = abs(n);
      float gray = an.x*0.6 + an.y*0.9 + an.z*0.3;
      gl_FragColor = vec4(vec3(gray), 1.0);
    }
    // 4) textures...
    else if (u_whichTexture==0) gl_FragColor = texture2D(u_Sampler0, v_UV);
    else if (u_whichTexture==1) gl_FragColor = texture2D(u_Sampler1, v_UV);
    else if (u_whichTexture==2) gl_FragColor = texture2D(u_Sampler2, v_UV);
    else if (u_whichTexture==3) gl_FragColor = texture2D(u_Sampler3, v_UV);
    else                         gl_FragColor = vec4(v_UV,0.0,1.0);
}`;



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

  // grab & enable our attributes/uniforms
  a_Position   = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV         = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal     = gl.getAttribLocation(gl.program, 'a_Normal');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler0           = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1           = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2           = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3           = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_whichTexture       = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_showNormals        = gl.getUniformLocation(gl.program, 'u_showNormals');
  u_LightPosition = gl.getUniformLocation(gl.program,'u_LightPosition');
  u_LightColor    = gl.getUniformLocation(gl.program,'u_LightColor');


  // error checks (optional)
  if (a_Position < 0)   console.error('a_Position not found');
  if (a_UV < 0)         console.error('a_UV not found');
  if (a_Normal < 0)     console.error('a_Normal not found');
  if (!u_showNormals)   console.error('u_showNormals not found');

  // enable the attributes; actual buffers are bound inside drawTriangle3DUVNormal()
  gl.enableVertexAttribArray(a_Position);
  gl.enableVertexAttribArray(a_UV);
  gl.enableVertexAttribArray(a_Normal);

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

// to have ground as multiple cubes
function createTiledGround() {
  const TILES = 32;    // instead of 100
  const TILE_SIZE = 1;
  const Y_POS = -0.1;

  for (let x = 0; x < TILES; x++) {
    for (let z = 0; z < TILES; z++) {
      const groundTile = new Cube();
      groundTile.matrix
        .setTranslate(x - TILES/2 + 0.5, Y_POS, z - TILES/2 + 0.5)
        .scale(TILE_SIZE, 0.1, TILE_SIZE);

      groundTile.textureNum = 2;
      groundTile.color      = [1,1,1,1];
      g_worldCubes.push(groundTile);
    }
  }
}


function setupScene() {
  // clear out everything
  g_worldCubes.length = 0;

  // 1) only the tiled floor
  createTiledGround();

  // 2) add one big cube around us as the “room”
  const ROOM_SIZE = SIZE / 1.5;            // reuse your GRID size (32)
  const HALF = ROOM_SIZE / 2;

  const room = new Cube();
  const EPS = 0.01;
  room
    .matrix
      // center it at (0, ROOM_SIZE/2, 0), so floor is at y≈0
      .setTranslate(0, ROOM_SIZE/2 + EPS, 0)
      // make it ROOM_SIZE units tall/wide/deep
      .scale(-ROOM_SIZE, -ROOM_SIZE, -ROOM_SIZE)
      // recenter so the cube’s local (0,0,0) sits at its corner
      .translate(-0.5, -0.5, -0.5);

  // flat‐color walls rather than textured
  room.textureNum = -2;              
  room.color      = [1.0, 1.0, 1.0, 1.0];

  g_worldCubes.push(room);
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

  if (document.pointerLockElement !== canvas) return;

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

// --- renderAnimal -----------------------------------------------------------
// Builds the blocky animal entirely from Cubes.
function renderAnimal() {
  // 1) compute a little oscillation for body & legs
  const t = performance.now() * 0.001 * Math.PI;  // seconds→radians
  const bodyAngle = 5  * Math.sin(t);             // ±5°
  const leg1Angle = 15 * Math.sin(t);             // front left/back right
  const leg2Angle = 15 * Math.sin(t + Math.PI);   // front right/back left

  // 2) set branch for plain‐color animal
  gl.uniform1i(u_whichTexture, -1);

  // 3) define colors
  const green     = [13/255, 181/255, 13/255, 1];
  const midGreen  = [15/255, 128/255, 15/255, 1];
  const darkGreen = [0,       69/255,   0,      1];

  // 4) root transform: place at world‐center, elevate to floor height ≈1
  const root = new Matrix4().translate(0, 1.0, 0);

  // --- LOWER TORSO ---
  let m = new Matrix4(root)
            .translate(-0.1, -0.40, -0.10)
            .scale(1, 1.2, 1);
  let part = new Cube();
  part.color  = green;
  part.matrix = m;
  part.render();

  // --- UPPER TORSO (with sway) ---
  m = new Matrix4(m)
        .translate(0, 0.45, 0)
        // rotate around its local corner at (.20,.20,.20)
        .translate(0.20, 0.20, 0.20)
        .rotate(bodyAngle, 0, 0, 1)
        .translate(-0.20, -0.20, -0.20);
  part = new Cube();
  part.color  = green;
  part.matrix = m;
  part.render();

  // --- HEAD ---
  m = new Matrix4(m)
        .translate(0, 0.60, 0)    // up off the shoulders
        .scale(1.1, 1.2, 1.1);
  part = new Cube();
  part.color  = midGreen;
  part.matrix = m;
  part.render();

  // --- LEGS HELPER ---
  function drawLeg(x,y,z,pivotZ, angle, color) {
    let mm = new Matrix4(root)
               .translate(x, y, z)
               .translate(0, 0.4, pivotZ)
               .rotate(angle, 1, 0, 0)
               .translate(0, -0.4, -pivotZ)
               .scale(0.7, 0.5, 0.7);
    const leg = new Cube();
    leg.color  = color;
    leg.matrix = mm;
    leg.render();
  }

  // front‐left, front‐right, back‐left, back‐right:
  drawLeg(-0.32, -0.40, -0.50, 0.7,  leg1Angle, green);
  drawLeg( 0.60, -0.40, -0.50, 0.7,  leg2Angle, green);
  drawLeg(-0.32, -0.40,  0.75, 0.0, -leg2Angle, darkGreen);
  drawLeg( 0.60, -0.40,  0.75, 0.0, -leg1Angle, darkGreen);
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
  gl.uniform1i(u_showNormals, showNormals ? 1 : 0);

  // animate X back-and-forth
  const ROOM_SIZE = SIZE/1.5;
  const HALF      = ROOM_SIZE/2;
  const t         = now * 0.001;         // seconds
  const speed     = 0.5;
  const amplitude = HALF;
  const offset    = amplitude * Math.sin(speed * t);

  const autoX     = Math.sin(t) * HALF;
  
  g_lightPos[0] = g_lightBaseX + offset;
  document.getElementById('sliderX').value = autoX.toFixed(2);

  // upload light uniforms
  gl.uniform3fv(u_LightPosition, g_lightPos);
  gl.uniform3fv(u_LightColor,    [1.0,1.0,0.0]);

  
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
  renderAnimal();
  g_sphere.render();

  // draw the moving light‐cube
  lightCube.matrix.setTranslate(
    g_lightPos[0],
    g_lightPos[1],
    g_lightPos[2]
  );
  // make it small and center it
  lightCube.matrix.scale(0.2,0.2,0.2)
                  .translate(-0.5,-0.5,-0.5);
  lightCube.render();

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
    }
  });

  setupWebGL();
  connectVariablesToGLSL();
  initTextures();

  ['X','Y','Z'].forEach((axis,i) => {
    const s = document.getElementById(`slider${axis}`);
    s.value = g_lightPos[i];
    const sX = document.getElementById('sliderX');
    sX.value = g_lightBaseX;
    sX.oninput = e => {
    g_lightBaseX = parseFloat(e.target.value);
    };
  });

  lightCube = new Cube();
  lightCube.textureNum = -1;           // our lighting branch
  lightCube.color      = [1,1,0,1];    // yellow

  document.getElementById('toggleNormals')
    .addEventListener('click', () => {
      showNormals = !showNormals;
    });

  enablePointerLock();
  
  
  
  
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  document.addEventListener('pointerlockchange', lockChange, false);
  document.addEventListener('mousemove', onPointerMove, false);

  camera = new Camera(canvas);
  // adjust spawn height
  camera.eye.elements[1] += 2.0;
  camera.updateView();

  fpsCounter = document.getElementById('fpsCounter');

  setupScene();
  g_sphere = new Sphere(40, 20);
  g_sphere.matrix.setTranslate(-5, 1.2, 0);


  renderLoop();
}
