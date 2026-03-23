const express = require('express');
const router = express.Router();

// Force logout all users - just a stub for now
router.post('/force-logout', async (req, res) => {
  try {
    console.log('force-logout invoked');
    // In a real implementation you'd clear session store or tokens.
    return res.json({ success: true, message: 'All users logged out (stub)' });
  } catch (error) {
    console.error('Error forcing logout:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
