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

const standardFontDataUrl = `file://${path.join(
  path.dirname(require.resolve('pdfjs-dist')),
  '..',
  'standard_fonts'
)}`;

async function searchPdfs(selectedSubject, searchQuery, pdfBookTitles) {
  const folderPath = path.join(__dirname, selectedSubject);
  const actualTitles = await getPdfBookTitles(selectedSubject);
  const titleMap = new Map(actualTitles.map((realTitle) => [realTitle.toLowerCase(), realTitle]));

  if (!limit) {
    await new Promise(resolve => setImmediate(resolve)); // Wait for limit to be set
  }

  const pdfPromises = pdfBookTitles.map(async (title) => {
    const actualTitle = titleMap.get(title.toLowerCase());
    if (!actualTitle) {
      console.warn(`No matching PDF found for title: ${title}`);
      return null;
    }

    const pdfPath = path.join(folderPath, `${actualTitle}.pdf`);
    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const uint8Array = new Uint8Array(dataBuffer);
      // Use pdfjsLib to load the PDF
      console.log('Passing standardFontDataUrl to getDocument:', standardFontDataUrl);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array},standardFontDataUrl).promise;
      const numPages = pdf.numPages;
      const matchingPages = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ').replace(/\n/g, ' ');
        const wordRegex = new RegExp(`\\b${searchQuery}\\b`, 'i');
        if (wordRegex.test(pageText)) {
          matchingPages.push({ pageNum, text: pageText });
        }
      }

      return matchingPages.length > 0 ? { [actualTitle]: matchingPages } : null;
    } catch (error) {
      console.error(`Error processing ${actualTitle}.pdf:`, error);
      return null;
    }
  });

  const resultsArray = await Promise.all(pdfPromises);
  return Object.assign({}, ...resultsArray.filter(Boolean));
}

// Example usage
//searchPdfs('books', 'example', ['Book1', 'Book2']).then(console.log);

// async function searchPdfs(selectedSubject, searchQuery, pdfBookTitles) {
//   const folderPath = path.join(__dirname, selectedSubject);
//   const actualTitles = await getPdfBookTitles(selectedSubject);
//   const results = {};
//   //MAP transforing into a new array of key value pairs -
//   const titleMap = new Map(
//     actualTitles.map((realTitle) => [realTitle.toLowerCase(), realTitle])
//   );

//   //Begin iterating through titles received from the front end
//   for (const title of pdfBookTitles) {
//     //titleMap.get is searching to see if title exists in the map - title.toLowerCase is the key
//     const actualTitle = titleMap.get(title.toLowerCase());
//     if (!actualTitle) {
//       console.warn(`No matching PDF found for title: ${title}`);
//       continue;
//     }

//     const pdfPath = path.join(folderPath, `${actualTitle}.pdf`);
//     try {
//       // Read the PDF file and get the number of pages
//       const dataBuffer = await fs.readFile(pdfPath);
//       const uint8Array = new Uint8Array(dataBuffer);
//       const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
//       console.log('PDF: ' + pdf);
//       const numPages = pdf.numPages;
//       const matchingPages = [];

//       // Iterate through each page
//       for (let pageNum = 1; pageNum <= numPages; pageNum++) {
//         const page = await pdf.getPage(pageNum);
//         const textContent = await page.getTextContent();
//         const pageText = textContent.items.map((item) => item.str).join(' ').replace(/\n/g, ' ');

//         const wordRegex = new RegExp(`\\b${searchQuery}\\b`, 'i');
        
//         if (wordRegex.test(pageText)) {
//           matchingPages.push({
//             pageNum,
//             text: pageText,
//           });
//         }
//         console.log('Matching Pages: ' + matchingPages);
//       }

//       if (matchingPages.length > 0) {
//         results[actualTitle] = matchingPages;
//       }
//     } catch (error) {
//       console.error(`Error processing ${actualTitle}.pdf:`, error);
//     }
//   }

//   return results;
// }

module.exports = { getSubjectsData, getPdfBookTitles, searchPdfs };
