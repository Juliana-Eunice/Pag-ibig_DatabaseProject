require('dotenv').config(); // 💡 Injects local .env key-value pairs into system memory safely

function cleanPayloadData(dataObject) {
    const cleaned = { ...dataObject };
    for (const key in cleaned) {
        if (cleaned[key] === '') {
            cleaned[key] = null;
        }
    }
    return cleaned;
}

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json());

// --- DATABASE CONNECTION CONFIGURATION (SECURED 🔒) ---
const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',       
    user: process.env.DB_USER || 'root',            
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME || 'im_project',  
    port: parseInt(process.env.DB_PORT || '3306', 10),              
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verify connection immediately upon launch
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed! Check if MySQL Server is running:', err.message);
    } else {
        console.log('✅ Connected successfully! JavaScript is linked to your MySQL tables securely.');
        connection.release();
    }
});

// --- CASE MAPPING CONFIGURATION ---
const physicalTableCasing = {
    member: 'Member',
    contact: 'Contact',
    employment: 'Employment',
    prevemployment: 'PrevEmployment',
    heir: 'Heir',
    governmentid: 'GovernmentID',
    employer: 'Employer'
};

const tableKeyMappings = {
    member: ['Pagibig_ID'],
    contact: ['Pagibig_ID'],
    employment: ['Pagibig_ID'],
    governmentid: ['Pagibig_ID'],
    employer: ['Employer_ID'],
    prevemployment: ['Pagibig_ID', 'Employer_ID'], 
    heir: ['Pagibig_ID', 'Heir_Code']              
};

// --- DYNAMIC API ROUTE HANDLERS ---

// [READ] Data API
app.get('/api/table/:name', (req, res) => {
    const tableKey = req.params.name.toLowerCase();
    const actualTableName = physicalTableCasing[tableKey] || tableKey;

    db.query('SELECT * FROM ??', [actualTableName], (err, results) => {
        if (err) {
            console.error('SQL Error on GET:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// [CREATE] Data API
app.post('/api/create/:table', (req, res) => {
    const tableKey = req.params.table.toLowerCase();
    const actualTableName = physicalTableCasing[tableKey] || tableKey;
    const sanitizedBody = cleanPayloadData(req.body);
    
    db.query('INSERT INTO ?? SET ?', [actualTableName, sanitizedBody], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

// [UPDATE] Data API
app.put('/api/update/:table', (req, res) => {
    const tableKey = req.params.table.toLowerCase();
    const actualTableName = physicalTableCasing[tableKey] || tableKey;
    const sanitizedBody = cleanPayloadData(req.body);
    const keys = tableKeyMappings[tableKey];
    
    if (!keys) return res.status(400).json({ error: "Invalid table configuration" });

    let whereClauses = [];
    let queryParams = [actualTableName, sanitizedBody]; 
    
    keys.forEach(k => {
        whereClauses.push(`?? = ?`);
        queryParams.push(k, req.query[k]); 
    });

    const updateSql = `UPDATE ?? SET ? WHERE ${whereClauses.join(' AND ')}`;
    
    db.query(updateSql, queryParams, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// [DELETE] Data API
app.delete('/api/delete/:table', (req, res) => {
    const tableKey = req.params.table.toLowerCase();
    const actualTableName = physicalTableCasing[tableKey] || tableKey;
    const keys = tableKeyMappings[tableKey];
    
    if (!keys) return res.status(400).json({ error: "Invalid table configuration" });

    let whereClauses = [];
    let queryParams = [actualTableName];
    
    keys.forEach(k => {
        whereClauses.push(`?? = ?`);
        queryParams.push(k, req.query[k]);
    });

    const deleteSql = `DELETE FROM ?? WHERE ${whereClauses.join(' AND ')}`;
    
    db.query(deleteSql, queryParams, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log('🚀 Administrative server tracking on port 3000.'));