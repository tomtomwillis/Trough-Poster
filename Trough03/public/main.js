// main.js - Application entry point that coordinates all modules
import * as CanvasManager from './canvasManager.js';
import * as GridManager from './gridManager.js';
import * as DrawingManager from './drawingManager.js';
import * as JiggleEffect from './jiggleEffect.js';
import * as TextManager from './textManager.js';
import * as RectangleExclusion from './rectangleExclusion.js';
import * as InteractionManager from './interactionManager.js';
import * as TextureDisplacement from './textureDisplacement.js';

// Global state
let dogDrawings = [];
let activeCell = null;
let jiggleTime = 0;

// Preload function - loads external assets
function preload() {
  // Load the NDJSON file as an array of strings (one string per line)
  let ndjsonLines = loadStrings('datasets/dog.ndjson', parseNDJSON);
  
  // Load displacement texture if enabled
  if (CONFIG.TEXTURE_DISPLACEMENT && CONFIG.TEXTURE_DISPLACEMENT.ENABLED) {
    TextureDisplacement.loadTexture('images/point_displace.png');
  }
}

// Parse NDJSON data
function parseNDJSON(lines) {
  for (let line of lines) {
    try {
      let drawing = JSON.parse(line);
      dogDrawings.push(drawing);
    } catch (error) {
      console.error('Error parsing NDJSON line:', line, error);
    }
  }
}

// Setup function - initializes the application
function setup() {
  CanvasManager.adjustCanvasSize();
  CanvasManager.setBackgroundColor(CONFIG.COLORS.BACKGROUND);
  CanvasManager.setBorderColor(CONFIG.COLORS.BORDER);

  // Initialize grid
  GridManager.initializeGrid();
  
  // Initialize other managers
  DrawingManager.initialize();
  TextManager.initialize(CONFIG.TEXT.CONTENT);
  JiggleEffect.initialize();
  
  // Initialize rectangle exclusion if enabled
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
    RectangleExclusion.initialize();
  }
  
  // Draw debug grid if enabled
  if (CONFIG.DEBUG.SHOW_CELL_BORDERS) {
    GridManager.drawGridBorders();
  }

  // Set initial background
  background(CONFIG.COLORS.BACKGROUND);
  
  // Start the animation if not in custom cell mode
  if (!CONFIG.MODES.CUSTOM_CELLS && dogDrawings.length > 0) {
    GridManager.populateAllCells(dogDrawings);
    setTimeout(() => {
      startNextCellDrawing();
    }, CONFIG.ANIMATION.PAUSE_BETWEEN_DRAWINGS);
  } else if (dogDrawings.length === 0) {
    console.error('No drawings loaded from NDJSON file.');
  }
}

// Main draw function
function draw() {
  // Update global jiggle time
  jiggleTime = millis();
  
  // Draw displacement texture if enabled for debugging
  if (CONFIG.TEXTURE_DISPLACEMENT && CONFIG.TEXTURE_DISPLACEMENT.SHOW_TEXTURE) {
    TextureDisplacement.drawTexture();
  }
  
  // Update active cell animation
  if (activeCell && activeCell.state === 'animating') {
    DrawingManager.updateActiveCell(activeCell, jiggleTime);
    
    // Check if animation is complete
    if (activeCell.state === 'complete') {
      activeCell = null;
      setTimeout(() => {
        startNextCellDrawing();
      }, CONFIG.ANIMATION.PAUSE_BETWEEN_DRAWINGS);
    }
  }
  
  // Draw all cells
  GridManager.drawCells(jiggleTime);
  
  // Draw exclusion rectangles if enabled and visible
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
    RectangleExclusion.drawRectangles();
  }
  
  // Draw current rectangle being drawn
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
      InteractionManager.isDrawingRectangle()) {
    RectangleExclusion.drawCurrentRectangle();
  }
  
  // Draw current custom cell if in drawing mode
  if (CONFIG.MODES.CUSTOM_CELLS && InteractionManager.isDrawingCell()) {
    GridManager.drawCustomCellPreview();
  }
  
  // Draw blocked cell indicators if debug enabled
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
      CONFIG.DEBUG.SHOW_CELL_BORDERS) {
    RectangleExclusion.drawBlockedCellIndicators();
  }
  
  // Show FPS if debug enabled
  if (CONFIG.DEBUG.SHOW_FPS) {
    CanvasManager.showFPS();
    
    // Show rectangle count if applicable
    if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
      RectangleExclusion.showDebugInfo();
    }
  }
}

