// config.js
const CONFIG = {
    // Color configuration
    COLORS: {
      BACKGROUND: (COLOURS5.COL1),      // COL1
      DRAWING: (COLOURS5.COL2),         // COL2
      POINTS: (COLOURS5.COL1),    // Color for the live points
      TEXT: (COLOURS5.COL3),       // Color for text along path
      CUSTOM_CELL: (COLOURS5.COL1), // Color for custom drawn cells
      BORDER: (COLOURS5.COL3) // Color for cell borders
    },
    
    MODES: {
        CUSTOM_CELLS: false
      },

      DRAWING_SELECTION: {
        RECOGNIZED_PROBABILITY: .9 // Probability of selecting a "recognized" drawing
    },

    // Drawing animation settings
    ANIMATION: {
      DURATION: 3000,             // seconds per drawing
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

    INTERACTIVITY: {
        MOUSE_REPEL_RADIUS: 150, // Radius within which points are repelled
        REPEL_FORCE: 20, // Strength of the repulsion
        CUSTOM_CELL_STROKE: 2
      },
    
    // Text along path settings
    TEXT: {
        CONTENT: "T R O U G H 3", // Text to repeat along path
        FONT_SIZE: 6,              // Size of text characters
      },
    
    // Grid configuration
    GRID: {
        ROWS: 4,
        COLS: 5,  
        CELL_PADDING: 0.1,
        RANDOM_REDRAW: true,
        TOP_PADDING: 105,    // Add this
        BOTTOM_PADDING: 70,  // Add this
        TOP_PADDING_PERCENTAGE: 0.08, // 5% of the page height
        BOTTOM_PADDING_PERCENTAGE: 0.08 // 5% of the page height
      },
    
    // Canvas settings
    CANVAS: {
      ASPECT_RATIO: {             // 4:5 aspect ratio
        WIDTH: 4,
        HEIGHT: 5
      }
    },
    
    TEXTURE_DISPLACEMENT: {
        ENABLED: false,              // Enable/disable texture displacement
        SHOW_TEXTURE: false,        // Show the texture (for debugging)
        DISPLACEMENT_STRENGTH: 10,  // Maximum displacement strength
        BLACK_THRESHOLD: 50,        // Pixel darkness threshold (0-255)
        INVERT: true               // Invert the displacement effect
    },

    // Debug settings
    DEBUG: {
        SHOW_TEXTURE_IMAGE: true, // Set to true to show the texture image
        SHOW_CELL_BORDERS: false,   // Show grid cell borders
        LOG_DRAWINGS: true,         // Log drawing info to console
        SHOW_FPS: false             // Show frame rate
    },

    RECTANGLE_EXCLUSION: {
        ENABLED: false,                    // Enable rectangle drawing mode
        COVERAGE_THRESHOLD: 0.6,          // 60% coverage blocks cells
        REPEL_RADIUS: 3,                // Distance for particle repulsion (increased for magnetic effect)
        REPEL_STRENGTH: 5,              // Force strength of repulsion (adjusted for magnetic effect)
        REPEL_DECAY: 2,                   // Decay factor for inverse-square law (e.g., 2 for magnetic-like behavior)
        SHOW_RECTANGLES: false,           // Make rectangles visible for debugging
        RECTANGLE_COLOR: [255, 0, 0, 100],// Debug rectangle color (RGBA)
        STROKE_WIDTH: 0                   // Debug rectangle stroke width
      },

    BLOCKED_CELL_REPULSION: {
        ENABLED: false,                // Enable repulsion from blocked cells
        REPEL_RADIUS: 0,            // Distance for particle repulsion
        REPEL_STRENGTH: 4,          // Force strength of repulsion
        REPEL_DECAY: 2,               // Decay factor for inverse-square law
        SHOW_BLOCKED_CELLS: true      // Debug: Highlight blocked cells
    }
};