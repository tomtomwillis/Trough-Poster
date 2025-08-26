// sketch.js (corrected version with Rectangle Drawing Mode)
let dogDrawings = []; // To store parsed drawings from the NDJSON file
let textWords = []; // Array of words for text along path
let displacementTexture;
let texturePixels = [];
let textureWidth = 0;
let textureHeight = 0;

// Grid and cell management
const gridRows = CONFIG.GRID.ROWS;
const gridCols = CONFIG.GRID.COLS;
let cells = []; // Array to store cell states
let activeCell = null; // Currently animating cell
let nextCellIndex = 0; // Track which cell should be drawn next

// Custom cell drawing variables
let isDrawingCell = false;
let startX, startY;
let currentCustomCell = null;

// NEW: Rectangle Drawing Mode variables
let exclusionRectangles = []; // Array to store drawn rectangles
let isDrawingRectangle = false;
let rectangleStartX, rectangleStartY;
let currentRectangle = null;
let blockedCells = new Set(); // Set of cell indices that are blocked
let showRectangles = false; // Toggle for rectangle visibility

// Animation timing
let jiggleTime = 0; // Global time tracker for jiggle animation

function preload() {
  // Load the NDJSON file as an array of strings (one string per line)
  let ndjsonLines = loadStrings('datasets/dog.ndjson', parseNDJSON);
  
  // Load displacement texture if enabled
  if (CONFIG.TEXTURE_DISPLACEMENT && CONFIG.TEXTURE_DISPLACEMENT.ENABLED) {
    displacementTexture = loadImage('images/point_displace.png', processTexture);
  }
}

// Add this function to process the texture
function processTexture(img) {
  displacementTexture = img;
  textureWidth = img.width;
  textureHeight = img.height;
  
  // Load pixel data for faster access
  img.loadPixels();
  texturePixels = img.pixels;
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

  // NEW: Initialize rectangle exclusion system
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
    showRectangles = CONFIG.RECTANGLE_EXCLUSION.SHOW_RECTANGLES;
    console.log('Rectangle exclusion mode enabled. Click and drag to draw exclusion rectangles.');
    console.log('Press R to clear rectangles, V to toggle visibility');
  }

  // Only auto-populate if not in custom cell mode
  if (!CONFIG.MODES.CUSTOM_CELLS && dogDrawings.length > 0) {
    populateAllCells(); // Populate all cells in a "complete" state
    nextCellIndex = 0; // Reset the cell index for animation

    // Start animating the first cell without resetting to 'empty'
    setTimeout(() => {
      startNextCellDrawing();
    }, CONFIG.ANIMATION.PAUSE_BETWEEN_DRAWINGS);
  } else if (dogDrawings.length === 0) {
    console.error('No drawings loaded from NDJSON file.');
  }
}

function initializeCells() {
  cells = [];
  
  // Only create grid cells if not in custom cell mode
  if (!CONFIG.MODES.CUSTOM_CELLS) {
    let drawableHeight = height - CONFIG.GRID.TOP_PADDING - CONFIG.GRID.BOTTOM_PADDING;
    let cellWidth = width / gridCols;
    let cellHeight = drawableHeight / gridRows;
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        cells.push({
          row: row,
          col: col,
          x: col * cellWidth,
          y: row * cellHeight + CONFIG.GRID.TOP_PADDING,
          width: cellWidth,
          height: cellHeight,
          state: 'empty', // 'empty', 'animating', 'complete'
          drawing: null,
          allPoints: [],
          livePoints: [],
          textPositions: [],
          animationStartTime: 0,
          cellIndex: row * gridCols + col // NEW: Add cell index for blocking
        });
      }
    }
  }
  
  // NEW: Update blocked cells after initialization
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
    updateBlockedCells();
  }
}

