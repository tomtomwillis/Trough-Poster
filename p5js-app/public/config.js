// config.js
const CONFIG = {
    // Color configuration
    COLORS: {
      BACKGROUND: (COLOURS5.COL1),      // COL1
      DRAWING: (COLOURS5.COL2),         // COL2
      POINTS: (COLOURS5.COL1),    // Color for the live points
      TEXT: (COLOURS5.COL3)       // Color for text along path
    },
    
    // Drawing animation settings
    ANIMATION: {
      DURATION: 1500,             // seconds per drawing
      STROKE_WEIGHT: 3,          // Line thickness
      POINT_SIZE: 10,              // Size of the live points
      PAUSE_BETWEEN_DRAWINGS: 10, // Pause after completion before next drawing
      CURVE_SMOOTHING_STEPS: 1    // Intermediate points for smoother curves
    },
    
    // Jiggle effect settings
    JIGGLE: {
      AMPLITUDE: .9,               // Maximum jiggle distance in pixels
      SPEED: 0.004,               // How fast the jiggle oscillates
      X_PHASE_OFFSET: 0.5,        // Phase offset multiplier for x-axis per point
      Y_PHASE_OFFSET: 0.5,        // Phase offset multiplier for y-axis per point
      X_FREQUENCY_1: 1.0,         // Primary frequency for x jiggle
      X_FREQUENCY_2: 1.0,         // Secondary frequency for x jiggle
      Y_FREQUENCY_1: 1.0,         // Primary frequency for y jiggle
      Y_FREQUENCY_2: 0.8,         // Secondary frequency for y jiggle
      TEXT_JIGGLE_SCALE: 0.01      // Scale factor for text jiggle (0 = no jiggle, 1 = full jiggle)
    },
    
    // Text along path settings
    TEXT: {
        CONTENT: "T R O U G H 0 3", // Text to repeat along path
        FONT_SIZE: 6,              // Size of text characters
      },
    
    // Grid configuration
    GRID: {
      ROWS: 5,
      COLS: 5,
      CELL_PADDING: 0.05,           // Padding as fraction of cell size (0.1 = 10% padding)
      RANDOM_REDRAW: true          // If true, cells redraw at random; if false, redraw sequentially
    },
    
    // Canvas settings
    CANVAS: {
      ASPECT_RATIO: {             // 4:5 aspect ratio
        WIDTH: 4,
        HEIGHT: 5
      }
    },
    
    // Debug settings
    DEBUG: {
      SHOW_CELL_BORDERS: false,   // Show grid cell borders
      LOG_DRAWINGS: true,         // Log drawing info to console
      SHOW_FPS: false             // Show frame rate
    }
};