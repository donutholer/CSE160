// sphere.js

class Sphere {
    /**
     * @param {number} slices  subdivisions around equator
     * @param {number} stacks  subdivisions from top to bottom
     */
    constructor(slices = 24, stacks = 16) {
      this.type       = "sphere";
      this.color      = [1, 1, 1, 1];
      this.matrix     = new Matrix4();
      this.textureNum = -1;   // flat‐color branch
      // temporary JS arrays
      const positions = [];
      const normals   = [];
      const uvs       = [];
  
      // build the sphere
      for (let stack = 0; stack < stacks; ++stack) {
        const phi1 = (Math.PI * stack)     / stacks;
        const phi2 = (Math.PI * (stack+1)) / stacks;
        const y1   = Math.cos(phi1), r1 = Math.sin(phi1);
        const y2   = Math.cos(phi2), r2 = Math.sin(phi2);
  
        for (let slice = 0; slice < slices; ++slice) {
          const th1 = (2*Math.PI * slice)     / slices;
          const th2 = (2*Math.PI * (slice+1)) / slices;
  
          // four corners
          const x11 = r1*Math.cos(th1), z11 = r1*Math.sin(th1);
          const x12 = r1*Math.cos(th2), z12 = r1*Math.sin(th2);
          const x21 = r2*Math.cos(th1), z21 = r2*Math.sin(th1);
          const x22 = r2*Math.cos(th2), z22 = r2*Math.sin(th2);
  
          // push two triangles
          pushTri(x11,y1,z11,  x21,y2,z21,  x22,y2,z22);
          pushTri(x11,y1,z11,  x22,y2,z22,  x12,y1,z12);
        }
      }
  
      // helper closes over positions/normals/uvs
      function pushTri(x1,y1,z1, x2,y2,z2, x3,y3,z3) {
        // positions
        positions.push(x1,y1,z1,  x2,y2,z2,  x3,y3,z3);
        // normals = same as pos for a unit sphere
        normals.push   (x1,y1,z1,  x2,y2,z2,  x3,y3,z3);
        // equirectangular UVs
        uvs.push(
          0.5 + Math.atan2(z1,x1)/(2*Math.PI),  1 - (y1+1)/2,
          0.5 + Math.atan2(z2,x2)/(2*Math.PI),  1 - (y2+1)/2,
          0.5 + Math.atan2(z3,x3)/(2*Math.PI),  1 - (y3+1)/2
        );
      }
  
      // convert into typed arrays
      this.vertices = new Float32Array(positions);
      this.normals  = new Float32Array(normals);
      this.uvs      = new Float32Array(uvs);
  
      // create & fill GPU buffers once
      this.posBuffer    = gl.createBuffer();
      this.normalBuffer = gl.createBuffer();
      this.uvBuffer     = gl.createBuffer();
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
    }
  
    render() {
      // set up flat‐color
      gl.uniform1i(u_whichTexture, this.textureNum);
      gl.uniform4fv(u_FragColor, this.color);
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
  
      // positions
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  
      // normals
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  
      // uvs
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  
      // enable
      gl.enableVertexAttribArray(a_Position);
      gl.enableVertexAttribArray(a_Normal);
      gl.enableVertexAttribArray(a_UV);
  
      // draw
      gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length/3);
    }
  }
  