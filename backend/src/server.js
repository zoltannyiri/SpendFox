const app = require('./app');
const { port } = require('./config/env');
const { startNotificationScheduler } = require('./services/notificationSchedulerService');

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startNotificationScheduler();
});

module.exports = { app, server };
