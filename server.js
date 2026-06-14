require('dotenv').config(); 

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


db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed! Check if MySQL Server is running:', err.message);
    } else {
        console.log('✅ Connected successfully! JavaScript is linked to your MySQL tables securely.');
        connection.release();
    }
});


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


app.post('/api/create/:table', (req, res) => {
    const tableKey = req.params.table.toLowerCase();
    const actualTableName = physicalTableCasing[tableKey] || tableKey;
    const sanitizedBody = cleanPayloadData(req.body);
    
    db.query('INSERT INTO ?? SET ?', [actualTableName, sanitizedBody], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});


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


app.delete('/api/delete/:table', (req, res) => {
    const tableKey = req.params.table.toLowerCase();
    const actualTableName = physicalTableCasing[tableKey] || tableKey;
    const keys = tableKeyMappings[tableKey];
    
    if (!keys) return res.status(400).json({ error: "Invalid table configuration" });

    let deleteSql = '';
    let queryParams = [actualTableName];

    // ✨ BULLETPROOF CASCADING OVERRIDE CHECK
    const holdsPagibigId = keys.includes('Pagibig_ID');
    const hasTargetedId = req.query.Pagibig_ID !== undefined && req.query.Pagibig_ID !== null;
    
    // Check if any composite keys beyond Pagibig_ID are missing in the request query parameters
    const isMissingSecondaryKeys = keys.some(k => k !== 'Pagibig_ID' && !req.query[k]);

    if (holdsPagibigId && hasTargetedId && isMissingSecondaryKeys) {
        // If secondary keys like Heir_Code or Employer_ID are missing, force a sweeping cascade delete!
        deleteSql = `DELETE FROM ?? WHERE Pagibig_ID = ?`;
        queryParams.push(req.query.Pagibig_ID);
    } else {
        // Safe fallback to original row-specific composite key logic
        let whereClauses = [];
        keys.forEach(k => {
            whereClauses.push(`?? = ?`);
            queryParams.push(k, req.query[k]);
        });
        deleteSql = `DELETE FROM ?? WHERE ${whereClauses.join(' AND ')}`;
    }
    
    db.query(deleteSql, queryParams, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log('🚀 Administrative server tracking on port 3000.'));