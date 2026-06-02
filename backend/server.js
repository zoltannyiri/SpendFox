const express = require('express');

const app = express();
const PORT = 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});