function draw() {
  // Update global jiggle time
  jiggleTime = millis();
  
  // Draw displacement texture if enabled for debugging
  if (CONFIG.TEXTURE_DISPLACEMENT && CONFIG.TEXTURE_DISPLACEMENT.SHOW_TEXTURE && displacementTexture) {
    image(displacementTexture, 0, 0, width, height);
  }
  
  // Update active cell animation
  if (activeCell && activeCell.state === 'animating') {
    updateActiveCell();
  }
  
  // Draw all cells that have content (skip blocked cells only if rectangle exclusion is enabled)
  for (let cell of cells) {
    if (cell.state !== 'empty') {
      let isBlocked = CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
                     blockedCells.has(cell.cellIndex);
      if (!isBlocked) {
        drawCell(cell);
      }
    }
  }
  
  // NEW: Draw exclusion rectangles if enabled and visible
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && showRectangles) {
    drawExclusionRectangles();
  }
  
  // NEW: Draw current rectangle being drawn
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && isDrawingRectangle && currentRectangle) {
    drawCurrentRectangle();
  }
  
  // Draw current custom cell if in drawing mode
  if (CONFIG.MODES.CUSTOM_CELLS && isDrawingCell && currentCustomCell) {
    drawCustomCellPreview();
  }
  
  // NEW: Draw blocked cell indicators if debug enabled
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && CONFIG.DEBUG.SHOW_CELL_BORDERS) {
    drawBlockedCellIndicators();
  }
  
  // Show FPS if debug enabled
  if (CONFIG.DEBUG.SHOW_FPS) {
    fill(255);
    noStroke();
    text(`FPS: ${Math.round(frameRate())}`, 10, 20);
    
    // NEW: Show rectangle count
    if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
      text(`Rectangles: ${exclusionRectangles.length}`, 10, 40);
      text(`Blocked Cells: ${blockedCells.size}`, 10, 60);
    }
  }
}

// NEW: Function to draw exclusion rectangles
function drawExclusionRectangles() {
  if (!CONFIG.RECTANGLE_EXCLUSION || !CONFIG.RECTANGLE_EXCLUSION.ENABLED) return;
  
  let rectColor = CONFIG.RECTANGLE_EXCLUSION.RECTANGLE_COLOR;
  fill(rectColor[0], rectColor[1], rectColor[2], rectColor[3]);
  stroke(rectColor[0], rectColor[1], rectColor[2], 255);
  strokeWeight(CONFIG.RECTANGLE_EXCLUSION.STROKE_WIDTH);
  
  for (let rect of exclusionRectangles) {
    rect(rect.x, rect.y, rect.width, rect.height);
  }
}
  
// NEW: Function to draw current rectangle being drawn
function drawCurrentRectangle() {
  if (!currentRectangle) return;
  
  let rectColor = CONFIG.RECTANGLE_EXCLUSION.RECTANGLE_COLOR;
  fill(rectColor[0], rectColor[1], rectColor[2], rectColor[3] * 0.5); // Semi-transparent
  stroke(rectColor[0], rectColor[1], rectColor[2], 128);
  strokeWeight(CONFIG.RECTANGLE_EXCLUSION.STROKE_WIDTH);
  
  rect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
}

// NEW: Function to draw blocked cell indicators
function drawBlockedCellIndicators() {
  fill(255, 0, 0, 50);
  noStroke();
  
  for (let cellIndex of blockedCells) {
    let cell = cells[cellIndex];
    if (cell) {
      rect(cell.x, cell.y, cell.width, cell.height);
    }
  }
}

