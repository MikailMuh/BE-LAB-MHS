const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
require('dotenv').config();

const authRouter = require('./routes/auth');
const weaponsRouter = require('./routes/weapons');
const transactionsRouter = require('./routes/transactions');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/weapons', weaponsRouter);
app.use('/api/transactions', transactionsRouter);

app.get('/', (req, res) => {
  res.json({ msg: 'Genshin Import API is running' });
});

app.use((req, res) => {
  res.status(404).json({ msg: 'Endpoint not found' });
});

module.exports = app;