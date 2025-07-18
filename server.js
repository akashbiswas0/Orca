const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

require('dotenv').config();

const twitterRoutes = require('./routes/twitter');
const agentRoutes = require('./routes/agent');
const featuresRoutes = require('./routes/features');
const orchestrationRoutes = require('./routes/orchestration');
const orchestrationChatRoutes = require('./routes/orchestrationChat');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initializeOrchestration } = require('./orchestration-startup');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting removed for unlimited requests

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/twitter', twitterRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/orchestration', orchestrationRoutes);
app.use('/api/orchestration-chat', orchestrationChatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize multi-agent architecture
  initializeOrchestration();
}); 