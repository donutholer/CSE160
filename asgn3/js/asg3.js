// global var
let gl = null;

let world = [];
let u_baseColorLoc      = null;
let u_texColorWeightLoc = null;
let camera = null;



let VERTEX_SHADER = `
  precision mediump float;

  attribute vec3 a_Position;
  attribute vec3 a_Color;
  attribute vec2 a_UV;

  varying vec3 v_Color;
  varying vec2 v_UV;

  uniform mat4 u_modelMatrix;
  uniform mat4 u_viewMatrix;
  uniform mat4 u_projectionMatrix;

  void main() {
    v_Color = a_Color;
    v_UV = a_UV;
    gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_Position, 1.0);
  }
`;

let FRAGMENT_SHADER = `
  precision mediump float;

  varying vec2 v_UV;

  uniform sampler2D u_Sampler;       // the texture
  uniform vec4    u_baseColor;       // solid color
  uniform float   u_texColorWeight;

  void main() {
    vec4 texColor = texture2D(u_Sampler, v_UV);
    // linear interpolate: (1 − t)*base + t*texture
    gl_FragColor = mix(u_baseColor, texColor, u_texColorWeight);
  }
`;

function tick() {
  renderWorld();
  requestAnimationFrame(tick);
}

function renderWorld(){
  // retrieve uniforms
  var u_modelMatrix = gl.getUniformLocation(gl.program, "u_modelMatrix");
  let u_viewMatrix = gl.getUniformLocation(gl.program, "u_viewMatrix");
  let u_projectionMatrix = gl.getUniformLocation(gl.program, "u_projectionMatrix");

  // create a view matrix
  gl.uniformMatrix4fv(u_viewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_projectionMatrix, false, camera.projectionMatrix.elements);

  // clear screen
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // rendering loop
  for (let geometry of world) {

    geometry.modelMatrix.multiply(geometry.translationMatrix);
    geometry.modelMatrix.multiply(geometry.rotationZMatrix);
    geometry.modelMatrix.multiply(geometry.scaleMatrix);

    if (geometry.isSky) {
      gl.uniform4f(u_baseColorLoc, 0.4, 0.7, 1.0, 1.0);
      gl.uniform1f(u_texColorWeightLoc, 0.0);
    }
    else {
      gl.uniform4f(u_baseColorLoc, 1.0, 1.0, 1.0, 1.0);
      gl.uniform1f(u_texColorWeightLoc, 1.0);
    }

    gl.uniformMatrix4fv(u_modelMatrix, false, geometry.modelMatrix.elements)
    
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

    gl.drawArrays(gl.TRIANGLES, 0, geometry.vertices.length/8);
  }
}

function loadTexture(src) {
  // create a WebGL texture
  var glTexture = gl.createTexture();

  // Create an html <img> dynamically
  var imgTag = new Image();
  imgTag.src = src;

  // this function is called when it is loaded
  // and ready to be used (can take a few ms)
  imgTag.onload = function() {
    console.log("image", imgTag);

    // send texture to gpu shader

    // activate texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // binding texture we created to the texture0 unit
    gl.bindTexture(gl.TEXTURE_2D, glTexture);

    // set minification filter, reduce resolution of a img
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // map html image tag to the wbgl texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgTag);

    // send texture to shader
    let u_Sampler = gl.getUniformLocation(gl.program, "u_Sampler");
    
    gl.uniform1i(u_Sampler, 0);

    renderWorld(world);
  }
}

function main() {
  const canvas = document.getElementById("webgl");

  gl = getWebGLContext(canvas);
  if(!gl) {
    console.log("Failed to get WebGL context.")
    return -1;
  }

  gl.enable(gl.DEPTH_TEST);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.clear(gl.COLOR_BUFFER_BIT);

  // let triangle1 = new Triangle();

  let cube = new Cube();
  cube.scale(0.5, 0.5, 0.5);

  // world.push(triangle1);
  world.push(cube);

  if(!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER)) {
    console.log("Failed to compile and load shaders");
    return -1;
  }
  u_baseColorLoc      = gl.getUniformLocation(gl.program, "u_baseColor");
  u_texColorWeightLoc = gl.getUniformLocation(gl.program, "u_texColorWeight");

  

  let vertexBuffer = gl.createBuffer();
  if(!vertexBuffer) {
    console.log("Can't create buffer");
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  let FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

  let a_Position = gl.getAttribLocation(gl.program, "a_Position");
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8 * FLOAT_SIZE, 0 * FLOAT_SIZE);
  gl.enableVertexAttribArray(a_Position);

  let a_Color = gl.getAttribLocation(gl.program, "a_Color");
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 8 * FLOAT_SIZE, 3 * FLOAT_SIZE);
  gl.enableVertexAttribArray(a_Color);

  // setup a_UV attr in the shader
  let a_UV = gl.getAttribLocation(gl.program, "a_UV");
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 8 * FLOAT_SIZE, 6 * FLOAT_SIZE);
  gl.enableVertexAttribArray(a_UV);

  camera = new Camera(canvas);

  document.onkeydown = addControls;


  // key listening
  function addControls(ev) {
    switch (ev.keyCode) {
        case 87:
            camera.moveForward();
            break;
        case 83:
            camera.moveBackwards();
            break;
        case 68:
            camera.moveRight();
            break;
        case 65:
            camera.moveLeft();
            break;
        case 81:
            camera.panLeft();
            break;
        case 69:
            camera.panRight();
            break;
        default:
          return;
    }
  }
  requestAnimationFrame(tick);

  // load texture
  loadTexture("imgs/dirt.jpg");

}