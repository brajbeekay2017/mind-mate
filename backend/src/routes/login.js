const express = require('express');
const router = express.Router();

// Simple in-memory user storage (in production, use a database)
const users = {
  'demo@mindmate.com': 'password123',
  'user@mindmate.com': 'securepass'
};

// Simple function to get user ID from email
function getUserIdFromEmail(email) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Login endpoint
router.post('/', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Check if user exists and password matches
    if (users[email] && users[email] === password) {
      // In production, generate a real JWT token
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      const userId = getUserIdFromEmail(email);
      
      return res.status(200).json({
        success: true,
        token: token,
        userId: userId,
        user: { email: email, userId: userId },
        message: 'Login successful'
      });
    } else {
      // Invalid credentials
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error during login'
    });
  }
});

module.exports = router;
