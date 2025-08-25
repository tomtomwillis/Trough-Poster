// sketch.js (updated for persistent cell drawings)
let dogDrawings = []; // To store parsed drawings from the NDJSON file
let textWords = []; // Array of words for text along path

// Grid and cell management
const gridRows = CONFIG.GRID.ROWS;
const gridCols = CONFIG.GRID.COLS;
let cells = []; // Array to store cell states
let activeCell = null; // Currently animating cell
let nextCellIndex = 0; // Track which cell should be drawn next

// Animation timing
let jiggleTime = 0; // Global time tracker for jiggle animation

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

function setup() {
  adjustCanvasSize();

  // Set the body background color dynamically
  document.body.style.backgroundColor = CONFIG.COLORS.BACKGROUND;

  // Set the canvas border color dynamically
  let canvasElement = document.querySelector('canvas');
  if (canvasElement) {
    canvasElement.style.borderColor = CONFIG.COLORS.BORDER;
  }

  // Initialize Quick Draw settings
  strokeWeight(CONFIG.ANIMATION.STROKE_WEIGHT);
  noFill();
  
  // Parse text content into words
  textWords = CONFIG.TEXT.CONTENT.split(' ');

  // Initialize grid cells
  initializeCells();

  // Set initial background
  background(CONFIG.COLORS.BACKGROUND);
  
  // Draw debug grid if enabled
  if (CONFIG.DEBUG.SHOW_CELL_BORDERS) {
    drawGridBorders();
  }

  // Populate all cells with drawings
  if (dogDrawings.length > 0) {
    populateAllCells(); // Populate all cells in a "complete" state
    nextCellIndex = 0; // Reset the cell index for animation
    startNextCellDrawing(); // Start animating the first cell
  } else {
    console.error('No drawings loaded from NDJSON file.');
  }
}

function initializeCells() {
  cells = [];
  let cellWidth = width / gridCols;
  let cellHeight = height / gridRows;
  
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      cells.push({
        row: row,
        col: col,
        x: col * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
        state: 'empty', // 'empty', 'animating', 'complete'
        drawing: null,
        allPoints: [],
        livePoints: [],
        textPositions: [],
        animationStartTime: 0
      });
    }
  }
}

function draw() {
  // Update global jiggle time
  jiggleTime = millis();
  
  // Update active cell animation
  if (activeCell && activeCell.state === 'animating') {
    updateActiveCell();
  }
  
  // Draw all cells that have content
  for (let cell of cells) {
    if (cell.state !== 'empty') {
      drawCell(cell);
    }
  }
  
  // Show FPS if debug enabled
  if (CONFIG.DEBUG.SHOW_FPS) {
    fill(255);
    noStroke();
    text(`FPS: ${Math.round(frameRate())}`, 10, 20);
  }
}

function updateActiveCell() {
  if (!activeCell || activeCell.state !== 'animating') return;
  
  let elapsed = millis() - activeCell.animationStartTime;
  let progress = elapsed / CONFIG.ANIMATION.DURATION;

  if (progress >= 1) {
    // Animation complete
    activeCell.state = 'complete';
    updateAllLivePoints(activeCell);
    activeCell = null; // Clear active cell
    
    // Start next drawing after pause
    setTimeout(() => {
      startNextCellDrawing();
    }, CONFIG.ANIMATION.PAUSE_BETWEEN_DRAWINGS);
  } else {
    // Continue animation
    updateLivePoints(activeCell, progress);
  }
}

function drawCell(cell) {
  if (cell.state === 'empty') return;

  // Clear this cell's area before redrawing
  clearCell(cell);

  // Always update jiggle for all cells (including completed ones)
  updateJiggle(cell);

  // Draw the current points and lines
  drawLivePoints(cell);

  // Draw text at points
  drawTextAtPoints(cell);
}

function clearCell(cell) {
  noStroke();
  fill(CONFIG.COLORS.BACKGROUND);
  rect(cell.x, cell.y, cell.width, cell.height);
}

function startNextCellDrawing() {
  // Don't start a new drawing if one is already active
  if (activeCell && activeCell.state === 'animating') {
    return;
  }
  
  // Get the next cell in sequence
  let nextCell = cells[nextCellIndex % cells.length];
  
  // Reset and setup the cell
  nextCell.state = 'empty';
  nextCell.drawing = null;
  nextCell.allPoints = [];
  nextCell.livePoints = [];
  nextCell.textPositions = [];
  
  // Set up new drawing
  setupCellDrawing(nextCell);
  activeCell = nextCell;
  
  // Move to next cell for the following drawing
  nextCellIndex = (nextCellIndex + 1) % cells.length;
}