// Function to draw custom cell preview
function drawCustomCellPreview() {
  stroke(CONFIG.COLORS.CUSTOM_CELL);
  strokeWeight(CONFIG.INTERACTIVITY.CUSTOM_CELL_STROKE);
  noFill();
  rect(
    currentCustomCell.x, 
    currentCustomCell.y, 
    currentCustomCell.width, 
    currentCustomCell.height
  );
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

  let nextCell;

  if (CONFIG.GRID.RANDOM_REDRAW) {
    // Select a random cell that's not blocked
    const availableCells = cells.filter(cell => {
      let isBlocked = CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
                     blockedCells.has(cell.cellIndex);
      return cell.state === 'empty' && !isBlocked;
    });
    
    if (availableCells.length > 0) {
      nextCell = random(availableCells);
    } else {
      // If no empty unblocked cells, pick a random unblocked cell and reset it
      const unblockedCells = cells.filter(cell => {
        let isBlocked = CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
                       blockedCells.has(cell.cellIndex);
        return !isBlocked;
      });
      if (unblockedCells.length > 0) {
        nextCell = random(unblockedCells);
      } else {
        // All cells are blocked, skip drawing
        return;
      }
    }
  } else {
    // Select the next cell sequentially, skipping blocked cells
    let attempts = 0;
    do {
      nextCell = cells[nextCellIndex % cells.length];
      nextCellIndex = (nextCellIndex + 1) % cells.length;
      attempts++;
      
      // Prevent infinite loop if all cells are blocked
      if (attempts >= cells.length) {
        console.log('All cells are blocked by exclusion rectangles');
        return;
      }
      
      let isBlocked = CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
                     blockedCells.has(nextCell.cellIndex);
    } while (isBlocked);
  }

  // Reset and setup the cell
  nextCell.state = 'empty';
  nextCell.drawing = null;
  nextCell.allPoints = [];
  nextCell.livePoints = [];
  nextCell.textPositions = [];

  // Set up new drawing
  setupCellDrawing(nextCell);
  activeCell = nextCell;
}

