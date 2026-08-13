const app = require('./app');
const { port } = require('./config/env');
const { startNotificationScheduler } = require('./services/notificationSchedulerService');
const { initSocketServer } = require('./services/socketService');

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startNotificationScheduler();
});

initSocketServer(server);

module.exports = { app, server };