function findNextEmptyCell() {
  return cells.find(cell => cell.state === 'empty');
}

function resetAllCells() {
  for (let cell of cells) {
    cell.state = 'empty';
    cell.drawing = null;
    cell.allPoints = [];
    cell.livePoints = [];
    cell.textPositions = [];
  }
}

function setupCellDrawing(cell) {
  // Select random drawing
  cell.drawing = random(dogDrawings);
  let currentStrokes = cell.drawing.drawing;

  if (CONFIG.DEBUG.LOG_DRAWINGS) {
    console.log(`Drawing in cell ${cell.row},${cell.col}: ${cell.drawing.countrycode}, Recognized: ${cell.drawing.recognized}`);
  }

  // Calculate drawing area within cell (with padding)
  let padding = cell.width * CONFIG.GRID.CELL_PADDING;
  let drawLeft = cell.x + padding;
  let drawTop = cell.y + padding;
  let drawWidth = cell.width - 2 * padding;
  let drawHeight = cell.height - 2 * padding;

  // Process all strokes into points
  cell.allPoints = [];
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
        cell.allPoints.push({
          x: map(xPoints[i], 0, 255, drawLeft, drawLeft + drawWidth),
          y: map(yPoints[i], 0, 255, drawTop, drawTop + drawHeight),
          strokeIndex: cell.allPoints.length > 0 && i === 0 ? cell.allPoints[cell.allPoints.length - 1].strokeIndex + 1 : (cell.allPoints.length === 0 ? 0 : cell.allPoints[cell.allPoints.length - 1].strokeIndex),
          pointIndex: i,
          globalPointIndex: pointCounter,
          timing: pointCounter / totalPoints
        });
        pointCounter++;
      }
    }
  }

  // Initialize cell animation state
  cell.livePoints = [];
  cell.textPositions = [];
  cell.animationStartTime = millis();
  cell.state = 'animating';
}

function updateLivePoints(cell, progress) {
  // Update which points are currently active based on progress
  let targetPoints = floor(progress * cell.allPoints.length);
  
  // Ensure we have enough live points
  while (cell.livePoints.length < targetPoints && cell.livePoints.length < cell.allPoints.length) {
    let point = cell.allPoints[cell.livePoints.length];
    cell.livePoints.push({
      originalX: point.x,
      originalY: point.y,
      strokeIndex: point.strokeIndex,
      globalPointIndex: point.globalPointIndex
    });
  }
  
  // Update jiggle for all live points
  updateJiggle(cell);
}

function updateAllLivePoints(cell) {
  // Ensure all points are in livePoints
  if (cell.livePoints.length < cell.allPoints.length) {
    for (let i = cell.livePoints.length; i < cell.allPoints.length; i++) {
      let point = cell.allPoints[i];
      cell.livePoints.push({
        originalX: point.x,
        originalY: point.y,
        strokeIndex: point.strokeIndex,
        globalPointIndex: point.globalPointIndex
      });
    }
  }
  
  // Update jiggle for all points
  updateJiggle(cell);
}

function updateJiggle(cell) {
  // Update jiggle for all live points in this cell
  for (let i = 0; i < cell.livePoints.length; i++) {
    let point = cell.livePoints[i];
    let jiggled = applyJiggle(point.originalX, point.originalY, point.globalPointIndex);
    point.x = jiggled.x;
    point.y = jiggled.y;
  }
}

function applyJiggle(x, y, pointIndex, scale = 1) {
  // Create unique jiggle patterns for each point using different phase offsets
  let xOffset = pointIndex * CONFIG.JIGGLE.X_PHASE_OFFSET;
  let yOffset = pointIndex * CONFIG.JIGGLE.Y_PHASE_OFFSET;
  
  // Apply sine waves with different frequencies for more organic movement
  let jiggleX = scale * (sin(jiggleTime * CONFIG.JIGGLE.SPEED + xOffset) * CONFIG.JIGGLE.AMPLITUDE * 0.7 + 
                cos(jiggleTime * CONFIG.JIGGLE.SPEED * CONFIG.JIGGLE.X_FREQUENCY_2 + xOffset * 2) * CONFIG.JIGGLE.AMPLITUDE * 0.3);
  let jiggleY = scale * (cos(jiggleTime * CONFIG.JIGGLE.SPEED + yOffset) * CONFIG.JIGGLE.AMPLITUDE * 0.6 + 
                sin(jiggleTime * CONFIG.JIGGLE.SPEED * CONFIG.JIGGLE.Y_FREQUENCY_2 + yOffset * 1.5) * CONFIG.JIGGLE.AMPLITUDE * 0.4);
  
  return {
    x: x + jiggleX,
    y: y + jiggleY
  };
}

