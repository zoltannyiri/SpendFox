const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dictionaryRoutes = require('./routes/dictionaryRoutes');
const profileRoutes = require('./routes/profileRoutes');
const pushRoutes = require('./routes/pushRoutes');
const emailRoutes = require('./routes/emailRoutes');
const appVersionRoutes = require('./routes/appVersionRoutes');
const legalRoutes = require('./routes/legalRoutes');
const friendRoutes = require('./routes/friendRoutes');
const messageRoutes = require('./routes/messageRoutes');
const profileActivityRoutes = require('./routes/profileActivityRoutes');
const feedRoutes = require('./routes/feedRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', dictionaryRoutes);
app.use('/api', profileRoutes);
app.use('/api', pushRoutes);
app.use('/api', emailRoutes);
app.use('/api', appVersionRoutes);
app.use('/api', friendRoutes);
app.use('/api', messageRoutes);
app.use('/api', profileActivityRoutes);
app.use('/api', feedRoutes);
app.use(legalRoutes);

module.exports = app;
