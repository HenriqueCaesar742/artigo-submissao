require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
  } else {
    console.log('Conectado ao MySQL.');
  }
});

app.use(express.static('public'));

app.post('/enviar', upload.fields([
  { name: 'artigo', maxCount: 1 },
  { name: 'termo', maxCount: 1 }
]), (req, res) => {
  const { nome, email, titulo, categoria } = req.body;
  const artigoPath = req.files['artigo'][0].filename;
  const termoPath = req.files['termo'][0].filename;

  const sql = `
    INSERT INTO artigos (nome, email, titulo, categoria, artigo_path, termo_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [nome, email, titulo, categoria, artigoPath, termoPath], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erro ao salvar os dados.');
    }
    res.send('Artigo enviado com sucesso!');
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
