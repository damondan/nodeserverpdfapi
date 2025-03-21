// logic.js
const fs = require('fs').promises;
const path = require('path');
let limit;
let pdfjsLib;
(async () => {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  pdfjsLib = pdfjs;
})();

(async () => {
  const pLimit = (await import('p-limit')).default;
  limit = pLimit(10); // Set the concurrency limit
})();

async function getSubjectsData() {
  const baseDir = __dirname
  try {
    // Read all entries in /app/
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    // Filter for directories only and get their names
    const subjects = entries
      .filter((entry) => entry.isDirectory() && /^[A-Z]/.test(entry.name))
      .map((entry) => entry.name);
    return subjects; 
  } catch (error) {
    console.error('Error reading subjects from /app:', error);
    return []; // Return empty array on error
  }
}

async function getPdfBookTitles(subject) {
  const folderPath = path.join(__dirname, subject); // e.g., /app/Alpha
  try {
    // Read all files in the subject folder
    const files = await fs.readdir(folderPath);
    // Filter for .pdf files and remove the .pdf extension
    const pdfBookTitles = files
      .filter((file) => file.endsWith('.pdf'))
      .map((file) => path.basename(file, '.pdf'));
    return pdfBookTitles; 
  } catch (error) {
    console.error(`Error reading PDF titles from ${subject}:`, error);
    return []; // Return empty array on error
  }
}

const pdfjsDistPath = path.join(__dirname, 'node_modules', 'pdfjs-dist');
const standardFontDataUrl = `file://${path.join(pdfjsDistPath, 'standard_fonts')}/`;
console.log('Resolved pdfjs-dist path:', pdfjsDistPath);
console.log('Standard font data URL:', standardFontDataUrl);

async function searchPdfs(selectedSubject, searchQuery, pdfBookTitles) {
  // Construct the full path to the selected subject's folder.
  const folderPath = path.join(__dirname, selectedSubject);
  // Get the actual PDF titles from the selected subject's folder.
  const actualTitles = await getPdfBookTitles(selectedSubject);
  // Create a map to quickly look up actual titles by their lowercase versions.
  const titleMap = new Map(actualTitles.map((realTitle) => [realTitle.toLowerCase(), realTitle]));

  // Check if the concurrency limit has been set.
  if (!limit) {
    // If not, wait for it to be set.
    await new Promise(resolve => setImmediate(resolve)); // Wait for limit to be set
  }

  // Create an array of promises, each representing the search of a single PDF.
  const pdfPromises = pdfBookTitles.map(async (title) => {
    // Get the actual title from the map, using the lowercase version of the input title.
    const actualTitle = titleMap.get(title.toLowerCase());
    // If no matching actual title is found, log a warning and return null.
    if (!actualTitle) {
      console.warn(`No matching PDF found for title: ${title}`);
      return null;
    }

    // Construct the full path to the PDF file.
    const pdfPath = path.join(folderPath, `${actualTitle}.pdf`);
    try {
      // Read the PDF file as a buffer.
      const dataBuffer = await fs.readFile(pdfPath);
      // Convert the buffer to a Uint8Array, which is required by pdfjsLib.
      const uint8Array = new Uint8Array(dataBuffer);
      // Log the standardFontDataUrl being passed to getDocument.
      console.log('Passing standardFontDataUrl to getDocument:', standardFontDataUrl);
      // Load the PDF document using pdfjsLib.
      const pdf = await pdfjsLib.getDocument({ data: uint8Array,standardFontDataUrl}).promise;
      // Get the number of pages in the PDF.
      const numPages = pdf.numPages;
      // Initialize an array to store the pages that match the search query.
      const matchingPages = [];

      // Iterate through each page of the PDF.
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // Get the current page.
        const page = await pdf.getPage(pageNum);
        // Get the text content of the page.
        const textContent = await page.getTextContent();
        // Extract the text from the text content and join it into a single string.
        const pageText = textContent.items.map((item) => item.str).join(' ').replace(/\n/g, ' ');
        // Create a regular expression to search for the query as a whole word (case-insensitive).
        const wordRegex = new RegExp(`\\b${searchQuery}\\b`, 'i');
        // If the search query is found on the page.
        if (wordRegex.test(pageText)) {
          // Add the page number and the page text to the matchingPages array.
          matchingPages.push({ pageNum, text: pageText });
        }
      }

      // If there are matching pages, return an object with the actual title as the key and the matching pages as the value; otherwise, return null.
      return matchingPages.length > 0 ? { [actualTitle]: matchingPages } : null;
    } catch (error) {
      // If an error occurs while processing the PDF, log the error and return null.
      console.error(`Error processing ${actualTitle}.pdf:`, error);
      return null;
    }
  });

  // Wait for all the PDF search promises to resolve.
  const resultsArray = await Promise.all(pdfPromises);
  // Combine the results into a single object, filtering out any null values.
  return Object.assign({}, ...resultsArray.filter(Boolean));
}


module.exports = { getSubjectsData, getPdfBookTitles, searchPdfs };