const express = require('express');
const llm = require('../services/llm');

const router = express.Router();

router.post('/', async (req, res) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message string required' });
  }
  
  try {
    console.log('📨 Chat request received');
    
    // For now, just return the full response
    // (Groq streaming support can be added later)
    const reply = await llm.generateChatReply(message);
    
    res.json({ 
      success: true,
      reply: reply,
      provider: 'Groq'
    });
    
  } catch (err) {
    console.error('❌ Chat error:', err);
    res.status(500).json({ 
      error: 'Failed to generate reply',
      details: err.message
    });
  }
});

// GET provider info
router.get('/info', (req, res) => {
  const info = llm.getProviderInfo();
  res.json(info);
});

module.exports = router;
