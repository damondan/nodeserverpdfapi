const express = require('express');
const apiRoutes = require('./api'); // Import API routes
const cors = require('cors');

const app = express();
const PORT = 3001;
app.use(cors()); 
app.use(express.json());

app.use('/api', apiRoutes); // Mount API routes under /api

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
