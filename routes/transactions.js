const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
  const { weapon_id, quantity } = req.body;
  const userId = req.user.id;

  if (!weapon_id || !quantity) {
    return res.status(400).json({ msg: 'weapon_id and quantity are required' });
  }
  if (quantity <= 0) {
    return res.status(400).json({ msg: 'Quantity must be greater than 0' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM weapons WHERE id = ? FOR UPDATE', [weapon_id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ msg: 'Weapon not found' });
    }

    const weapon = rows[0];
    if (weapon.stock < quantity) {
      await conn.rollback();
      return res.status(400).json({ msg: 'Insufficient stock' });
    }

    const totalPrice = weapon.price * quantity;

    await conn.query('UPDATE weapons SET stock = stock - ? WHERE id = ?', [quantity, weapon_id]);

    const [result] = await conn.query(
      'INSERT INTO transactions (user_id, weapon_id, quantity, total_price) VALUES (?, ?, ?, ?)',
      [userId, weapon_id, quantity, totalPrice]
    );

    await conn.commit();
    res.status(201).json({
      msg: 'Purchase successful',
      data: { transaction_id: result.insertId, total_price: totalPrice },
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  } finally {
    conn.release();
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.weapon_id, w.name AS weapon_name, t.quantity, t.total_price, t.created_at
       FROM transactions t
       JOIN weapons w ON t.weapon_id = w.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.weapon_id, w.name AS weapon_name, t.quantity, t.total_price, t.created_at
       FROM transactions t
       JOIN weapons w ON t.weapon_id = w.id
       WHERE t.id = ? AND t.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;