const app = require('./app');
const { port } = require('./config/env');

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = { app, server };
