require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Increase limit for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- Helper ---
// Convert flat SQL rows (joined) into nested JSON structure
const formatItems = (rows) => {
    const itemsMap = {};
    
    rows.forEach(row => {
        if (!itemsMap[row.id]) {
            itemsMap[row.id] = {
                id: row.id,
                itemCode: row.itemCode,
                prNumber: row.prNumber,
                description: row.description,
                weight: Number(row.weight),
                prQty: Number(row.prQty),
                requiredQty: Number(row.requiredQty),
                receivedQty: Number(row.receivedQty),
                projectId: row.projectId,
                usage: []
            };
        }

        if (row.usage_id) {
            itemsMap[row.id].usage.push({
                id: row.usage_id,
                projectId: row.usage_projectId,
                quantity: Number(row.usage_quantity),
                date: row.usage_date,
                issuedTo: row.usage_issuedTo,
                issueSlipImage: row.usage_issueSlipImage
            });
        }
    });

    return Object.values(itemsMap);
};

// --- ROUTES ---

// GET All Items
app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await db.execute(`
        SELECT 
            i.*, 
            u.id as usage_id, 
            u.projectId as usage_projectId, 
            u.quantity as usage_quantity, 
            u.date as usage_date,
            u.issuedTo as usage_issuedTo,
            u.issueSlipImage as usage_issueSlipImage
        FROM items i 
        LEFT JOIN usage_logs u ON i.id = u.itemId
        ORDER BY i.created_at DESC
    `);
    res.json(formatItems(rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST Batch (CSV Upload)
app.post('/api/inventory/batch', async (req, res) => {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Invalid data" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const query = `INSERT INTO items (id, itemCode, prNumber, description, weight, prQty, requiredQty, receivedQty, projectId) VALUES ?`;
        
        const values = items.map(item => [
            crypto.randomUUID(),
            item.itemCode,
            item.prNumber,
            item.description,
            item.weight,
            item.prQty,
            item.requiredQty,
            item.receivedQty,
            item.projectId
        ]);

        await connection.query(query, [values]);
        await connection.commit();
        
        res.status(201).json({ message: "Batch import successful" });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// POST Single Item
app.post('/api/inventory', async (req, res) => {
  const { itemCode, prNumber, description, weight, prQty, requiredQty, receivedQty, projectId } = req.body;
  const id = crypto.randomUUID();
  
  try {
    await db.execute(
        `INSERT INTO items (id, itemCode, prNumber, description, weight, prQty, requiredQty, receivedQty, projectId) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, itemCode, prNumber, description, weight, prQty, requiredQty, receivedQty, projectId]
    );
    
    res.status(201).json({ 
        id, itemCode, prNumber, description, weight, prQty, requiredQty, receivedQty, projectId, usage: [] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT Update Item
app.put('/api/inventory/:id', async (req, res) => {
  const { itemCode, prNumber, description, weight, prQty, requiredQty, receivedQty, projectId } = req.body;
  try {
    await db.execute(
        `UPDATE items SET itemCode=?, prNumber=?, description=?, weight=?, prQty=?, requiredQty=?, receivedQty=?, projectId=? WHERE id=?`,
        [itemCode, prNumber, description, weight, prQty, requiredQty, receivedQty, projectId, req.params.id]
    );
    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Item
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM items WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Add Usage
app.post('/api/inventory/:id/usage', async (req, res) => {
  const { projectId, quantity, date, issuedTo, issueSlipImage } = req.body;
  const usageId = crypto.randomUUID();
  
  try {
    await db.execute(
        `INSERT INTO usage_logs (id, itemId, projectId, quantity, date, issuedTo, issueSlipImage) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [usageId, req.params.id, projectId, quantity, date, issuedTo, issueSlipImage || null]
    );
    res.status(201).json({ id: usageId, projectId, quantity, date, issuedTo, issueSlipImage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Usage
app.delete('/api/inventory/:itemId/usage/:usageId', async (req, res) => {
  try {
    await db.execute('DELETE FROM usage_logs WHERE id = ?', [req.params.usageId]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});