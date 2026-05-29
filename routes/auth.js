var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

function generateToken(user){
  return jwt.sign(
    {id: user.id, role: user.role, email: user.email},
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword} = req.body;

  if(!username || !email || !password || !confirmPassword){
    return res.status(400).json({ msg: 'All fields are required'});
  }
  if(password.length < 8){
    return res.status(400).json({ msg: 'Password must be at least 8 characters long'});
  }
  if(password !== confirmPassword){
    return res.status(400).json({ msg: 'Password and confirm password do not match'});
  }

  try{
    const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if(existing.length > 0){
      return res.status(400).json({ msg: 'Email already in use'});
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashed, 'user']
    );

    const user = { id: result.insertId, username, email, role: 'user' };
    const token = generateToken(user);
    res.status(201).json({
      msg: 'User registered successfully',
      user_id: result.insertId,
      token
    });
  }catch(err){
    console.error(err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/oauth-failed' }),
  (req, res)=>{
    const token = generateToken(req.user);
    res.json({
      msg: 'Google OAuth login successful',
      data: {user_id: req.user.id, token},
    });
  }
);

router.get('/oauth-failed', (req, res) => {
  res.status(401).json({ msg: 'OAuth authentication failed' });
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
