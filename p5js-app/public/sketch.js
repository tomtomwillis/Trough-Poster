let dogDrawings = []; // To store parsed drawings from the NDJSON file
let currentColorIndex = 0; // Tracks which color to use
const drawingColors = [COLOURS1.COL4]; // Colors to alternate drawing between

// Grid configuration
const gridRows = 3;
const gridCols = 2;
let currentRow = 0;
let currentCol = 0;

function preload() {
  // Load the NDJSON file as an array of strings (one string per line)
  let ndjsonLines = loadStrings('datasets/dog.ndjson', parseNDJSON);
}

function parseNDJSON(lines) {
  // Parse each line as JSON and store it in the dogDrawings array
  for (let line of lines) {
    try {
      let drawing = JSON.parse(line);
      dogDrawings.push(drawing);
    } catch (error) {
      console.error('Error parsing NDJSON line:', line, error);
    }
  }
}

// Quick Draw animation variables
let currentDrawing;
let currentStrokes;
let animationStartTime;
let animationDuration = 7000; // 5 seconds
let drawingCount = 0;
let allPoints = [];
let drawnPoints = [];
let isDrawing = false;

function setup() {
  adjustCanvasSize();

  // Set the body background color dynamically
  document.body.style.backgroundColor = COLOURS1.COL1;

  // Set the canvas border color dynamically
  let canvasElement = document.querySelector('canvas');
  if (canvasElement) {
    canvasElement.style.borderColor = COLOURS1.COL3;
  }

  // Initialize Quick Draw settings
  strokeWeight(25);
  noFill();

  // Wait for the NDJSON to load before starting
  if (dogDrawings.length > 0) {
    startNewDrawing();
  } else {
    console.error('No drawings loaded from NDJSON file.');
  }
}

function draw() {
  // Remove background to allow drawings to stack
  if (isDrawing && allPoints.length > 0) {
    let elapsed = millis() - animationStartTime;
    let progress = elapsed / animationDuration;

    if (progress >= 1) {
      // Drawing complete, start next one after a brief pause
      if (elapsed > animationDuration + 10) {
        startNewDrawing();
      } else {
        // Draw the complete drawing
        drawAllPoints();
      }
    } else {
      // Animate the drawing
      animateDrawing(progress);
    }
  }
}

function startNewDrawing() {
  // Check if the grid is full
  if (currentRow >= gridRows) {
    currentRow = 0;
    currentCol++;
    if (currentCol >= gridCols) {
      // Reset the canvas and grid when the grid is full
      clear(); // Clear the canvas
      background(COLOURS1.COL1); // Reset the background to the default color
      currentRow = 0;
      currentCol = 0;
      return;
    }
  }

  // Calculate the position and size of the current grid cell
  let cellWidth = width / gridCols;
  let cellHeight = height / gridRows;
  let xOffset = currentCol * cellWidth;
  let yOffset = currentRow * cellHeight;

  // Select random drawing
  currentDrawing = random(dogDrawings);
  currentStrokes = currentDrawing.drawing;

  drawingCount++;
  console.log(`Drawing ${drawingCount}: ${currentDrawing.countrycode}, Recognized: ${currentDrawing.recognized}`);

  // Alternate the color for the new drawing
  currentColorIndex = (currentColorIndex + 1) % drawingColors.length;

  // Process all strokes into a single array of points with timing
  allPoints = [];
  let totalPoints = 0;

  // Count total points across all strokes
  for (let stroke of currentStrokes) {
    if (stroke.length >= 2) {
      totalPoints += stroke[0].length;
    }
  }

  // Convert strokes to points with normalized timing
  let pointCounter = 0;
  for (let stroke of currentStrokes) {
    if (stroke.length >= 2) {
      let xPoints = stroke[0];
      let yPoints = stroke[1];

      for (let i = 0; i < xPoints.length; i++) {
        allPoints.push({
          x: map(xPoints[i], 0, 255, xOffset + cellWidth * 0.1, xOffset + cellWidth * 0.9),
          y: map(yPoints[i], 0, 255, yOffset + cellHeight * 0.1, yOffset + cellHeight * 0.9),
          strokeIndex: allPoints.length > 0 && i === 0 ? allPoints[allPoints.length - 1].strokeIndex + 1 : (allPoints.length === 0 ? 0 : allPoints[allPoints.length - 1].strokeIndex),
          pointIndex: i,
          timing: pointCounter / totalPoints
        });
        pointCounter++;
      }
    }
  }

  drawnPoints = [];
  animationStartTime = millis();
  isDrawing = true;

  // Move to the next grid cell
  currentRow++;
}

