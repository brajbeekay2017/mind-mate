const express = require('express');
const router = express.Router();
const broadcaster = require('../services/broadcast');

// SSE stream for team alerts and user-specific events
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userId = req.query.userId || 'anonymous';
  const teamId = req.query.teamId || null;
  const isAdmin = req.query.isAdmin === '1' || req.query.isAdmin === 'true';

  const meta = { userId, teamId, isAdmin };
  const id = broadcaster.subscribe(res, meta);

  req.on('close', () => {
    broadcaster.unsubscribeById(id);
  });
});

// Admins can post alerts to a team
router.post('/alert', (req, res) => {
  const { teamId, message, level = 'info' } = req.body;
  if (!teamId || !message) return res.status(400).json({ error: 'teamId and message required' });

  broadcaster.publish('team-alert', { teamId, message, level, timestamp: Date.now() }, (meta) => {
    // deliver to clients subscribed to the team or to admins
    return meta && (meta.teamId === teamId || meta.isAdmin || !meta.teamId);
  });

  res.json({ ok: true });
});

module.exports = router;
