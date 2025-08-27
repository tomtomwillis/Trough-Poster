// drawingManager.js - Handles drawing setup, animation, and rendering

import * as JiggleEffect from './jiggleEffect.js';

export function initialize() {
  // Initialize Quick Draw settings
  strokeWeight(CONFIG.ANIMATION.STROKE_WEIGHT);
  noFill();
}

export function setupCellDrawing(cell, dogDrawings) {
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

export function updateActiveCell(activeCell, jiggleTime) {
  if (!activeCell || activeCell.state !== 'animating') return;
  
  let elapsed = millis() - activeCell.animationStartTime;
  let progress = elapsed / CONFIG.ANIMATION.DURATION;

  if (progress >= 1) {
    // Animation complete
    activeCell.state = 'complete';
    updateAllLivePoints(activeCell);
  } else {
    // Continue animation
    updateLivePoints(activeCell, progress);
  }
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
    let jiggled = JiggleEffect.applyJiggle(point.originalX, point.originalY, point.globalPointIndex);

    // Add mouse repulsion effect
    let mouseDist = dist(mouseX, mouseY, jiggled.x, jiggled.y);
    if (mouseDist < CONFIG.INTERACTIVITY.MOUSE_REPEL_RADIUS) {
      let repelForce = CONFIG.INTERACTIVITY.REPEL_FORCE * (1 - mouseDist / CONFIG.INTERACTIVITY.MOUSE_REPEL_RADIUS);
      let angle = atan2(jiggled.y - mouseY, jiggled.x - mouseX);
      jiggled.x += cos(angle) * repelForce;
      jiggled.y += sin(angle) * repelForce;
    }

    point.x = jiggled.x;
    point.y = jiggled.y;
  }
}

export function drawCell(cell, jiggleTime) {
  if (cell.state === 'empty') return;

  // Clear this cell's area before redrawing
  clearCell(cell);

  // Always update jiggle for all cells (including completed ones)
  updateJiggle(cell);

  // Draw the current points and lines
  drawLivePoints(cell);
}

function clearCell(cell) {
  noStroke();
  fill(CONFIG.COLORS.BACKGROUND);
  rect(cell.x, cell.y, cell.width, cell.height);
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