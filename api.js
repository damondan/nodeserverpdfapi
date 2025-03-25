// api.js
const express = require('express');
const { getSubjectsData, getPdfBookTitles, searchPdfs } = require('./logic');
const router = express.Router();

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