// Start drawing the next cell
function startNextCellDrawing() {
  if (activeCell && activeCell.state === 'animating') return;
  
  const nextCell = GridManager.getNextCell();
  if (!nextCell) return;
  
  DrawingManager.setupCellDrawing(nextCell, dogDrawings);
  activeCell = nextCell;
  activeCell.state = 'animating';
  activeCell.animationStartTime = millis();
}

// Window resize handler
function windowResized() {
  CanvasManager.adjustCanvasSize();
  GridManager.initializeGrid();
  background(CONFIG.COLORS.BACKGROUND);
  
  if (CONFIG.DEBUG.SHOW_CELL_BORDERS) {
    GridManager.drawGridBorders();
  }
  
  // Update blocked cells after window resize
  if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
    RectangleExclusion.updateBlockedCells();
  }
}

// Make functions globally available
window.preload = preload;
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;

// Initialize interaction handlers
InteractionManager.initialize({
  onMousePressed: () => {
    if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && !CONFIG.MODES.CUSTOM_CELLS) {
      RectangleExclusion.startDrawingRectangle(mouseX, mouseY);
    } else if (CONFIG.MODES.CUSTOM_CELLS) {
      GridManager.startDrawingCustomCell(mouseX, mouseY);
    }
  },
  onMouseDragged: () => {
    if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
        InteractionManager.isDrawingRectangle()) {
      RectangleExclusion.updateCurrentRectangle(mouseX, mouseY);
    } else if (CONFIG.MODES.CUSTOM_CELLS && InteractionManager.isDrawingCell()) {
      GridManager.updateCustomCell(mouseX, mouseY);
    }
  },
  onMouseReleased: () => {
    if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED && 
        InteractionManager.isDrawingRectangle()) {
      RectangleExclusion.finishDrawingRectangle();
      RectangleExclusion.updateBlockedCells();
    } else if (CONFIG.MODES.CUSTOM_CELLS && InteractionManager.isDrawingCell()) {
      const newCell = GridManager.finishDrawingCustomCell();
      if (newCell) {
        DrawingManager.setupCellDrawing(newCell, dogDrawings);
        activeCell = newCell;
        activeCell.state = 'animating';
        activeCell.animationStartTime = millis();
      }
    }
  },
  onKeyPressed: (key) => {
    if (key === ' ') {
      // Toggle between modes
      CONFIG.MODES.CUSTOM_CELLS = !CONFIG.MODES.CUSTOM_CELLS;
      console.log(`Mode switched to: ${CONFIG.MODES.CUSTOM_CELLS ? 'Custom Cells' : 'Default'}`);
      
      // Reset the canvas and cells when switching modes
      background(CONFIG.COLORS.BACKGROUND);
      GridManager.resetAllCells();
      
      if (CONFIG.DEBUG.SHOW_CELL_BORDERS) {
        GridManager.drawGridBorders();
      }
      
      // Only start drawing if not in custom cell mode
      if (!CONFIG.MODES.CUSTOM_CELLS) {
        setTimeout(() => {
          startNextCellDrawing();
        }, CONFIG.ANIMATION.PAUSE_BETWEEN_DRAWINGS);
      }
    }
    
    // Rectangle exclusion key controls
    if (CONFIG.RECTANGLE_EXCLUSION && CONFIG.RECTANGLE_EXCLUSION.ENABLED) {
      if (key === 'r' || key === 'R') {
        RectangleExclusion.clearRectangles();
        RectangleExclusion.updateBlockedCells();
      }
      
      if (key === 'v' || key === 'V') {
        RectangleExclusion.toggleVisibility();
      }
    }
  }
});