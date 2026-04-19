const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection & Index Sync
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    try {
      // Sync Employees Index (Ensures 'sparse' property is active for optional usernames)
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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
