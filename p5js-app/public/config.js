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
      STROKE_WEIGHT: 6,          // Line thickness
      POINT_SIZE: 10,              // Size of the live points
      PAUSE_BETWEEN_DRAWINGS: 100, // Pause after completion before next drawing
      CURVE_SMOOTHING_STEPS: 1    // Intermediate points for smoother curves
    },
    
    // Jiggle effect settings
    JIGGLE: {
      AMPLITUDE: .5,               // Maximum jiggle distance in pixels
      SPEED: 0.004,               // How fast the jiggle oscillates
      X_PHASE_OFFSET: 0.5,        // Phase offset multiplier for x-axis per point
      Y_PHASE_OFFSET: 0.5,        // Phase offset multiplier for y-axis per point
      X_FREQUENCY_1: 1.0,         // Primary frequency for x jiggle
      X_FREQUENCY_2: 1.3,         // Secondary frequency for x jiggle
      Y_FREQUENCY_1: 1.0,         // Primary frequency for y jiggle
      Y_FREQUENCY_2: 0.8,         // Secondary frequency for y jiggle
      TEXT_JIGGLE_SCALE: 0.01      // Scale factor for text jiggle (0 = no jiggle, 1 = full jiggle)
    },
    
    // Text along path settings
    TEXT: {
        CONTENT: "T R O U G H", // Text to repeat along path
        FONT_SIZE: 6,              // Size of text characters
        LETTER_SPACING: 80,          // Distance between letters along path
        WORD_SPACING: 40,            // Extra distance between words along path
        OPACITY: 255,               // Text opacity (0-255)
        OFFSET_FROM_LINE: 0,        // Distance text sits from the drawing line
        ANIMATION_DELAY: 0.1        // Delay before text starts (as fraction of total animation)
      },
    
    // Grid configuration
    GRID: {
      ROWS: 6,
      COLS: 4,
      CELL_PADDING: 0.1,           // Padding as fraction of cell size (0.1 = 10% padding)
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