function findNextEmptyCell() {
  return cells.find(cell => {
    let isBlocked = CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
                   blockedCells.has(cell.cellIndex);
    return cell.state === 'empty' && !isBlocked;
  });
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
  // Filter drawings based on the "recognized" tag
  const recognizedDrawings = dogDrawings.filter(drawing => drawing.recognized);
  const unrecognizedDrawings = dogDrawings.filter(drawing => !drawing.recognized);

  // Decide whether to pick a recognized drawing based on the configured probability
  const useRecognized = random() < CONFIG.DRAWING_SELECTION.RECOGNIZED_PROBABILITY;

  // Select a drawing based on the decision
  if (useRecognized && recognizedDrawings.length > 0) {
    cell.drawing = random(recognizedDrawings);
  } else if (unrecognizedDrawings.length > 0) {
    cell.drawing = random(unrecognizedDrawings);
  } else {
    // Fallback to any drawing if one of the lists is empty
    cell.drawing = random(dogDrawings);
  }

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

// NEW: Calculate repulsion force from blocked cells
function calculateBlockedCellRepulsion(x, y) {
  let totalRepulsionX = 0;
  let totalRepulsionY = 0;

  for (let cellIndex of blockedCells) {
    let cell = cells[cellIndex];
    if (!cell) continue;

    // Find the closest point on the cell to the particle
    let closestX = constrain(x, cell.x, cell.x + cell.width);
    let closestY = constrain(y, cell.y, cell.y + cell.height);

    // Calculate the distance to the closest point
    let distance = dist(x, y, closestX, closestY);

    // Apply repulsion if within the radius
    if (distance < CONFIG.BLOCKED_CELL_REPULSION.REPEL_RADIUS && distance > 0) {
      // Use an inverse-square law for the repulsion strength
      let repelStrength = CONFIG.BLOCKED_CELL_REPULSION.REPEL_STRENGTH / (distance ** CONFIG.BLOCKED_CELL_REPULSION.REPEL_DECAY);

      // Cap the repulsion strength to avoid extreme values
      repelStrength = min(repelStrength, CONFIG.BLOCKED_CELL_REPULSION.REPEL_STRENGTH);

      // Calculate the direction away from the closest point
      let angle = atan2(y - closestY, x - closestX);

      totalRepulsionX += cos(angle) * repelStrength;
      totalRepulsionY += sin(angle) * repelStrength;
    }
  }

  return { x: totalRepulsionX, y: totalRepulsionY };
}

// Update the `updateJiggle` function to include blocked cell repulsion
function updateJiggle(cell) {
  for (let i = 0; i < cell.livePoints.length; i++) {
    let point = cell.livePoints[i];
    let jiggled = applyJiggle(point.originalX, point.originalY, point.globalPointIndex);

    // Add mouse repulsion effect
    let mouseDist = dist(mouseX, mouseY, jiggled.x, jiggled.y);
    if (mouseDist < CONFIG.INTERACTIVITY.MOUSE_REPEL_RADIUS) {
      let repelForce = CONFIG.INTERACTIVITY.REPEL_FORCE * (1 - mouseDist / CONFIG.INTERACTIVITY.MOUSE_REPEL_RADIUS);
      let angle = atan2(jiggled.y - mouseY, jiggled.x - mouseX);
      jiggled.x += cos(angle) * repelForce;
      jiggled.y += sin(angle) * repelForce;
    }

    // NEW: Add blocked cell repulsion effect
    if (CONFIG.BLOCKED_CELL_REPULSION.ENABLED) {
      let cellRepulsion = calculateBlockedCellRepulsion(jiggled.x, jiggled.y);
      jiggled.x += cellRepulsion.x;
      jiggled.y += cellRepulsion.y;
    }

    point.x = jiggled.x;
    point.y = jiggled.y;
  }
}

function updateJiggle(cell) {
  // Update jiggle for all live points in this cell
  for (let i = 0; i < cell.livePoints.length; i++) {
    let point = cell.livePoints[i];
    let jiggled = applyJiggle(point.originalX, point.originalY, point.globalPointIndex);

    // Add mouse repulsion effect
    let mouseDist = dist(mouseX, mouseY, jiggled.x, jiggled.y);
    if (mouseDist < CONFIG.INTERACTIVITY.MOUSE_REPEL_RADIUS) {
      let repelForce = CONFIG.INTERACTIVITY.REPEL_FORCE * (1 - mouseDist / CONFIG.INTERACTIVITY.MOUSE_REPEL_RADIUS);
      let angle = atan2(jiggled.y - mouseY, jiggled.x - mouseX);
      jiggled.x += cos(angle) * repelForce;
      jiggled.y += sin(angle) * repelForce;
    }

    // NEW: Add rectangle repulsion effect
    if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && exclusionRectangles.length > 0) {
      let rectangleRepulsion = calculateRectangleRepulsion(jiggled.x, jiggled.y);
      jiggled.x += rectangleRepulsion.x;
      jiggled.y += rectangleRepulsion.y;
    }

    point.x = jiggled.x;
    point.y = jiggled.y;
  }
}

// NEW: Calculate repulsion force from rectangles
function calculateRectangleRepulsion(x, y) {
  let totalRepulsionX = 0;
  let totalRepulsionY = 0;
  
  for (let rect of exclusionRectangles) {
    let repulsion = getRepulsionFromRectangle(x, y, rect);
    totalRepulsionX += repulsion.x;
    totalRepulsionY += repulsion.y;
  }
  
  return { x: totalRepulsionX, y: totalRepulsionY };
}

// NEW: Calculate repulsion force from a single rectangle
function getRepulsionFromRectangle(x, y, rect) {
  // Find the closest point on the rectangle to the particle
  let closestX = constrain(x, rect.x, rect.x + rect.width);
  let closestY = constrain(y, rect.y, rect.y + rect.height);

  // Calculate the distance to the closest point
  let distance = dist(x, y, closestX, closestY);

  // Apply repulsion if within the radius
  if (distance < CONFIG.RECTANGLE_EXCLUSION.REPEL_RADIUS && distance > 0) {
    // Use an inverse-square law for the repulsion strength
    let repelStrength = CONFIG.RECTANGLE_EXCLUSION.REPEL_STRENGTH / (distance * distance);

    // Cap the repulsion strength to avoid extreme values
    repelStrength = min(repelStrength, CONFIG.RECTANGLE_EXCLUSION.REPEL_STRENGTH);

    // Calculate the direction away from the closest point
    let angle = atan2(y - closestY, x - closestX);

    return {
      x: cos(angle) * repelStrength,
      y: sin(angle) * repelStrength
    };
  }

  return { x: 0, y: 0 };
}

