// new blocky animal js
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute float a_Flag;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`;

// global var
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
//let g_globalAngle = 0;
let g_leg1Angle = 0;
let g_leg2Angle = 0;
let g_bodyAngle = 0;
let g_animation = false;
let g_startTime = Date.now();
let g_seconds   = 0; 
let g_frameCount = 0;
let g_lastFpsTime = Date.now();
let g_fps = 0;
let g_headPitch = 0;

// dragging
let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_dragging     = false;
let g_lastX, g_lastY; 

// jump 
let g_jumpActive    = false;
let g_jumpStartTime = 0;
let g_jumpYOffset   = 0;
const JUMP_DUR      = 0.6;
const JUMP_HEIGHT   = 0.35;

// ball global
let g_ballAngle = 0;
const BALL_RADIUS = 0.30;


function setupWebGL(){
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL(){
  // shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get a_Position location');
    return;
  }
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get u_FragColor location');
    return;
  }
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements); 

}

//constants

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;

// set up actions for the HTML UI elements
function addActionsForHtmlUI() {
  // // Button Events
  // document.getElementById('green').onclick = function() { g_selectedColor = [0.0,1.0,0.0,1.0]; };
  // document.getElementById('red').onclick  = function() { g_selectedColor = [1.0,0.0,0.0,1.0]; };
  // document.getElementById('clearButton').onclick = function() { g_shapesList=[]; renderAllShapes(); };

  // document.getElementById('pointButton').onclick = function() { g_selectedType = POINT; };
  // document.getElementById('triButton').onclick = function() { g_selectedType = TRIANGLE; };
  // document.getElementById('circleButton').onclick = function() { g_selectedType = CIRCLE; };
  
  // leg sliders
  document.getElementById('leg1Slide').addEventListener('mousemove', function() { 
    g_leg1Angle = this.value; 
    renderAllShapes(); 
  });
  document.getElementById('leg2Slide').addEventListener('mousemove', function() { 
    g_leg2Angle = this.value; 
    renderAllShapes(); 
  });

  // body sway slider
  document.getElementById('sway').addEventListener('mousemove', function() { 
    g_bodyAngle = this.value; 
    renderAllShapes(); 
  });

  // camera angle slider 
  document.getElementById('angleSlide').addEventListener('mousemove', function() { 
    g_globalAngle = this.value; 
    renderAllShapes(); 
  });

  // animation buttons
  document.getElementById('animOn').onclick  = () => { g_animation = true;  };
  document.getElementById('animOff').onclick = () => { g_animation = false; };

  // ----- mouse-drag camera control -----
  canvas.onmousedown = e => {
    g_dragging = true;
    const r = canvas.getBoundingClientRect();
    g_lastX = e.clientX - r.left;
    g_lastY = e.clientY - r.top;
  };

  canvas.onmousemove = e => {
    if (!g_dragging) return;

    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const dx = x - g_lastX;
    const dy = y - g_lastY;
    g_lastX = x;
    g_lastY = y;

    g_globalAngleY -= dx * 0.5;
    g_globalAngleX -= dy * 0.5;
  };

  canvas.onmouseup   = () => g_dragging = false;
  canvas.onmouseleave = () => g_dragging = false;

  // jump click
  canvas.onclick = e => {
    if (e.shiftKey) {
      g_jumpActive    = true;
      g_jumpStartTime = Date.now();
    }
  };

}

function main() {
  setupWebGL();

  connectVariablesToGLSL();

  addActionsForHtmlUI();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  tick();
}

function updateAnimationAngles() {
  // one full cycle every 2 sec
  const t = g_seconds * Math.PI;
  g_bodyAngle = 5 * Math.sin(t);
  g_leg1Angle = 15 * Math.sin(t);
  g_leg2Angle = 15 * Math.sin(t + Math.PI);
  g_headPitch = 6 * Math.sin(t);
  if (g_animation) g_ballAngle = (g_ballAngle + 3) % 360;
  
}

function updateJump() {
  if (!g_jumpActive) {
    g_jumpYOffset = 0;
    return;
  }

  const t = (Date.now() - g_jumpStartTime) / 1000;
  if (t >= JUMP_DUR) {
    g_jumpActive  = false;
    g_jumpYOffset = 0;

    g_leg1Angle = 0;
    g_leg2Angle = 0;

    return;
  }

  const phase = Math.PI * t / JUMP_DUR;
  g_jumpYOffset = JUMP_HEIGHT * Math.sin(phase);

  g_leg1Angle = 30;
  g_leg2Angle = -30;
}


function tick() {
  const now = Date.now();
  g_seconds = (now - g_startTime) / 1000;

  if (g_animation) updateAnimationAngles();
  updateJump()
  renderAllShapes();

  g_frameCount++;
  if (now - g_lastFpsTime >= 1000) {
    g_fps = g_frameCount;
    document.getElementById('fpsBox').textContent = `FPS ${g_fps}`;
    g_frameCount = 0;
    g_lastFpsTime = now;
  }
  requestAnimationFrame(tick);
}


// draw all shapes in here
function renderAllShapes() {

  /* -------- view rotation -------- */
  const viewMat = new Matrix4()
        .rotate(g_globalAngleX, 1, 0, 0)
        .rotate(g_globalAngleY, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, viewMat.elements);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* ------- spinning ball ---------- */
  const ball = new Sphere(24, 24, BALL_RADIUS);
  ball.matrix.translate(0.1, -0.5, 0.1);
  ball.matrix.rotate(g_ballAngle, 1, 0, 0);
  ball.render();

  const dot = new Cube();
  dot.color = [1, 1, 1, 1];
  dot.matrix = new Matrix4(ball.matrix);
  dot.matrix.translate(-0.05, 0, BALL_RADIUS);
  dot.matrix.scale(0.08, 0.08, 0.02);
  dot.render(); 

  /* -------- root translation for jump -------- */
  const root = new Matrix4().translate(0, BALL_RADIUS + g_jumpYOffset, 0);

  /* colours */
  const green     = [13/255, 181/255, 13/255, 1];
  const midGreen  = [15/255, 128/255, 15/255, 1];
  const darkGreen = [0,      69/255,  0,      1];

  /* ---------- LOWER TORSO ---------- */
  const lowerBody = new Cube();
  lowerBody.color  = green;
  lowerBody.matrix = new Matrix4(root);
  lowerBody.matrix.translate(-0.10, -0.40, -0.10);
  lowerBody.matrix.scale(0.4, 0.5, 0.4);
  lowerBody.render();

  /* ---------- UPPER TORSO ---------- */
  const upperBody = new Cube();
  upperBody.color  = green;
  upperBody.matrix = new Matrix4(lowerBody.matrix);

  upperBody.matrix.translate(0, 0.45, 0);
  upperBody.matrix.translate(0.20, 0.20, 0.20);
  upperBody.matrix.rotate(g_bodyAngle, 0, 0, 1);
  upperBody.matrix.translate(-0.20, -0.20, -0.20);
  upperBody.render();

  /* ---------- FACE HELPER ---------- */
  function addFace(parent) {
    const makePatch = (dx, dy, w, h) => {
      const patch = new Cube();
      patch.color = [5/255, 33/255, 9/255, 0.95/255];
      patch.matrix = new Matrix4(parent);
      patch.matrix.translate(dx, dy, -0.01);
      patch.matrix.scale(w, h, 0.05);
      patch.render();
    };
    makePatch(0.13, 0.48, 0.25, 0.25);
    makePatch(0.65, 0.48, 0.25, 0.25);
    makePatch(0.38, 0.15, 0.28, 0.35);
    makePatch(0.30, 0.00, 0.10, 0.35);
    makePatch(0.65, 0.00, 0.10, 0.35);
  }

  /* ---------- HEAD ---------- */
  const head = new Cube();
  head.color  = midGreen;
  head.matrix = new Matrix4(upperBody.matrix);

  head.matrix.rotate(g_headPitch, 1, 0, 0);

  head.matrix.scale(1, 1.4, 1);
  head.matrix.translate(-0.11, 0.45, -0.11);
  head.matrix.scale(1.2, 0.7, 1.2);
  head.render();
  addFace(head.matrix);

  /* ---------- LEGS ---------- */
  function buildLeg(parent, x, y, z, pivotZ, angle) {
    const leg = new Cube();
    leg.color  = (pivotZ === 0.7 ? green : darkGreen);
    leg.matrix = new Matrix4(parent);
    leg.matrix.translate(x, y, z);
    leg.matrix.translate(0, 0.4, pivotZ);
    leg.matrix.rotate(angle, 1, 0, 0);
    leg.matrix.translate(0, -0.4, -pivotZ);
    leg.matrix.scale(0.7, 0.5, 0.7);
    leg.render();
  }

  buildLeg(lowerBody.matrix, -0.32, -0.40, -0.50, 0.7,  g_leg1Angle);
  buildLeg(lowerBody.matrix,  0.60, -0.40, -0.50, 0.7,  g_leg2Angle);
  buildLeg(lowerBody.matrix, -0.32, -0.40,  0.75, 0.0, -g_leg2Angle);
  buildLeg(lowerBody.matrix,  0.60, -0.40,  0.75, 0.0, -g_leg1Angle);
}

function convertCoordinatesEventToGl(ev){
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}


