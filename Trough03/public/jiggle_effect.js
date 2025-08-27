// jiggleEffect.js - Manages jiggle animation effects and displacement

import * as TextureDisplacement from './textureDisplacement.js';

let jiggleTime = 0;

export function initialize() {
  jiggleTime = 0;
}

export function updateTime(currentTime) {
  jiggleTime = currentTime;
}

export function applyJiggle(x, y, pointIndex, scale = 1) {
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
  
  if (CONFIG.TEXTURE_DISPLACEMENT && CONFIG.TEXTURE_DISPLACEMENT.ENABLED) {
    const displacement = TextureDisplacement.getDisplacement(displacedX, displacedY);
    displacedX += displacement.x;
    displacedY += displacement.y;
  }
  
  return {
    x: displacedX,
    y: displacedY
  };
}