// Replace the applyJiggle function with this enhanced version
function applyJiggle(x, y, pointIndex, scale = 1) {
  // Create unique jiggle patterns for each point using different phase offsets
  let xOffset = pointIndex * CONFIG.JIGGLE.X_PHASE_OFFSET;
  let yOffset = pointIndex * CONFIG.JIGGLE.Y_PHASE_OFFSET;
  
  // Apply sine waves with different frequencies for more organic movement
  let jiggleX = scale * (sin(jiggleTime * CONFIG.JIGGLE.SPEED + xOffset) * CONFIG.JIGGLE.AMPLITUDE * 0.7 + 
                cos(jiggleTime * CONFIG.JIGGLE.SPEED * CONFIG.JIGGLE.X_FREQUENCY_2 + xOffset * 2) * CONFIG.JIGGLE.AMPLITUDE * 0.3);
  let jiggleY = scale * (cos(jiggleTime * CONFIG.JIGGLE.SPEED + yOffset) * CONFIG.JIGGLE.AMPLITUDE * 0.6 + 
                sin(jiggleTime * CONFIG.JIGGLE.SPEED * CONFIG.JIGGLE.Y_FREQUENCY_2 + yOffset * 1.5) * CONFIG.JIGGLE.AMPLITUDE * 0.4);
  
  // Apply texture displacement if enabled
  let displacedX = x + jiggleX;
  let displacedY = y + jiggleY;
  
  if (CONFIG.TEXTURE_DISPLACEMENT && CONFIG.TEXTURE_DISPLACEMENT.ENABLED && displacementTexture && texturePixels.length > 0) {
    const displacement = getTextureDisplacement(displacedX, displacedY);
    displacedX += displacement.x;
    displacedY += displacement.y;
  }
  
  return {
    x: displacedX,
    y: displacedY
  };
}

// Add this function to calculate texture-based displacement
function getTextureDisplacement(x, y) {
  // Calculate texture coordinates (normalized)
  const texX = constrain(x / width, 0, 1);
  const texY = constrain(y / height, 0, 1);
  
  // Get pixel position in texture
  const pixelX = floor(texX * (textureWidth - 1));
  const pixelY = floor(texY * (textureHeight - 1));
  const pixelIndex = (pixelY * textureWidth + pixelX) * 4;
  
  // Get pixel brightness (average of RGB)
  const r = texturePixels[pixelIndex];
  const g = texturePixels[pixelIndex + 1];
  const b = texturePixels[pixelIndex + 2];
  const brightness = (r + g + b) / 3;
  
  // Calculate displacement strength based on darkness
  let strength = 0;
  if (brightness <= CONFIG.TEXTURE_DISPLACEMENT.BLACK_THRESHOLD) {
    // Map from [0, threshold] to [maxStrength, 0]
    strength = map(brightness, 0, CONFIG.TEXTURE_DISPLACEMENT.BLACK_THRESHOLD, 
                  CONFIG.TEXTURE_DISPLACEMENT.DISPLACEMENT_STRENGTH, 0);
    
    if (CONFIG.TEXTURE_DISPLACEMENT.INVERT) {
      strength = -strength;
    }
  }
  
  // Create random displacement direction
  const angle = random(TWO_PI);
  
  return {
    x: cos(angle) * strength,
    y: sin(angle) * strength
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
  
  // NEW: Update blocked cells after window resize
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
    updateBlockedCells();
  }
}

