const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Use a more permissive CORS configuration
app.use(cors({
  origin: '*',  // Allow all origins (for development)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function(req, file, cb) {
    console.log('Received file:', file.originalname, 'mimetype:', file.mimetype);
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/quicktime') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4 and MOV are allowed.'));
    }
  }
});

// Basic test route
app.get('/', (req, res) => {
  res.send('Badminton Analyzer API is running!');
});

// Test route for checking connections
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working!' });
});

// Simple test upload form route
app.get('/test-upload', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Upload Test</title>
    </head>
    <body>
      <h1>Test Upload Form</h1>
      <form action="/api/upload-video" method="POST" enctype="multipart/form-data">
        <input type="file" name="video" accept="video/mp4,video/quicktime">
        <input type="text" name="userId" value="test-user">
        <input type="text" name="shopId" value="test-shop">
        <button type="submit">Upload</button>
      </form>
    </body>
    </html>
  `);
});

// Upload endpoint
app.post('/api/upload-video', (req, res) => {
  console.log('Upload request received');
  console.log('Headers:', req.headers);
  console.log('Body keys:', Object.keys(req.body || {}));
  
  upload.single('video')(req, res, function(err) {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    // Check if file was received
    if (!req.file) {
      console.error('No file received');
      return res.status(400).json({
        success: false,
        error: 'No file was uploaded'
      });
    }
    
    // Log received data for debugging
    console.log('File received:', req.file);
    console.log('Form data:', req.body);
    
    // Send success response
    res.json({
      success: true,
      videoId: 'test-' + Date.now(),
      message: 'Video upload received successfully'
    });
  });
});

// Analysis endpoint
app.get('/api/analysis/:id', (req, res) => {
  // Return mock data for testing
  res.json({
    success: true,
    analysis: {
      videoUrl: "https://example.com/sample-video.mp4",
      status: "completed",
      results: {
        technique: {
          overallScore: 78,
          feedback: [
            "Good racket preparation on your forehand side",
            "Try to maintain a higher elbow position during backhand strokes",
            "Your follow-through is excellent on smashes",
            "Work on wrist positioning during net shots"
          ],
          detailedMetrics: {
            backswing: 82,
            followThrough: 75,
            contactPoint: 68,
            racketPath: 86
          },
          timeMarkers: [
            { time: 15, label: "Good forehand technique" },
            { time: 42, label: "Backhand needs improvement" },
            { time: 78, label: "Excellent smash execution" }
          ]
        },
        footwork: {
          overallScore: 72,
          feedback: [
            "Your split-step timing is good",
            "Work on faster recovery to the center court",
            "Good lateral movement on the forehand side",
            "Try to use more chassé steps when moving to the backhand corner"
          ],
          detailedMetrics: {
            movementEfficiency: 70,
            recoverySpeed: 65,
            courtCoverage: 80
          },
          timeMarkers: [
            { time: 28, label: "Good split-step" },
            { time: 56, label: "Slow recovery to center" },
            { time: 92, label: "Efficient forehand movement" }
          ]
        },
        strategy: {
          overallScore: 75,
          feedback: [
            "Good variety in your shot selection",
            "Try to use more attacking clears when opponent is at front court",
            "Effective use of drop shots",
            "Work on deception in your shot preparation"
          ],
          patterns: [
            { name: "Net shots", value: 32 },
            { name: "Clears", value: 28 },
            { name: "Drops", value: 18 },
            { name: "Drives", value: 12 },
            { name: "Smashes", value: 10 }
          ],
          timeMarkers: [
            { time: 35, label: "Good shot variation" },
            { time: 68, label: "Missed attacking opportunity" },
            { time: 105, label: "Effective defensive play" }
          ]
        }
      }
    }
  });
});

// Start server with proper port configuration for Heroku
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
