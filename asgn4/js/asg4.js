// ── Globals & Constants ──────────────────────────────────────────────────────
let canvas, gl;
let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_GlobalRotateMatrix;
let u_ViewMatrix, u_ProjectionMatrix;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;
let u_FragColor, u_whichTexture;
let u_showNormals;
let u_LightPosition, u_LightColor, u_CameraPosition, u_NormalMatrix, u_useLighting;

let showNormals = false;
let g_useLighting = true;

let camera;
let g_worldCubes = [];
let g_sphere;
let g_lightPos = [0, 1, 0];
let lightCube;
let g_isLightAnimationActive = true;


// fps / overlay
let fpsCounter;

const SIZE = 32;
const MOUSE_SENSITIVITY = 0.05;

// smoother motion
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

const lightBrightnessFactor = 2.8; 


const VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat3 u_NormalMatrix; 

  varying vec3 v_Position;
  varying vec2 v_UV;
  varying vec3 v_Normal;

  void main() {
    vec4 worldPos4 = u_ModelMatrix * a_Position;
    v_Position = worldPos4.xyz;
    v_UV       = a_UV;
    v_Normal   = normalize(u_NormalMatrix * a_Normal); 

    gl_Position = u_ProjectionMatrix
                * u_ViewMatrix
                * u_GlobalRotateMatrix
                * worldPos4;
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

  uniform vec3 u_LightPosition;
  uniform vec3 u_LightColor; // This is already scaled by lightBrightnessFactor in JS
  uniform vec3 u_CameraPosition; 
  uniform bool u_useLighting;    

  // Function to calculate Phong shading components
  vec3 calculatePhong(vec3 baseColor, vec3 N, vec3 L, vec3 V, vec3 lightColor) {
      // Ambient component
      float ambientStrength = 0.5; // Kept from previous brightness adjustment
      vec3 ambient = ambientStrength * baseColor; 

      // Diffuse component
      float diff = max(dot(N, L), 0.0);
      vec3 diffuse = diff * lightColor;

      // Specular component
      float specularStrength = 0.15; // << REDUCED from 0.5 to 0.15
      float shininess = 32.0; 
      vec3 R = reflect(-L, N);  
      float spec = pow(max(dot(V, R), 0.0), shininess);
      vec3 specular = specularStrength * spec * lightColor; 

      // Combine components: ambient from base, diffuse & specular modulated by baseColor
      return ambient + (diffuse + specular) * baseColor;
  }

  void main() {
    if (u_showNormals == 1) {
      vec3 n = normalize(v_Normal);
      gl_FragColor = vec4(n*0.5+0.5, 1.0); 
      return;
    }

    vec4 baseColor;
    if (u_whichTexture == -1 || u_whichTexture == -2) { 
        baseColor = u_FragColor;
    } else if (u_whichTexture == 0) { 
        baseColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) { 
        baseColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 2) { 
        baseColor = texture2D(u_Sampler2, v_UV);
    } else if (u_whichTexture == 3) { 
        baseColor = texture2D(u_Sampler3, v_UV);
    } else { 
        baseColor = vec4(v_UV,0.0,1.0); 
    }

    if (!u_useLighting) {
        gl_FragColor = baseColor;
        return;
    }

    vec3 N = normalize(v_Normal); 
    vec3 L = normalize(u_LightPosition - v_Position); 
    vec3 V = normalize(u_CameraPosition - v_Position); 

    vec3 finalColor = calculatePhong(baseColor.rgb, N, L, V, u_LightColor);
    gl_FragColor = vec4(finalColor, baseColor.a);
  }`;



// Function to send textures to GLSL uniforms
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

// Setup WebGL context
function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl');
    gl.enable(gl.DEPTH_TEST); 
}

function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return false;

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
    u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_showNormals = gl.getUniformLocation(gl.program, 'u_showNormals');

    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    u_CameraPosition = gl.getUniformLocation(gl.program, 'u_CameraPosition');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_useLighting = gl.getUniformLocation(gl.program, 'u_useLighting');

    if (a_Position < 0) console.error('a_Position not found');
    if (a_UV < 0) console.error('a_UV not found');
    if (a_Normal < 0) console.error('a_Normal not found');
    if (!u_ModelMatrix) console.error('u_ModelMatrix not found');
    if (!u_GlobalRotateMatrix) console.error('u_GlobalRotateMatrix not found');
    if (!u_ViewMatrix) console.error('u_ViewMatrix not found');
    if (!u_ProjectionMatrix) console.error('u_ProjectionMatrix not found');
    if (!u_Sampler0) console.error('u_Sampler0 not found');
    if (!u_Sampler1) console.error('u_Sampler1 not found');
    if (!u_Sampler2) console.error('u_Sampler2 not found');
    if (!u_Sampler3) console.error('u_Sampler3 not found');
    if (!u_whichTexture) console.error('u_whichTexture not found');
    if (!u_FragColor) console.error('u_FragColor not found');
    if (!u_showNormals) console.error('u_showNormals not found');
    if (!u_LightPosition) console.error('u_LightPosition not found');
    if (!u_LightColor) console.error('u_LightColor not found');
    if (!u_CameraPosition) console.error('u_CameraPosition not found');
    if (!u_NormalMatrix) console.error('u_NormalMatrix not found');
    if (!u_useLighting) console.error('u_useLighting not found');

    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_UV);
    gl.enableVertexAttribArray(a_Normal);

    const identityMatrix = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityMatrix.elements);

    return true;
}

// Initialize textures
function initTextures() {
    const skyImg = new Image();
    skyImg.onload = () => {
        console.log('skyImg loaded:', skyImg.width, '×', skyImg.height);
        sendTextureToGLSL(skyImg, gl.TEXTURE0, 0, u_Sampler0);
    };
    skyImg.src = './imgs/skybox.jpeg'; 

    const dirtImg = new Image();
    dirtImg.onload = () => {
        console.log('dirtImg loaded:', dirtImg.width, '×', dirtImg.height);
        sendTextureToGLSL(dirtImg, gl.TEXTURE1, 1, u_Sampler1);
    };
    dirtImg.src = './imgs/dirt.jpg'; 

    const grassImg = new Image();
    grassImg.onload = () => {
        console.log('grassImg loaded:', grassImg.width, '×', grassImg.height);
        sendTextureToGLSL(grassImg, gl.TEXTURE2, 2, u_Sampler2);
    };
    grassImg.src = './imgs/grass.jpg'; 

    const stoneImg = new Image();
    stoneImg.onload = () => {
        console.log('stoneImg loaded:', stoneImg.width, '×', stoneImg.height);
        sendTextureToGLSL(stoneImg, gl.TEXTURE3, 3, u_Sampler3);
    };
    stoneImg.src = './imgs/stone.jpg'; 

    return true;
}

// ── Scene Construction ───────────────────────────────────────────────────────
function createTiledGround() {
    const TILES = 32;
    const TILE_SIZE = 1;
    const Y_POS = -0.1; 

    for (let x = 0; x < TILES; x++) {
        for (let z = 0; z < TILES; z++) {
            const groundTile = new Cube();
            groundTile.matrix
                .setTranslate(x - TILES / 2 + 0.5, Y_POS, z - TILES / 2 + 0.5)
                .scale(TILE_SIZE, 0.1, TILE_SIZE);

            groundTile.textureNum = 2; 
            groundTile.color = [1, 1, 1, 1]; 
            g_worldCubes.push(groundTile);
        }
    }
}

function setupScene() {
    g_worldCubes.length = 0; 

    createTiledGround();

    const ROOM_SIZE = SIZE / 1.5;
    const EPS = 0.01; 

    const room = new Cube();
    room.matrix
        .setTranslate(0, ROOM_SIZE / 2 + EPS, 0)
        .scale(-ROOM_SIZE, -ROOM_SIZE, -ROOM_SIZE) 
        .translate(-0.5, -0.5, -0.5);

    room.textureNum = -2;
    room.faceColors = [
        [0.4, 0.4, 0.4, 1.0], // Front face (+Z)
        [0.4, 0.4, 0.4, 1.0], // Back face (-Z) - matching opposing
        [0.5, 0.5, 0.5, 1.0], // Right face (+X)
        [0.5, 0.5, 0.5, 1.0], // Left face (-X) - matching opposing
        [0.6, 0.6, 0.6, 1.0], // Top face (+Y)
        [0.6, 0.6, 0.6, 1.0]  // Bottom face (-Y) - matching opposing
    ];
  
    
    room.isSkybox = true;
    g_worldCubes.push(room);
}


function enablePointerLock() {
    if (canvas) { 
        canvas.requestPointerLock =
            canvas.requestPointerLock ||
            canvas.mozRequestPointerLock ||
            canvas.webkitRequestPointerLock;
    }
}

function onPointerMove(e) {
    if (document.pointerLockElement !== canvas) return; 

    const yaw = e.movementX * MOUSE_SENSITIVITY;
    const pitch = -e.movementY * MOUSE_SENSITIVITY; 

    camera.yaw = (camera.yaw || 0) + yaw;
    camera.pitch = (camera.pitch || 0) + pitch;
    
    if (camera.pitch > 89.0) camera.pitch = 89.0;
    if (camera.pitch < -89.0) camera.pitch = -89.0;

    camera.updateView(); 
}

document.addEventListener('keydown', e => {
    if (document.pointerLockElement !== canvas && e.key !== "Escape") return;

    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
});
document.addEventListener('keyup', e => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
});

function applyMovement(dt) {
    if (document.pointerLockElement !== canvas) return; 

    const forwardDir = new Vector3(camera.at.elements);
    forwardDir.sub(camera.eye).normalize(); 

    const rightDir = Vector3.cross(forwardDir, camera.up).normalize(); 

    let moved = false;
    const moveAmount = camera.speed * dt;

    if (keys.w) {
        const scaledForward = new Vector3(forwardDir.elements).mul(moveAmount);
        camera.eye.add(scaledForward);
        camera.at.add(scaledForward);
        moved = true;
    }
    if (keys.s) {
        const scaledForward = new Vector3(forwardDir.elements).mul(moveAmount);
        camera.eye.sub(scaledForward);
        camera.at.sub(scaledForward);
        moved = true;
    }
    if (keys.a) { 
        const scaledRight = new Vector3(rightDir.elements).mul(moveAmount);
        camera.eye.sub(scaledRight); 
        camera.at.sub(scaledRight);
        moved = true;
    }
    if (keys.d) { 
        const scaledRight = new Vector3(rightDir.elements).mul(moveAmount);
        camera.eye.add(scaledRight); 
        camera.at.add(scaledRight);
        moved = true;
    }

    if (moved) {
        camera.updateView(); 
    }
}

function normalMatrixFrom(modelMat4) {
    const invT = new Matrix4(modelMat4); 
    invT.invert();
    invT.transpose();

    return new Float32Array([
        invT.elements[0], invT.elements[1], invT.elements[2],
        invT.elements[4], invT.elements[5], invT.elements[6],
        invT.elements[8], invT.elements[9], invT.elements[10],
    ]);
}

function renderAnimal() {
    const t = performance.now() * 0.001 * Math.PI; 
    const bodyAngle = 5 * Math.sin(t); 
    const leg1Angle = 15 * Math.sin(t); 
    const leg2Angle = 15 * Math.sin(t + Math.PI); 

    gl.uniform1i(u_whichTexture, -1);

    const green = [13 / 255, 181 / 255, 13 / 255, 1];
    const midGreen = [15 / 255, 128 / 255, 15 / 255, 1];
    const darkGreen = [0, 69 / 255, 0, 1];

    const root = new Matrix4().translate(0, 1.0, 0);
    
    let partNormalMatrix; 

    let m_lowerTorso = new Matrix4(root)
        .translate(-0.1, -0.40, -0.10)
        .scale(1, 1.2, 1);
    let lowerTorsoPart = new Cube();
    lowerTorsoPart.color = green;
    lowerTorsoPart.matrix = m_lowerTorso;
    partNormalMatrix = normalMatrixFrom(lowerTorsoPart.matrix);
    gl.uniformMatrix3fv(u_NormalMatrix, false, partNormalMatrix);
    lowerTorsoPart.render();

    let m_upperTorso = new Matrix4(m_lowerTorso) 
        .translate(0.25, 0.6, 0.25) 
        .rotate(bodyAngle, 0, 0, 1)  
        .translate(-0.25, -0.6, -0.25); 
    let upperTorsoPart = new Cube();
    upperTorsoPart.color = green;
    upperTorsoPart.matrix = m_upperTorso;
    partNormalMatrix = normalMatrixFrom(upperTorsoPart.matrix);

    gl.uniformMatrix3fv(u_NormalMatrix, false, partNormalMatrix);
    upperTorsoPart.render();

    let m_head = new Matrix4(m_upperTorso) 
        .translate(-0.1, 0.60, 0) 
        .scale(1.1, 1.2, 1.1);
    let headPart = new Cube();
    headPart.color = midGreen;
    headPart.matrix = m_head;
    partNormalMatrix = normalMatrixFrom(headPart.matrix);
    gl.uniformMatrix3fv(u_NormalMatrix, false, partNormalMatrix);
    headPart.render();

    function drawLeg(baseTransformMatrix, x, y, z, pivotZ, angle, color) {
        let legMatrix = new Matrix4(baseTransformMatrix) 
            .translate(x, y, z) 
            .translate(0, 0.2, pivotZ) 
            .rotate(angle, 1, 0, 0)    
            .translate(0, -0.2, -pivotZ) 
            .scale(0.7, 0.5, 0.7);     
        
        const leg = new Cube();
        leg.color = color;
        leg.matrix = legMatrix;
        partNormalMatrix = normalMatrixFrom(leg.matrix);
        gl.uniformMatrix3fv(u_NormalMatrix, false, partNormalMatrix);
        leg.render();
    }

    drawLeg(root, -0.32, -0.40, -0.50, 0.35, leg1Angle, green);    
    drawLeg(root,  0.60, -0.40, -0.50, 0.35, leg2Angle, green);    
    drawLeg(root, -0.32, -0.40,  0.75, 0.0, -leg2Angle, darkGreen); 
    drawLeg(root,  0.60, -0.40,  0.75, 0.0, -leg1Angle, darkGreen); 
}


let lastTime = performance.now();

function renderLoop(now = performance.now()) {

    const deltaTime = (now - lastTime) / 1000; 
    lastTime = now;
    applyMovement(deltaTime); 

    const fps = Math.round(1 / deltaTime);
    fpsCounter.textContent = `${fps} FPS`;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    gl.uniform1i(u_showNormals, showNormals ? 1 : 0); 

    if (g_isLightAnimationActive) {
        const L_ANIM_PERIOD_SEC = 8.0; 
        const L_RANGE_X = 10.0;       
        g_lightPos[0] = (L_RANGE_X / 2) * Math.sin((now / 1000) * (2 * Math.PI / L_ANIM_PERIOD_SEC));
        document.getElementById('sliderX').value = g_lightPos[0].toFixed(1);
    }
    
    g_lightPos[1] = parseFloat(document.getElementById('sliderY').value);
    g_lightPos[2] = parseFloat(document.getElementById('sliderZ').value);

    gl.uniform3fv(u_LightPosition, g_lightPos); 
    gl.uniform3fv(u_CameraPosition, camera.eye.elements); 
    gl.uniform1i(u_useLighting, g_useLighting ? 1 : 0); 


    gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, new Matrix4().elements); 


    for (const c of g_worldCubes) {
        const normalMatrix = normalMatrixFrom(c.matrix);
        gl.uniformMatrix3fv(u_NormalMatrix, false, normalMatrix);
        
        gl.uniformMatrix4fv(u_ModelMatrix, false, c.matrix.elements); 

        if (c.isSkybox) { 
            gl.depthMask(false); 
            
        } else {
            gl.depthMask(true); 
            
        }
        c.render();
    }
    gl.depthMask(true); 

    renderAnimal();

    const sphereNormalMatrix = normalMatrixFrom(g_sphere.matrix);
    gl.uniformMatrix3fv(u_NormalMatrix, false, sphereNormalMatrix);
    g_sphere.render();

    gl.uniform1i(u_useLighting, 0);

    lightCube.matrix.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    lightCube.matrix.scale(0.2, 0.2, 0.2).translate(-0.5, -0.5, -0.5);
    
    const lightCubeNormalMatrix = normalMatrixFrom(lightCube.matrix);
    gl.uniformMatrix3fv(u_NormalMatrix, false, lightCubeNormalMatrix);
    
    lightCube.render();

    gl.uniform1i(u_useLighting, g_useLighting ? 1 : 0);

    requestAnimationFrame(renderLoop); 
}

function main() {
    const startOverlay = document.getElementById('startOverlay'); 

    setupWebGL(); 
    if (!connectVariablesToGLSL()) {
        console.error("Failed to connect GLSL variables. Aborting.");
        return;
    }
    initTextures(); 

    if (startOverlay) { 
        startOverlay.addEventListener('click', () => {
            if (canvas) { 
                canvas.requestPointerLock();
                startOverlay.style.display = 'none'; 
            }
        });
    }

    if (canvas) {
        canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== canvas) { 
                const isOverlayHiddenOrNotPrimary = !startOverlay || startOverlay.style.display === 'none';
                if (isOverlayHiddenOrNotPrimary) {
                    canvas.requestPointerLock();
                }
            }
        });
    }

    document.addEventListener('pointerlockchange', () => {
        const locked = (document.pointerLockElement === canvas);
        console.log('Pointer ' + (locked ? 'locked' : 'unlocked'));
        
        if (locked && startOverlay) {
            startOverlay.style.display = 'none';
        }
    });
  
    const sliderX = document.getElementById('sliderX');
    const sliderY = document.getElementById('sliderY');
    const sliderZ = document.getElementById('sliderZ');

    sliderX.value = g_lightPos[0];
    sliderY.value = g_lightPos[1];
    sliderZ.value = g_lightPos[2];

    sliderX.oninput = e => { 
        g_isLightAnimationActive = false; 
        g_lightPos[0] = parseFloat(e.target.value); 
    }; 
    sliderY.oninput = e => { 
        g_lightPos[1] = parseFloat(e.target.value); 
    };
    sliderZ.oninput = e => { 
        g_lightPos[2] = parseFloat(e.target.value); 
    };

    const lightColorPicker = document.getElementById('lightColorPicker');
    const initialColorHex = lightColorPicker.value; 
    gl.uniform3fv(u_LightColor, [
        (parseInt(initialColorHex.substring(1, 3), 16) / 255) * lightBrightnessFactor,
        (parseInt(initialColorHex.substring(3, 5), 16) / 255) * lightBrightnessFactor,
        (parseInt(initialColorHex.substring(5, 7), 16) / 255) * lightBrightnessFactor
    ]);

    lightColorPicker.addEventListener('input', () => {
        const colorHex = lightColorPicker.value;
        const r = (parseInt(colorHex.substring(1, 3), 16) / 255) * lightBrightnessFactor;
        const g = (parseInt(colorHex.substring(3, 5), 16) / 255) * lightBrightnessFactor;
        const b = (parseInt(colorHex.substring(5, 7), 16) / 255) * lightBrightnessFactor;
        gl.uniform3fv(u_LightColor, [r, g, b]);
    });

    const enableLightingCheckbox = document.getElementById('enableLighting');
    enableLightingCheckbox.checked = g_useLighting; 
    enableLightingCheckbox.addEventListener('change', () => {
        g_useLighting = enableLightingCheckbox.checked;
    });


    lightCube = new Cube();
    lightCube.textureNum = -1; 
    lightCube.color = [1, 1, 0, 1];

    document.getElementById('toggleNormals')
        .addEventListener('click', () => {
            showNormals = !showNormals;
        });

    enablePointerLock(); 

    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousemove', onPointerMove, false);

    camera = new Camera(canvas);
    camera.eye.elements[1] += 2.0; 
    camera.updateView(); 

    fpsCounter = document.getElementById('fpsCounter'); 

    setupScene();
    g_sphere = new Sphere(40, 20); 
    g_sphere.matrix.setTranslate(-3, 1.5, -3).scale(1.5,1.5,1.5); 
    g_sphere.textureNum = -1; 
    g_sphere.color = [0.5, 0.5, 1.0, 1.0]; 


    renderLoop(); 
}