function adjustCanvasSize() {
  // Calculate dimensions based on both width and height
  let maxWidth = windowWidth;
  let maxHeight = windowHeight;

  // Maintain aspect ratio from config
  let canvasWidth = maxWidth;
  let canvasHeight = (canvasWidth / CONFIG.CANVAS.ASPECT_RATIO.WIDTH) * CONFIG.CANVAS.ASPECT_RATIO.HEIGHT;

  // If the height exceeds the screen height, adjust based on height
  if (canvasHeight > maxHeight) {
    canvasHeight = maxHeight;
    canvasWidth = (canvasHeight / CONFIG.CANVAS.ASPECT_RATIO.HEIGHT) * CONFIG.CANVAS.ASPECT_RATIO.WIDTH;
  }

  resizeCanvas(canvasWidth, canvasHeight);
}

// NEW: Rectangle exclusion system functions
function updateBlockedCells() {
  if (!CONFIG.RECTANGLE_EXCLUSION || !CONFIG.RECTANGLE_EXCLUSION.ENABLED || exclusionRectangles.length === 0) {
    blockedCells.clear();
    return;
  }
  
  blockedCells.clear();
  
  for (let i = 0; i < cells.length; i++) {
    let cell = cells[i];
    let coveragePercentage = calculateCellCoverage(cell);
    
    if (coveragePercentage >= CONFIG.RECTANGLE_EXCLUSION.COVERAGE_THRESHOLD) {
      blockedCells.add(cell.cellIndex);
      
      // Clear the cell's state and content
      cell.state = 'empty';
      cell.drawing = null;
      cell.allPoints = [];
      cell.livePoints = [];
      cell.textPositions = [];
      
      // Reset the background for the cleared cell
      noStroke();
      fill(CONFIG.COLORS.BACKGROUND);
      rect(cell.x, cell.y, cell.width, cell.height);
      
      if (CONFIG.DEBUG.LOG_DRAWINGS) {
        console.log(`Cell ${cell.row},${cell.col} blocked and cleared (${(coveragePercentage * 100).toFixed(1)}% covered)`);
      }
    }
  }
  
  if (CONFIG.DEBUG.LOG_DRAWINGS) {
    console.log(`Updated blocked cells: ${blockedCells.size} cells blocked`);
  }
}

function calculateCellCoverage(cell) {
  let totalCoveredArea = 0;
  let cellArea = cell.width * cell.height;
  
  for (let rect of exclusionRectangles) {
    let intersectionArea = calculateRectangleIntersectionArea(cell, rect);
    totalCoveredArea += intersectionArea;
  }
  
  // Cap at 100% coverage (in case of overlapping rectangles)
  return Math.min(totalCoveredArea / cellArea, 1.0);
}

function calculateRectangleIntersectionArea(rect1, rect2) {
  // Calculate intersection bounds
  let left = Math.max(rect1.x, rect2.x);
  let right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  let top = Math.max(rect1.y, rect2.y);
  let bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
  
  // Check if there's an intersection
  if (left < right && top < bottom) {
    return (right - left) * (bottom - top);
  }
  
  return 0;
}

function clearExclusionRectangles() {
  exclusionRectangles = [];
  updateBlockedCells();
  console.log('All exclusion rectangles cleared');
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
    
    // Only start drawing if not in custom cell mode
    if (!CONFIG.MODES.CUSTOM_CELLS) {
      setTimeout(() => {
        startNextCellDrawing(); // Start animating the first cell after reset
      }, CONFIG.ANIMATION.PAUSE_BETWEEN_DRAWINGS);
    }
  }
  
  // NEW: Rectangle exclusion key controls
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
    if (key === 'r' || key === 'R') {
      clearExclusionRectangles();
    }
    
    if (key === 'v' || key === 'V') {
      showRectangles = !showRectangles;
      console.log(`Rectangle visibility: ${showRectangles ? 'ON' : 'OFF'}`);
    }
  }
}

