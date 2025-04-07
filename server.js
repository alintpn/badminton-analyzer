// server.js - Main Node.js backend for Shopify App

const express = require('express');
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
const { join } = require('path');
const { readFileSync } = require('fs');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Configure Shopify API
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(','),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ''),
  API_VERSION: ApiVersion.October22,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Configure storage for video uploads
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for free tier
  fileFilter: function(req, file, cb) {
    // Accept only mp4 and mov
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/quicktime') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4 and MOV are allowed.'));
    }
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define mongoose schemas
const AnalysisSchema = new mongoose.Schema({
  userId: String,
  shopId: String,
  videoId: String,
  videoUrl: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  results: {
    technique: {
      overallScore: Number,
      feedback: [String],
      detailedMetrics: {
        backswing: Number,
        followThrough: Number,
        contactPoint: Number,
        racketPath: Number
      }
    },
    footwork: {
      overallScore: Number,
      feedback: [String],
      detailedMetrics: {
        movementEfficiency: Number,
        recoverySpeed: Number,
        courtCoverage: Number
      }
    },
    strategy: {
      overallScore: Number,
      feedback: [String]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Analysis = mongoose.model('Analysis', AnalysisSchema);

// API Routes
// Upload video endpoint
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    const { userId, shopId } = req.body;
    
    // Create new analysis record
    const analysis = new Analysis({
      userId,
      shopId,
      videoId: req.file.filename,
      videoUrl: `${process.env.HOST}/uploads/${req.file.filename}`,
      status: 'pending'
    });
    
    await analysis.save();
    
    // Trigger analysis process (async)
    startAnalysis(analysis._id, req.file.path);
    
    res.json({
      success: true,
      videoId: analysis._id,
      message: 'Video uploaded successfully. Analysis is now in progress.'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload video'
    });
  }
});

// Get analysis status
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analysis'
    });
  }
});

// AI Analysis Processing Function
async function startAnalysis(analysisId, videoPath) {
  try {
    // Update status to processing
    await Analysis.findByIdAndUpdate(analysisId, { status: 'processing' });
    
    // In a production environment, you would send this to a separate worker process
    // or AWS Lambda/Google Cloud Function to handle the processing
    // For demo, we'll simulate the AI analysis with a timeout
    
    setTimeout(async () => {
      try {
        // Simulate AI processing results
        const results = simulateAIAnalysis();
        
        // Update the analysis record with results
        await Analysis.findByIdAndUpdate(analysisId, {
          status: 'completed',
          results
        });
        
        console.log(`Analysis completed for ID: ${analysisId}`);
      } catch (error) {
        console.error(`Analysis processing error for ID ${analysisId}:`, error);
        
        await Analysis.findByIdAndUpdate(analysisId, {
          status: 'failed'
        });
      }
    }, 30000); // Simulate 30 seconds of processing time
  } catch (error) {
    console.error(`Failed to start analysis for ID ${analysisId}:`, error);
    
    await Analysis.findByIdAndUpdate(analysisId, {
      status: 'failed'
    });
  }
}

// Simulate AI analysis results for demo purposes
function simulateAIAnalysis() {
  return {
    technique: {
      overallScore: Math.floor(Math.random() * 40) + 60, // Score between 60-100
      feedback: [
        "Your backhand technique shows good wrist positioning",
        "Try to fully extend your arm during forehand clears",
        "Work on maintaining a consistent contact point"
      ],
      detailedMetrics: {
        backswing: Math.floor(Math.random() * 40) + 60,
        followThrough: Math.floor(Math.random() * 40) + 60,
        contactPoint: Math.floor(Math.random() * 40) + 60,
        racketPath: Math.floor(Math.random() * 40) + 60
      }
    },
    footwork: {
      overallScore: Math.floor(Math.random() * 40) + 60,
      feedback: [
        "Good split-step timing before opponent's shots",
        "Work on faster recovery to court center",
        "Try to use more chassé steps for lateral movement"
      ],
      detailedMetrics: {
        movementEfficiency: Math.floor(Math.random() * 40) + 60,
        recoverySpeed: Math.floor(Math.random() * 40) + 60,
        courtCoverage: Math.floor(Math.random() * 40) + 60
      }
    },
    strategy: {
      overallScore: Math.floor(Math.random() * 40) + 60,
      feedback: [
        "Good variation in shot selection",
        "Try to attack more when opponent is out of position",
        "Consider using more drop shots when opponent is at back court"
      ]
    }
  };
}

// In a real implementation, you would include the actual AI processing code here
// Below is a skeleton of what the AI processing would look like

