const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.send('API is running');
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/documents', documentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Set default error status and message
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message
    });
});

module.exports = app;