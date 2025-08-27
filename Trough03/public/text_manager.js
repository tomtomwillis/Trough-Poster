// textManager.js - Handles text rendering along drawing paths

import * as JiggleEffect from './jiggleEffect.js';

let textWords = [];

export function initialize(textContent) {
  // Parse text content into words
  textWords = textContent.split(' ');
}

export function drawTextAlongPath(cell, progress) {
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
      let jiggledPosition = JiggleEffect.applyJiggle(position.x, position.y, letterIndex, CONFIG.JIGGLE.TEXT_JIGGLE_SCALE);
      
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

export function drawTextAtPoints(cell) {
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