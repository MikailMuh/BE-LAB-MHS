const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { type } = req.query; // optional filter ?type=weapon|artifact

  try {
    let sql = 'SELECT * FROM weapons';
    const params = [];

    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to fetch weapons' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM weapons WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Weapon not found' });
    }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/', verifyToken, verifyRole('admin'), async (req, res) => {
  const { name, type, description, stock, image, price } = req.body;


  if (!name || !type || !description || stock == null || !image || price == null) {
    return res.status(400).json({ msg: 'All fields are required' });
  }
  if (!['weapon', 'artifact'].includes(type)) {
    return res.status(400).json({ msg: "Type must be 'weapon' or 'artifact'" });
  }
  if (stock < 0 || price < 0) {
    return res.status(400).json({ msg: 'Stock and price must be non-negative' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO weapons (name, type, description, stock, image, price) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, description, stock, image, price]
    );
    res.status(201).json({
      msg: 'Weapon created successfully',
      data: { id: result.insertId, name, type, description, stock, image, price },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
  const { name, type, description, stock, image, price } = req.body;

  try {
    const [existing] = await db.query('SELECT * FROM weapons WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ msg: 'Weapon not found' });
    }

    const old = existing[0];
    const updated = {
      name: name ?? old.name,
      type: type ?? old.type,
      description: description ?? old.description,
      stock: stock ?? old.stock,
      image: image ?? old.image,
      price: price ?? old.price,
    };

    await db.query(
      'UPDATE weapons SET name = ?, type = ?, description = ?, stock = ?, image = ?, price = ? WHERE id = ?',
      [updated.name, updated.type, updated.description, updated.stock, updated.image, updated.price, req.params.id]
    );

    res.json({ msg: 'Weapon updated successfully', data: { id: Number(req.params.id), ...updated } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM weapons WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: 'Weapon not found' });
    }
    res.json({ msg: 'Weapon deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
