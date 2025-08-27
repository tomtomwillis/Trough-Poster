// canvasManager.js - Handles canvas setup, sizing, and visual properties

// Adjust canvas size based on window dimensions and config aspect ratio
export function adjustCanvasSize() {
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

// Set the background color for both canvas and body
export function setBackgroundColor(color) {
  // Set canvas background
  background(color);
  
  // Set the body background color dynamically
  document.body.style.backgroundColor = color;
}

// Set the canvas border color
export function setBorderColor(color) {
  let canvasElement = document.querySelector('canvas');
  if (canvasElement) {
    canvasElement.style.borderColor = color;
  }
}

// Display FPS counter and other debug information
export function showFPS() {
  fill(255);
  noStroke();
  text(`FPS: ${Math.round(frameRate())}`, 10, 20);
}

// Initialize canvas with basic drawing settings
export function initializeCanvas() {
  // Initialize Quick Draw settings
  strokeWeight(CONFIG.ANIMATION.STROKE_WEIGHT);
  noFill();
}