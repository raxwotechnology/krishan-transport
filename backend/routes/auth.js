const express = require('express');
const router = express.Router();

// Hardcoded Admin Credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin@123';

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // Return a simple success flag and an auth token (mocked for simplicity)
    const token = 'admin_auth_token_secret_' + Date.now();
    return res.json({ 
      success: true, 
      token, 
      user: { username: ADMIN_USER, role: 'admin' } 
    });
  }

  return res.status(401).json({ message: 'Invalid credentials. Access denied.' });
});

module.exports = router;
