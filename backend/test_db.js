const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    const v = await Vehicle.find();
    console.log('Vehicles:', v);
    process.exit(0);
  })
  .catch(console.error);
