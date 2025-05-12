// asg3.js

let canvas, gl;
let a_Position, a_UV;
let u_ModelMatrix, u_GlobalRotateMatrix;
let u_ViewMatrix, u_ProjectionMatrix, u_Sampler0;
let camera;
let g_vertexCount;

// Scene cubes
let groundCube, skyCube;
let wallCubes = [];

// Vertex shader
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
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;
// Fragment shader
const FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform sampler2D u_Sampler0;
  uniform vec4 u_BaseColor;
  uniform float u_texColorWeight;
  void main() {
    vec4 texColor = texture2D(u_Sampler0, v_UV);
    gl_FragColor = mix(u_BaseColor, texColor, u_texColorWeight);
  }`;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return false;
  const FSIZE = Float32Array.BYTES_PER_ELEMENT;

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV       = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler0           = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_BaseColor       = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_texColorWeight  = gl.getUniformLocation(gl.program, 'u_texColorWeight');


  const cube = new Cube();
  g_vertexCount = cube.vertices.length / 8;
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 8, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * 8, FSIZE * 6);
  gl.enableVertexAttribArray(a_UV);

  return true;
}

function initTextures() {
  const img = new Image();
  img.onload = () => {
    // dirt texture on unit0
    const tex0 = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };
  img.src = 'imgs/dirt.jpg';

  // green 1x1 texture on unit1 for ground
  const greenData = new Uint8Array([51, 179, 51, 255]);
  const greenTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, greenTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, greenData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  // default sampler to unit0
  gl.uniform1i(u_Sampler0, 0);
  return true;
}


function addControls(ev) {
  switch(ev.keyCode) {
    case 87: camera.moveForward();   break;
    case 83: camera.moveBackwards(); break;
    case 65: camera.moveLeft();      break;
    case 68: camera.moveRight();     break;
    case 81: camera.panLeft();       break;
    case 69: camera.panRight();      break;
  }
}

function setupScene() {
  // Ground
  groundCube = new Cube();
  groundCube.matrix = new Matrix4()
    .setTranslate(0, -0.1, 0)
    .scale(100, 0.02, 100)
    .translate(-0.5, 0, -0.5);
  groundCube.color = [0.2,0.7,0.2,1];
  groundCube.textureNum = 2;

  // Skybox
  skyCube = new Cube();
  skyCube.matrix = new Matrix4();
  skyCube.textureNum = 0;

  // Walls
  const positions = [
    {x:0, z:-50, rotY:0},
    {x:0, z:50, rotY:180},
    {x:-50, z:0, rotY:90},
    {x:50, z:0, rotY:-90}
  ];
  for (let p of positions) {
    const w = new Cube();
    w.matrix = new Matrix4()
      .setTranslate(p.x, 0, p.z)
      .rotate(p.rotY, 0,1,0)
      .scale(100, 10, 1)
      .translate(-0.5,-0.5,-0.5);
    w.textureNum = 1;
    wallCubes.push(w);
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initTextures();

  camera = new Camera(canvas);
  document.onkeydown = addControls;

  setupScene();
  requestAnimationFrame(renderLoop);
}

function renderLoop() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix,       false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, new Matrix4().elements);

  // Main cube
  gl.uniform4f(u_BaseColor, 1,1,1,1);
  gl.uniform1f(u_texColorWeight, 1.0);
  const mainM = new Matrix4().setScale(0.5,0.5,0.5);
  gl.uniformMatrix4fv(u_ModelMatrix, false, mainM.elements);
  gl.drawArrays(gl.TRIANGLES, 0, g_vertexCount);

  // Ground
  gl.uniform4f(u_BaseColor, 0.2,0.7,0.2,1);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, groundCube.matrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, g_vertexCount);

  // Walls
  gl.uniform4f(u_BaseColor, 1,1,1,1);
  gl.uniform1f(u_texColorWeight, 1.0);
  for (let w of wallCubes) {
    gl.uniformMatrix4fv(u_ModelMatrix, false, w.matrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, g_vertexCount);
  }

  // Skybox
  gl.uniform4f(u_BaseColor, 0.5,0.7,1.0,1);
  gl.uniform1f(u_texColorWeight, 0.0);
  skyCube.matrix
    .setTranslate(camera.eye.elements[0],camera.eye.elements[1],camera.eye.elements[2])
    .scale(1000,1000,1000)
    .translate(-0.5,-0.5,-0.5);
  gl.uniformMatrix4fv(u_ModelMatrix, false, skyCube.matrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, g_vertexCount);

  requestAnimationFrame(renderLoop);
}

main();
