require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Conexão com banco de dados
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

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para arquivos estáticos e formulários
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Rota de envio do formulário
app.post('/enviar', upload.fields([
  { name: 'artigo', maxCount: 1 },
  { name: 'termo', maxCount: 1 }
]), (req, res) => {
  const { nome, email, titulo, categoria } = req.body;

  if (!req.files['artigo'] || !req.files['termo']) {
    return res.status(400).send('Ambos os arquivos (artigo e termo) são obrigatórios.');
  }

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