function drawLivePoints(cell) {
  if (cell.livePoints.length === 0) return;
  
  // Draw connecting lines between points in the same stroke
  let currentStrokeIndex = -1;
  let strokePoints = [];
  
  for (let point of cell.livePoints) {
    if (point.strokeIndex !== currentStrokeIndex) {
      // Draw previous stroke if it exists
      if (strokePoints.length > 1) {
        drawConnectingLines(strokePoints);
      }
      
      // Start new stroke
      currentStrokeIndex = point.strokeIndex;
      strokePoints = [point];
    } else {
      strokePoints.push(point);
    }
  }
  
  // Draw the final stroke
  if (strokePoints.length > 1) {
    drawConnectingLines(strokePoints);
  }
  
  // Draw individual points
  fill(CONFIG.COLORS.POINTS);
  noStroke();
  for (let point of cell.livePoints) {
    ellipse(point.x, point.y, CONFIG.ANIMATION.POINT_SIZE);
  }
}

function drawConnectingLines(points) {
  if (points.length < 2) return;

  stroke(CONFIG.COLORS.DRAWING);
  strokeWeight(CONFIG.ANIMATION.STROKE_WEIGHT);
  noFill();

  beginShape();
  for (let i = 0; i < points.length - 1; i++) {
    let pointA = points[i];
    let pointB = points[i + 1];

    // Add the first point for curve fitting
    if (i === 0) {
      curveVertex(pointA.x, pointA.y);
    }

    // Interpolate additional points between pointA and pointB for smoother curves
    for (let t = 0; t <= 1; t += 1 / CONFIG.ANIMATION.CURVE_SMOOTHING_STEPS) {
      let x = lerp(pointA.x, pointB.x, t);
      let y = lerp(pointA.y, pointB.y, t);
      curveVertex(x, y);
    }
  }

  // Add the last point twice for curve fitting
  let lastPoint = points[points.length - 1];
  curveVertex(lastPoint.x, lastPoint.y);
  curveVertex(lastPoint.x, lastPoint.y);
  endShape();
}

function drawTextAlongPath(cell, progress) {
    if (cell.livePoints.length < 2) return;
    
    // Use the current jiggled positions for text placement
    let pathPoints = [];
    let currentStrokeIndex = -1;
    let strokePoints = [];
    
    // Collect all path points in order (using current jiggled positions)
    for (let point of cell.livePoints) {
      if (point.strokeIndex !== currentStrokeIndex) {
        if (strokePoints.length > 1) {
          pathPoints = pathPoints.concat(strokePoints);
        }
        currentStrokeIndex = point.strokeIndex;
        strokePoints = [point];
      } else {
        strokePoints.push(point);
      }
    }
    if (strokePoints.length > 1) {
      pathPoints = pathPoints.concat(strokePoints);
    }
    
    if (pathPoints.length < 2) return;
    
    // Calculate cumulative distances along path (using jiggled positions)
    let distances = [0];
    let totalLength = 0;
    for (let i = 1; i < pathPoints.length; i++) {
      let d = dist(pathPoints[i-1].x, pathPoints[i-1].y, pathPoints[i].x, pathPoints[i].y);
      totalLength += d;
      distances.push(totalLength);
    }
    
    if (totalLength < CONFIG.TEXT.LETTER_SPACING) return;
    
    // Set up text rendering
    textAlign(CENTER, CENTER);
    textSize(CONFIG.TEXT.FONT_SIZE);
    fill(red(CONFIG.COLORS.TEXT), green(CONFIG.COLORS.TEXT), blue(CONFIG.COLORS.TEXT), CONFIG.TEXT.OPACITY);
    noStroke();
    
    let textProgress = (progress - CONFIG.TEXT.ANIMATION_DELAY) / (1 - CONFIG.TEXT.ANIMATION_DELAY);
    textProgress = constrain(textProgress, 0, 1);
    
    let maxDistance = totalLength * textProgress;
    let distance = 0;
    let wordIndex = 0;
    let letterIndex = 0;
    
    // Place text along the path
    while (distance < maxDistance && wordIndex < textWords.length) {
      let currentWord = textWords[wordIndex];
      
      // Check if we've reached the end of the current word
      if (letterIndex >= currentWord.length) {
        // Move to next word
        wordIndex++;
        letterIndex = 0;
        // Add extra spacing between words
        distance += CONFIG.TEXT.WORD_SPACING;
        continue;
      }
      
      // Find position along the path for this letter
      let position = getPositionAtDistance(pathPoints, distances, distance);
      if (position) {
        let letter = currentWord.charAt(letterIndex);
        
        // Calculate perpendicular offset
        let angle = position.angle;
        let offsetX = sin(angle) * CONFIG.TEXT.OFFSET_FROM_LINE;
        let offsetY = -cos(angle) * CONFIG.TEXT.OFFSET_FROM_LINE;
        
        // Apply reduced jiggle for text
        let jiggledPosition = applyJiggle(position.x, position.y, letterIndex, CONFIG.JIGGLE.TEXT_JIGGLE_SCALE);
        
        push();
        translate(jiggledPosition.x + offsetX, jiggledPosition.y + offsetY);
        rotate(angle);
        text(letter, 0, 0);
        pop();
      }
      
      // Move to next letter
      letterIndex++;
      distance += CONFIG.TEXT.LETTER_SPACING;
    }
}