function populateAllCells() {
  for (let cell of cells) {
    // Only populate cells that aren't blocked
    let isBlocked = CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
                   blockedCells.has(cell.cellIndex);
    if (!isBlocked) {
      setupCellDrawing(cell);
      cell.state = 'complete'; // Mark the cell as complete
      updateAllLivePoints(cell); // Ensure all points are added
    }
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

// Mouse functions for both custom cell drawing and rectangle exclusion
function mousePressed() {
  // NEW: Rectangle exclusion mode takes priority when enabled and not in custom cell mode
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && !CONFIG.MODES.CUSTOM_CELLS) {
    isDrawingRectangle = true;
    rectangleStartX = mouseX;
    rectangleStartY = mouseY;
    currentRectangle = {
      x: rectangleStartX,
      y: rectangleStartY,
      width: 0,
      height: 0
    };
    return;
  }
  
  // Original custom cell drawing mode
  if (CONFIG.MODES.CUSTOM_CELLS) {
    isDrawingCell = true;
    startX = mouseX;
    startY = mouseY;
    currentCustomCell = {
      x: startX,
      y: startY,
      width: 0,
      height: 0
    };
  }
}

function mouseDragged() {
  // NEW: Rectangle exclusion drawing
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && isDrawingRectangle && currentRectangle) {
    currentRectangle.width = mouseX - rectangleStartX;
    currentRectangle.height = mouseY - rectangleStartY;
    return;
  }
  
  // Original custom cell drawing
  if (CONFIG.MODES.CUSTOM_CELLS && isDrawingCell && currentCustomCell) {
    currentCustomCell.width = mouseX - startX;
    currentCustomCell.height = mouseY - startY;
  }
}

function mouseReleased() {
  // NEW: Rectangle exclusion completion
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && isDrawingRectangle && currentRectangle) {
    isDrawingRectangle = false;

    // Ensure positive width and height
    let x = currentRectangle.width < 0 ? rectangleStartX + currentRectangle.width : rectangleStartX;
    let y = currentRectangle.height < 0 ? rectangleStartY + currentRectangle.height : rectangleStartY;
    let w = abs(currentRectangle.width);
    let h = abs(currentRectangle.height);

    // Only add rectangle if it has meaningful size
    if (w > 10 && h > 10) {
      exclusionRectangles.push({
        x: x,
        y: y,
        width: w,
        height: h
      });

      console.log(`Added exclusion rectangle: ${w.toFixed(0)}x${h.toFixed(0)} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      
      // Update blocked cells
      updateBlockedCells();
    }

    currentRectangle = null;
    return;
  }
  
  // Original custom cell drawing completion
  if (CONFIG.MODES.CUSTOM_CELLS && isDrawingCell && currentCustomCell) {
    isDrawingCell = false;

    // Ensure positive width and height
    let x = currentCustomCell.width < 0 ? startX + currentCustomCell.width : startX;
    let y = currentCustomCell.height < 0 ? startY + currentCustomCell.height : startY;
    let w = abs(currentCustomCell.width);
    let h = abs(currentCustomCell.height);

    // Add the custom cell to the cells array
    cells.push({
      x: x,
      y: y,
      width: w,
      height: h,
      state: 'empty', // Will be set to animating when drawing starts
      drawing: null,
      allPoints: [],
      livePoints: [],
      textPositions: [],
      animationStartTime: 0,
      cellIndex: cells.length // Add cell index for consistency
    });

    // Draw the rectangle on the canvas
    stroke(CONFIG.COLORS.CUSTOM_CELL);
    strokeWeight(CONFIG.INTERACTIVITY.CUSTOM_CELL_STROKE);
    noFill();
    rect(x, y, w, h);

    // Start drawing in this cell
    let newCell = cells[cells.length - 1];
    setupCellDrawing(newCell);
    activeCell = newCell;

    currentCustomCell = null;
  }
}