const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Basic test route
app.get('/', (req, res) => {
  res.send('Badminton Analyzer API is running!');
});

// Test route for checking connections
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working!' });
});

// Simple upload endpoint
app.post('/api/upload-video', (req, res) => {
  // This is just a placeholder that returns success
  // Just to test if the frontend can connect
  res.json({
    success: true,
    videoId: 'demo-123',
    message: 'Video received (simulated)'
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
