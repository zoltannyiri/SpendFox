const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', authRoutes);

module.exports = app;
