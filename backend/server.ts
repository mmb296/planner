const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Example route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
