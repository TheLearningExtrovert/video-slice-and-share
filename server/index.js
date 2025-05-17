
const express = require('express');
const path = require('path');
const cors = require('cors');

class VideoSplitterServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS
    this.app.use(cors());
    
    // Set security headers required for SharedArrayBuffer
    this.app.use((req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });

    // Serve static files
    this.app.use(express.static(path.join(__dirname, '..', 'dist')));
  }

  setupRoutes() {
    // For any other routes, send the index.html file
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Video Splitter Server running on port ${this.port}`);
      console.log(`Visit: http://localhost:${this.port}`);
    });
  }
}

// Start the server
const server = new VideoSplitterServer();
server.start();