function getPositionAtDistance(pathPoints, distances, targetDistance) {
  // Find the segment that contains the target distance
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= targetDistance) {
      let segmentStart = distances[i-1];
      let segmentEnd = distances[i];
      let segmentLength = segmentEnd - segmentStart;
      
      if (segmentLength === 0) continue;
      
      let t = (targetDistance - segmentStart) / segmentLength;
      let pointA = pathPoints[i-1];
      let pointB = pathPoints[i];
      
      return {
        x: lerp(pointA.x, pointB.x, t),
        y: lerp(pointA.y, pointB.y, t),
        angle: atan2(pointB.y - pointA.y, pointB.x - pointA.x)
      };
    }
  }
  return null;
}

function drawGridBorders() {
  stroke(CONFIG.COLORS.BORDER);
  strokeWeight(1);
  noFill();
  
  let cellWidth = width / gridCols;
  let cellHeight = height / gridRows;
  
  for (let row = 0; row <= gridRows; row++) {
    line(0, row * cellHeight, width, row * cellHeight);
  }
  
  for (let col = 0; col <= gridCols; col++) {
    line(col * cellWidth, 0, col * cellWidth, height);
  }
}

function windowResized() {
  // Resize canvas dynamically when the window is resized
  adjustCanvasSize();
  
  // Reinitialize cells with new dimensions
  initializeCells();
  
  // Redraw background
  background(CONFIG.COLORS.BACKGROUND);
  
  if (CONFIG.DEBUG.SHOW_CELL_BORDERS) {
    drawGridBorders();
  }
}

function adjustCanvasSize() {
  // Calculate dimensions based on both width and height
  let maxWidth = windowWidth;
  let maxHeight = windowHeight;

  // Maintain aspect ratio from config
  let width = maxWidth;
  let height = (width / CONFIG.CANVAS.ASPECT_RATIO.WIDTH) * CONFIG.CANVAS.ASPECT_RATIO.HEIGHT;

  // If the height exceeds the screen height, adjust based on height
  if (height > maxHeight) {
    height = maxHeight;
    width = (height / CONFIG.CANVAS.ASPECT_RATIO.HEIGHT) * CONFIG.CANVAS.ASPECT_RATIO.WIDTH;
  }

  resizeCanvas(width, height);
}

function keyPressed() {
  if (key === ' ') {
    // Space bar to clear all cells and start over
    background(CONFIG.COLORS.BACKGROUND);
    resetAllCells();
    nextCellIndex = 0; // Reset cell cycling
    if (CONFIG.DEBUG.SHOW_CELL_BORDERS) {
      drawGridBorders();
    }
    startNextCellDrawing();
  }
}

function populateAllCells() {
  for (let cell of cells) {
    setupCellDrawing(cell);
    cell.state = 'complete'; // Mark the cell as complete
    updateAllLivePoints(cell); // Ensure all points are added
  }
}

function drawTextAtPoints(cell) {
  if (cell.livePoints.length === 0) return;

  // Set up text rendering
  textAlign(CENTER, CENTER);
  textSize(CONFIG.TEXT.FONT_SIZE);
  fill(red(CONFIG.COLORS.TEXT), green(CONFIG.COLORS.TEXT), blue(CONFIG.COLORS.TEXT), CONFIG.TEXT.OPACITY);
  noStroke();

  let letterIndex = 0;

  // Iterate through all live points and draw letters
  for (let point of cell.livePoints) {
    let letter = textWords[letterIndex % textWords.length]; // Cycle through the words
    text(letter, point.x, point.y); // Draw the letter at the point's position
    letterIndex++;
  }
}