/* 
async function performAIAnalysis(videoPath) {
  // 1. Extract frames from video
  const frames = await extractVideoFrames(videoPath);
  
  // 2. Run pose estimation on key frames
  const poseData = await runPoseEstimation(frames);
  
  // 3. Track racket and shuttle
  const objectTrackingData = await trackObjects(frames);
  
  // 4. Analyze technique
  const techniqueAnalysis = analyzePlayerTechnique(poseData, objectTrackingData);
  
  // 5. Analyze footwork
  const footworkAnalysis = analyzeFootwork(poseData);
  
  // 6. Analyze strategy and patterns
  const strategyAnalysis = analyzeStrategy(poseData, objectTrackingData);
  
  // 7. Compile results
  return {
    technique: techniqueAnalysis,
    footwork: footworkAnalysis,
    strategy: strategyAnalysis
  };
}
*/

// Webhook for app uninstallation
app.post('/webhooks/app_uninstalled', async (req, res) => {
  // Handle app uninstallation
  res.status(200).send();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Python AI Processing Script (for reference - would be in a separate file)
/*
# ai_processor.py - This would be a separate service in production

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from moviepy.editor import VideoFileClip
import mediapipe as mp
import json
import os

def process_video(video_path, analysis_id):
    # Initialize models
    pose_model = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5)
    
    # Load custom models for badminton-specific analysis
    technique_model = load_model('models/technique_analyzer.h5')
    footwork_model = load_model('models/footwork_analyzer.h5')
    
    # Process video
    video = VideoFileClip(video_path)
    
    # Extract frames (e.g., 3 frames per second)
    frame_rate = 3
    frames = []
    for t in range(0, int(video.duration), 1/frame_rate):
        frame = video.get_frame(t)
        frames.append(frame)
    
    # Analyze each frame
    pose_results = []
    for frame in frames:
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pose_result = pose_model.process(rgb_frame)
        if pose_result.pose_landmarks:
            pose_results.append(pose_result.pose_landmarks)
    
    # Process pose data for technique analysis
    technique_data = extract_technique_features(pose_results)
    technique_scores = technique_model.predict(technique_data)
    
    # Process pose data for footwork analysis
    footwork_data = extract_footwork_features(pose_results)
    footwork_scores = footwork_model.predict(footwork_data)
    
    # Analyze strategy based on positioning and movements
    strategy_analysis = analyze_strategy(pose_results)
    
    # Compile results
    results = {
        "technique": {
            "overallScore": float(np.mean(technique_scores['overall'])),
            "feedback": generate_technique_feedback(technique_scores),
            "detailedMetrics": {
                "backswing": float(np.mean(technique_scores['backswing'])),
                "followThrough": float(np.mean(technique_scores['follow_through'])),
                "contactPoint": float(np.mean(technique_scores['contact_point'])),
                "racketPath": float(np.mean(technique_scores['racket_path']))
            }
        },
        "footwork": {
            "overallScore": float(np.mean(footwork_scores['overall'])),
            "feedback": generate_footwork_feedback(footwork_scores),
            "detailedMetrics": {
                "movementEfficiency": float(np.mean(footwork_scores['efficiency'])),
                "recoverySpeed": float(np.mean(footwork_scores['recovery'])),
                "courtCoverage": float(np.mean(footwork_scores['coverage']))
            }
        },
        "strategy": {
            "overallScore": strategy_analysis['overall_score'],
            "feedback": strategy_analysis['feedback']
        }
    }
    
    # Save results to file
    with open(f'results/{analysis_id}.json', 'w') as f:
        json.dump(results, f)
    
    return results

def extract_technique_features(pose_results):
    # Extract relevant keypoints for technique analysis
    features = []
    # ...implementation...
    return features

def extract_footwork_features(pose_results):
    # Extract relevant keypoints for footwork analysis
    features = []
    # ...implementation...
    return features

def analyze_strategy(pose_results):
    # Analyze court positioning and movement patterns
    # ...implementation...
    return {
        "overall_score": 75.5,
        "feedback": [
            "Good court coverage on the front court",
            "Consider positioning more centrally after defensive shots",
            "Good use of attacking opportunities from mid-court"
        ]
    }

def generate_technique_feedback(scores):
    # Generate personalized feedback based on scores
    feedback = []
    # ...implementation...
    return feedback

def generate_footwork_feedback(scores):
    # Generate personalized feedback based on scores
    feedback = []
    # ...implementation...
    return feedback

if __name__ == "__main__":
    # This would be called by a job queue in production
    import sys
    video_path = sys.argv[1]
    analysis_id = sys.argv[2]
    process_video(video_path, analysis_id)
*/
