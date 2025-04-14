var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform float u_Size;
    void main() {
        gl_Position = a_Position;
        gl_PointSize = u_Size;
    }`;

var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`;


let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

let g_numSegments = 10;
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize  = 10;
let g_selectedType  = 0;

const SQUARE   = 0;
const TRIANGLE = 1;
const CIRCLE   = 2;

let g_shapesList = [];

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  canvas.onmousedown = click;

  canvas.onmousemove = function(ev) {
    if (ev.buttons === 1) {
      click(ev);
    }
  };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function setupWebGL(){
  canvas = document.getElementById('webgl');

  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}


function connectVariablesToGLSL(){
  // Initialize shaders
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
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get u_Size location');
    return;
  }
}

function addActionsForHtmlUI() {


  document.getElementById('clearButton').onclick = () => {
    g_shapesList = [];
    renderAllShapes();
  };


  document.getElementById('squareButton').onclick = () => {
    g_selectedType = SQUARE;
  };
  document.getElementById('triangleButton').onclick = () => {
    g_selectedType = TRIANGLE;
  };
  document.getElementById('circleButton').onclick = () => {
    g_selectedType = CIRCLE;
  };


  document.getElementById('redSlide').oninput = function() {
    g_selectedColor[0] = parseFloat(this.value);
    renderAllShapes();
  };

  document.getElementById('greenSlide').oninput = function() {
    g_selectedColor[1] = parseFloat(this.value);
    renderAllShapes();
  };

  document.getElementById('blueSlide').oninput = function() {
    g_selectedColor[2] = parseFloat(this.value);
    renderAllShapes();
  };


  document.getElementById('sizeSlide').addEventListener('mouseup', function() {
    g_selectedSize = parseFloat(this.value);
  });


  document.getElementById('segmentSlide').addEventListener('input', function() {
    g_numSegments = parseInt(this.value);
    renderAllShapes();
  });
}

function click(ev) {
  const [x, y] = convertCoordinatesEventToGL(ev);
  let shape;

  if (g_selectedType === 0) {
    shape = new Square(x, y, [...g_selectedColor], g_selectedSize);
  } else if (g_selectedType === 1) {
    shape = new Triangle(x, y, [...g_selectedColor], g_selectedSize);
  } else if (g_selectedType === 2) {
    shape = new Circle(x, y, [...g_selectedColor], g_selectedSize, g_numSegments);
  }

  console.log('Created shape:', shape);
  g_shapesList.push(shape);
  renderAllShapes();
}


function convertCoordinatesEventToGL(ev) {
  let x = ev.clientX;
  let y = ev.clientY;
  let rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function renderAllShapes() {

  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }
}
