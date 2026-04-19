const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://krishan-transport-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Enable CORS for allowed origins, or any vercel.app preview/production branch for this project
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Database Connection & Index Sync
if (!process.env.MONGODB_URI) {
  console.error("⚠️ MONGODB_URI is not set! Missing environment variable.");
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✅ MongoDB Connected');
      try {
        // Sync Employees Index
        const employeeCollection = mongoose.connection.collection('employees');
        const indexes = await employeeCollection.indexes();
        if (indexes.some(i => i.name === 'username_1')) {
          console.log('🔄 Syncing Username Index...');
          await employeeCollection.dropIndex('username_1');
        }
      } catch (err) {
        console.log('ℹ️ Index sync skipped or already clean.');
      }
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// Routes
app.use('/api/diesel', require('./routes/diesel'));
app.use('/api/hires', require('./routes/hires'));
app.use('/api/salaries', require('./routes/salaries'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));

app.get('/', (req, res) => {
  res.send('Krishan Transport API is running...');
});

// Start Server (Only for local development, Vercel serverless functions handle this differently)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
