var ctx;

function main() {

	var v1 = new Vector3([2.25, 2.25, 0.0]);
	
	// Retrieve <canvas> element
	var canvas = document.getElementById('example');
	if (!canvas) {
		console.log('Failed to retrieve the <canvas> element');
		return;
	}

	// Get the rendering for 2DCG
	ctx = canvas.getContext('2d');

	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	//drawVector(ctx, v1, "red");
}
function drawVector(ctx, v, color) {
	var startX = 200;
	var startY = 200;

	var endX = startX + (v.elements[0] * 20);
	var endY = startY - (v.elements[1] * 20);

	ctx.beginPath();
	ctx.moveTo(startX, startY);
	ctx.lineTo(endX, endY);
	ctx.strokeStyle = color;
	ctx.stroke();
}

function handleDrawEvent() {
	let op = document.getElementById("operation").value;
	let scalar = parseFloat(document.getElementById("scalar").value);

	// retrieve canvas element
	var canvas = document.getElementById('example');
	var ctx = canvas.getContext('2d');

	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// read x and y from input field
	var x = parseFloat(document.getElementById("x").value);
	var y = parseFloat(document.getElementById("y").value);

	var x2 = parseFloat(document.getElementById("x2").value);
	var y2 = parseFloat(document.getElementById("y2").value);

	var v1 = new Vector3([x, y, 0.0]);
	var v2 = new Vector3([x2, y2, 0.0])

	drawVector(ctx, v1, "red");
	drawVector(ctx, v2, "blue");

	if (op === "add") {
	    let v3 = new Vector3(v1.elements);
	    v3.add(v2);
	    drawVector(ctx, v3, "green");
  	} else if (op === "sub") {
	    let v3 = new Vector3(v1.elements);
	    v3.sub(v2);
	    drawVector(ctx, v3, "green");
	} else if (op === "mul") {
	    let v3 = new Vector3(v1.elements);
	    let v4 = new Vector3(v2.elements);
	    v3.mul(scalar);
	    v4.mul(scalar);
		drawVector(ctx, v3, "green");
		drawVector(ctx, v4, "green");
	} else if (op === "div") {
	    let v3 = new Vector3(v1.elements);
	    let v4 = new Vector3(v2.elements);
	    v3.div(scalar);
	    v4.div(scalar);
	    drawVector(ctx, v3, "green");
	    drawVector(ctx, v4, "green");
	} else if (op === "magnitude") {
	    console.log("Magnitude of v1:", v1.magnitude().toFixed(4));
	    console.log("Magnitude of v2:", v2.magnitude().toFixed(4));
  	} else if (op === "normalize") {
	    let v3 = new Vector3(v1.elements);
	    let v4 = new Vector3(v2.elements);
	    v3.normalize();
	    v4.normalize();
	    drawVector(ctx, v3, "green");
	    drawVector(ctx, v4, "green");
	}
	else if (op === "angle") {
		let angle = angleBetween(v1, v2);
		console.log("Angle between v1 and v2:", angle.toFixed(2), "degrees");
	}
	else if (op === "area") {
		let area = areaTriangle(v1, v2);
	 	console.log("Area of triangle formed by v1 and v2:", area.toFixed(4));
	}

}
function angleBetween(v1, v2) {
	let dot = Vector3.dot(v1, v2);
	let mag1 = v1.magnitude();
	let mag2 = v2.magnitude();

	if (mag1 === 0 || mag2 === 0) return 0;

	let cosTheta = dot / (mag1 * mag2);
	cosTheta = Math.max(-1, Math.min(1, cosTheta));

	let angleRad = Math.acos(cosTheta);
	let angleDeg = angleRad * (180 / Math.PI);
	return angleDeg;
}

function areaTriangle(v1, v2){
	let cross = Vector3.cross(v1, v2);
	let magnitude = cross.magnitude();
	return magnitude / 2;
}







