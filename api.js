// api.js
const express = require('express');
const { getSubjectsData, getPdfBookTitles, searchPdfs } = require('./logic');
const crypto = require('crypto');
const router = express.Router();

const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
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
-----END OPENSSH PRIVATE KEY-----`;

// GET /api/subjects - Returns JSON with folder names (subjects)
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await getSubjectsData();
    res.json(subjects); // e.g., ["Alpha", "Bravo"]
  } catch (error) {
    console.error('API Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// GET /api/pdf-titles/:subject - Returns JSON with PDF titles for a subject
router.get('/pdf-titles/:subject', async (req, res) => {
  try {
    const { subject } = req.params; // e.g., "Alpha"
    const pdfTitles = await getPdfBookTitles(subject);
    res.json(pdfTitles); // e.g., ["Book1", "Book2"]
  } catch (error) {
    console.error(`API Error fetching PDF titles for ${req.params.subject}:`, error);
    res.status(500).json({ error: 'Failed to fetch PDF titles' });
  }
});

router.post('/searchquery', async (req, res) => {
  try {
    const { selectedSubject, searchQuery, pdfBookTitles } = req.body;
    if (!selectedSubject || !searchQuery || !pdfBookTitles) {
      return res.status(400).json({ error: 'Missing selectedSubject, searchQuery, or pdfBookTitles' });
    }

    if (pdfBookTitles.length > 25) {
      return res.status(400).json({ error: 'Too many titles, max 25 allowed' });
    }
    req.setTimeout(300000);
    const results = await searchPdfs(selectedSubject, searchQuery, pdfBookTitles);
    const total = Object.values(results).reduce((sum, pages) => sum + pages.length, 0);

    res.json({
      message: 'Search completed',
      results, 
      total,
    });
  } catch (error) {
    console.error('API Error processing search:', error);
    res.status(500).json({ error: 'Failed to process search' });
  }
});

module.exports = router;
