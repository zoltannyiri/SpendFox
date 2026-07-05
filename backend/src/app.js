const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dictionaryRoutes = require('./routes/dictionaryRoutes');
const profileRoutes = require('./routes/profileRoutes');
const pushRoutes = require('./routes/pushRoutes');

const app = express();

app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', dictionaryRoutes);
app.use('/api', profileRoutes);
app.use('/api', pushRoutes);

module.exports = app;
