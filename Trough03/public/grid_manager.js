// gridManager.js - Manages grid layout, cell operations, and cell selection

// Global state
let cells = [];
let nextCellIndex = 0;

// Custom cell drawing state
let isDrawingCustomCell = false;
let customCellStart = { x: 0, y: 0 };
let currentCustomCell = null;

export function initializeGrid() {
  cells = [];
  
  // Calculate dynamic vertical padding based on page height
  const topPadding = height * CONFIG.GRID.TOP_PADDING_PERCENTAGE;
  const bottomPadding = height * CONFIG.GRID.BOTTOM_PADDING_PERCENTAGE;
  const drawableHeight = height - topPadding - bottomPadding;

  let cellWidth = width / CONFIG.GRID.COLS;
  let cellHeight = drawableHeight / CONFIG.GRID.ROWS;
  
  for (let row = 0; row < CONFIG.GRID.ROWS; row++) {
    for (let col = 0; col < CONFIG.GRID.COLS; col++) {
      cells.push({
        row: row,
        col: col,
        x: col * cellWidth,
        y: row * cellHeight + topPadding,
        width: cellWidth,
        height: cellHeight,
        state: 'empty', // 'empty', 'animating', 'complete'
        drawing: null,
        allPoints: [],
        livePoints: [],
        textPositions: [],
        animationStartTime: 0,
        cellIndex: row * CONFIG.GRID.COLS + col
      });
    }
  }
}

export function drawGridBorders() {
  stroke(CONFIG.COLORS.BORDER);
  strokeWeight(1);
  noFill();
  
  let cellWidth = width / CONFIG.GRID.COLS;
  let cellHeight = height / CONFIG.GRID.ROWS;
  
  for (let row = 0; row <= CONFIG.GRID.ROWS; row++) {
    line(0, row * cellHeight, width, row * cellHeight);
  }
  
  for (let col = 0; col <= CONFIG.GRID.COLS; col++) {
    line(col * cellWidth, 0, col * cellWidth, height);
  }
}

export function getNextCell() {
  if (CONFIG.GRID.RANDOM_REDRAW) {
    // Import RectangleExclusion to check blocked cells
    const availableCells = cells.filter(cell => {
      // Check if cell is blocked by rectangles (will be handled by RectangleExclusion module)
      return cell.state === 'empty';
    });
    
    if (availableCells.length > 0) {
      return random(availableCells);
    } else {
      // Pick a random cell and reset it
      return random(cells);
    }
  } else {
    // Sequential selection
    let attempts = 0;
    let nextCell;
    
    do {
      nextCell = cells[nextCellIndex % cells.length];
      nextCellIndex = (nextCellIndex + 1) % cells.length;
      attempts++;
      
      if (attempts >= cells.length) {
        return null; // All cells blocked
      }
    } while (false); // Rectangle blocking will be handled by main.js
    
    return nextCell;
  }
}

export function populateAllCells(dogDrawings) {
  // This will be called by main.js which will also handle drawing setup
  for (let cell of cells) {
    cell.state = 'complete';
  }
}

export function drawCells(jiggleTime) {
  for (let cell of cells) {
    if (cell.state !== 'empty') {
      // Cell drawing will be handled by DrawingManager
      // This function coordinates the drawing process
    }
  }
}

export function resetAllCells() {
  for (let cell of cells) {
    cell.state = 'empty';
    cell.drawing = null;
    cell.allPoints = [];
    cell.livePoints = [];
    cell.textPositions = [];
  }
}

// Custom cell drawing functions
export function startDrawingCustomCell(mouseX, mouseY) {
  isDrawingCustomCell = true;
  customCellStart.x = mouseX;
  customCellStart.y = mouseY;
  currentCustomCell = {
    x: mouseX,
    y: mouseY,
    width: 0,
    height: 0
  };
}

export function updateCustomCell(mouseX, mouseY) {
  if (currentCustomCell) {
    currentCustomCell.width = mouseX - customCellStart.x;
    currentCustomCell.height = mouseY - customCellStart.y;
  }
}

export function drawCustomCellPreview() {
  if (currentCustomCell) {
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
}

export function finishDrawingCustomCell() {
  if (!currentCustomCell) return null;
  
  isDrawingCustomCell = false;

  // Ensure positive width and height
  let x = currentCustomCell.width < 0 ? customCellStart.x + currentCustomCell.width : customCellStart.x;
  let y = currentCustomCell.height < 0 ? customCellStart.y + currentCustomCell.height : customCellStart.y;
  let w = abs(currentCustomCell.width);
  let h = abs(currentCustomCell.height);

  if (w > 10 && h > 10) {
    // Create new cell
    const newCell = {
      x: x,
      y: y,
      width: w,
      height: h,
      state: 'empty',
      drawing: null,
      allPoints: [],
      livePoints: [],
      textPositions: [],
      animationStartTime: 0,
      cellIndex: cells.length
    };
    
    cells.push(newCell);
    currentCustomCell = null;
    return newCell;
  }
  
  currentCustomCell = null;
  return null;
}

// Getter functions for other modules
export function getCells() {
  return cells;
}

export function isDrawingCell() {
  return isDrawingCustomCell;
}