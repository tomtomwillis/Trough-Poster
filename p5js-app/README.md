# p5.js Web Application

This project is a simple p5.js application that serves as a starting point for creating interactive web sketches. 

## Project Structure

```
p5js-app
├── public
│   ├── index.html        # Main HTML document
│   ├── sketch.js         # p5.js sketch file
│   └── style.css         # CSS styles for the application
├── package.json          # npm configuration file
├── .gitignore            # Git ignore file
└── README.md             # Project documentation
```

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd p5js-app
   ```

2. **Install dependencies**:
   Make sure you have Node.js installed. Then, run:
   ```
   npm install
   ```

3. **Install lite-server**:
   To see your changes in real time, install `lite-server`:
   ```
   npm install lite-server --save-dev
   ```

4. **Run the application**:
   Start the development server with:
   ```
   npm start
   ```
   This will launch the application in your default web browser and automatically reload the page whenever you make changes to your files.

## File Descriptions

- **public/index.html**: The entry point for the web application. It includes references to the `sketch.js` and `style.css` files.
- **public/sketch.js**: Contains the p5.js code for your sketch, including the `setup` and `draw` functions.
- **public/style.css**: Styles for your application to customize its appearance.
- **package.json**: Configuration file for npm, listing dependencies and scripts.
- **.gitignore**: Specifies files and directories to be ignored by Git.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.