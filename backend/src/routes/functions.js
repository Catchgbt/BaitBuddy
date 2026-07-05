import express from 'express';

const router = express.Router();

router.get('/functions/manifest', (req, res) => {
  res.json({
    version: '1.0.0',
    functions: [],
    timestamp: new Date().toISOString()
  });
});

export default router;
