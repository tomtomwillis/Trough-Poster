// rectangleExclusion.js - Manages rectangle exclusion functionality

import * as GridManager from './gridManager.js';

let exclusionRectangles = [];
let isDrawingRectangle = false;
let rectangleStart = { x: 0, y: 0 };
let currentRectangle = null;
let blockedCells = new Set();
let showRectangles = false;

export function initialize() {
  showRectangles = CONFIG.RECTANGLE_EXCLUSION.SHOW_RECTANGLES;
  console.log('Rectangle exclusion mode enabled. Click and drag to draw exclusion rectangles.');
  console.log('Press R to clear rectangles, V to toggle visibility');
}

export function startDrawingRectangle(mouseX, mouseY) {
  isDrawingRectangle = true;
  rectangleStart.x = mouseX;
  rectangleStart.y = mouseY;
  currentRectangle = {
    x: mouseX,
    y: mouseY,
    width: 0,
    height: 0
  };
}

export function updateCurrentRectangle(mouseX, mouseY) {
  if (currentRectangle) {
    currentRectangle.width = mouseX - rectangleStart.x;
    currentRectangle.height = mouseY - rectangleStart.y;
  }
}

export function finishDrawingRectangle() {
  if (!currentRectangle) return;
  
  isDrawingRectangle = false;

  // Ensure positive width and height
  let x = currentRectangle.width < 0 ? rectangleStart.x + currentRectangle.width : rectangleStart.x;
  let y = currentRectangle.height < 0 ? rectangleStart.y + currentRectangle.height : rectangleStart.y;
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
  }

  currentRectangle = null;
}

export function drawRectangles() {
  if (!showRectangles) return;
  
  let rectColor = CONFIG.RECTANGLE_EXCLUSION.RECTANGLE_COLOR;
  fill(rectColor[0], rectColor[1], rectColor[2], rectColor[3]);
  stroke(rectColor[0], rectColor[1], rectColor[2], 255);
  strokeWeight(CONFIG.RECTANGLE_EXCLUSION.STROKE_WIDTH);
  
  for (let rect of exclusionRectangles) {
    rect(rect.x, rect.y, rect.width, rect.height);
  }
}

export function drawCurrentRectangle() {
  if (!currentRectangle) return;
  
  let rectColor = CONFIG.RECTANGLE_EXCLUSION.RECTANGLE_COLOR;
  fill(rectColor[0], rectColor[1], rectColor[2], rectColor[3] * 0.5);
  stroke(rectColor[0], rectColor[1], rectColor[2], 128);
  strokeWeight(CONFIG.RECTANGLE_EXCLUSION.STROKE_WIDTH);
  
  rect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
}

export function drawBlockedCellIndicators() {
  fill(255, 0, 0, 50);
  noStroke();
  
  const cells = GridManager.getCells();
  for (let cellIndex of blockedCells) {
    let cell = cells[cellIndex];
    if (cell) {
      rect(cell.x, cell.y, cell.width, cell.height);
    }
  }
}

export function updateBlockedCells() {
  if (exclusionRectangles.length === 0) {
    blockedCells.clear();
    return;
  }
  
  blockedCells.clear();
  const cells = GridManager.getCells();
  
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

export function calculateRectangleRepulsion(x, y) {
  let totalRepulsionX = 0;
  let totalRepulsionY = 0;
  
  for (let rect of exclusionRectangles) {
    let repulsion = getRepulsionFromRectangle(x, y, rect);
    totalRepulsionX += repulsion.x;
    totalRepulsionY += repulsion.y;
  }
  
  return { x: totalRepulsionX, y: totalRepulsionY };
}

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

function calculateCellCoverage(cell) {
  let totalCoveredArea = 0;
  let cellArea = cell.width * cell.height;
  
  for (let rect of exclusionRectangles) {
    let intersectionArea = calculateRectangleIntersectionArea(cell, rect);
    totalCoveredArea += intersectionArea;
  }
  
  return Math.min(totalCoveredArea / cellArea, 1.0);
}

function calculateRectangleIntersectionArea(rect1, rect2) {
  let left = Math.max(rect1.x, rect2.x);
  let right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  let top = Math.max(rect1.y, rect2.y);
  let bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
  
  if (left < right && top < bottom) {
    return (right - left) * (bottom - top);
  }
  
  return 0;
}

export function clearRectangles() {
  exclusionRectangles = [];
  console.log('All exclusion rectangles cleared');
}

export function toggleVisibility() {
  showRectangles = !showRectangles;
  console.log(`Rectangle visibility: ${showRectangles ? 'ON' : 'OFF'}`);
}

export function showDebugInfo() {
  text(`Rectangles: ${exclusionRectangles.length}`, 10, 40);
  text(`Blocked Cells: ${blockedCells.size}`, 10, 60);
}

export function isBlocked(cellIndex) {
  return blockedCells.has(cellIndex);
}

export function isDrawing() {
  return isDrawingRectangle;
}