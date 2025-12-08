const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const { requestLogger, errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRouter = require('./routes/auth');
const negotiationsRouter = require('./routes/negotiations');
const partiesRouter = require('./routes/parties');
const movesRouter = require('./routes/moves');
const searchRouter = require('./routes/search');
const bracketsRouter = require('./routes/brackets');
const mediatorRouter = require('./routes/mediator');
const analyticsRouter = require('./routes/analytics');
const templatesRouter = require('./routes/templates');
const activityRouter = require('./routes/activity');

// Initialize database
db.initializeDatabase();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Negotiation Engine API is running' });
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// API Routes (protected by auth middleware in their respective files)
app.use('/api/negotiations', negotiationsRouter);
app.use('/api/negotiations', activityRouter); // Activity timeline
app.use('/api', partiesRouter);
app.use('/api/negotiations', bracketsRouter);
app.use('/api/negotiations', mediatorRouter);
app.use('/api/moves', movesRouter);
app.use('/api/search', searchRouter);
app.use('/api/analytics', analyticsRouter); // Insurer and adjuster analytics
app.use('/api/brackets', bracketsRouter); // For direct bracket updates
app.use('/api/mediator-proposals', mediatorRouter); // For utility endpoints
app.use('/api/templates', templatesRouter); // Negotiation templates

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✓ Negotiation Engine API running on http://localhost:${PORT}`);
});