function animateDrawing(progress) {
  // Draw points up to current progress
  let targetPoints = floor(progress * allPoints.length);

  if (targetPoints > drawnPoints.length) {
    for (let i = drawnPoints.length; i < targetPoints && i < allPoints.length; i++) {
      drawnPoints.push(allPoints[i]);
    }
  }

  // Interpolate between the last drawn point and the next point for smoothness
  if (drawnPoints.length > 1 && targetPoints < allPoints.length) {
    let lastPoint = drawnPoints[drawnPoints.length - 1];
    let nextPoint = allPoints[targetPoints];

    let interpX = lerp(lastPoint.x, nextPoint.x, progress * allPoints.length - targetPoints);
    let interpY = lerp(lastPoint.y, nextPoint.y, progress * allPoints.length - targetPoints);

    drawnPoints.push({ x: interpX, y: interpY, strokeIndex: nextPoint.strokeIndex });
  }

  // Draw the accumulated strokes
  drawAccumulatedStrokes();
}

function drawAccumulatedStrokes() {
  if (drawnPoints.length === 0) return;

  let currentStrokeIndex = -1;
  let currentStrokePoints = [];

  for (let i = 0; i < drawnPoints.length; i++) {
    let point = drawnPoints[i];

    if (point.strokeIndex !== currentStrokeIndex) {
      // Draw previous stroke if it exists
      if (currentStrokePoints.length > 1) {
        drawStroke(currentStrokePoints);
      }

      // Start new stroke
      currentStrokeIndex = point.strokeIndex;
      currentStrokePoints = [point];
    } else {
      currentStrokePoints.push(point);
    }
  }

  // Draw the final stroke
  if (currentStrokePoints.length > 1) {
    drawStroke(currentStrokePoints);
  } else if (currentStrokePoints.length === 1) {
    // Draw single point
    let p = currentStrokePoints[0];
    circle(p.x, p.y, 3);
  }
}

function drawAllPoints() {
  let currentStrokeIndex = -1;
  let currentStrokePoints = [];

  for (let point of allPoints) {
    if (point.strokeIndex !== currentStrokeIndex) {
      // Draw previous stroke if it exists
      if (currentStrokePoints.length > 1) {
        drawStroke(currentStrokePoints);
      }

      // Start new stroke
      currentStrokeIndex = point.strokeIndex;
      currentStrokePoints = [point];
    } else {
      currentStrokePoints.push(point);
    }
  }

  // Draw the final stroke
  if (currentStrokePoints.length > 1) {
    drawStroke(currentStrokePoints);
  }
}

function drawStroke(points) {
  if (points.length < 2) return;

  beginShape();
  noFill();
  stroke(drawingColors[currentColorIndex]); // Use the current color for the stroke

  // Add the first point twice to ensure the curve starts at the first point
  curveVertex(points[0].x, points[0].y);

  for (let point of points) {
    curveVertex(point.x, point.y);
  }

  // Add the last point twice to ensure the curve ends at the last point
  curveVertex(points[points.length - 1].x, points[points.length - 1].y);

  endShape();
}

function windowResized() {
  // Resize canvas dynamically when the window is resized
  adjustCanvasSize();
}

function adjustCanvasSize() {
  // Calculate dimensions based on both width and height
  let maxWidth = windowWidth;
  let maxHeight = windowHeight;

  // Maintain 4:5 aspect ratio
  let width = maxWidth;
  let height = (width / 4) * 5;

  // If the height exceeds the screen height, adjust based on height
  if (height > maxHeight) {
    height = maxHeight;
    width = (height / 5) * 4;
  }

  resizeCanvas(width, height);
}

function keyPressed() {
  if (key === ' ') {
    // Space bar to clear the canvas and start a new drawing
    clear(); // Clear the canvas
    background(COLOURS1.COL1); // Reset the background to COL1
    startNewDrawing();
  }
}