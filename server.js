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
    res.send(`
  <html>
    <head>
      <title>Sucesso</title>
      <style>
        body { font-family: sans-serif; padding: 30px; }
        .btn { display: inline-block; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Artigo enviado com sucesso!</h1>
      <a class="btn" href="/">Voltar à Página Inicial</a>
    </body>
  </html>
`);

  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// Rota para visualizar documentos
app.get('/documentos', (req, res) => {
  const sql = 'SELECT * FROM artigos';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erro ao recuperar os documentos.');
    }

    // Gerar HTML com a lista de documentos
  let html = `
  <html>
  <head>
    <title>Documentos Enviados</title>
    <style>
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
      th { background-color: #f2f2f2; }
      form { display: inline; }
      .btn { display: inline-block; padding: 10px 15px; background-color: gray; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>Documentos Enviados</h1>
    <a class="btn" href="/">Voltar à Página Inicial</a>
    <table>

          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Título</th>
            <th>Categoria</th>
            <th>Artigo</th>
            <th>Termo</th>
            <th>Ação</th>
          </tr>`;

    results.forEach(doc => {
      html += `
        <tr>
          <td>${doc.id}</td>
          <td>${doc.nome}</td>
          <td>${doc.email}</td>
          <td>${doc.titulo}</td>
          <td>${doc.categoria}</td>
          <td><a href="/uploads/${doc.artigo_path}" target="_blank">Ver Artigo</a></td>
          <td><a href="/uploads/${doc.termo_path}" target="_blank">Ver Termo</a></td>
          <td>
            <form action="/deletar/${doc.id}" method="POST" onsubmit="return confirm('Tem certeza que deseja excluir este documento?');">
              <button type="submit">Excluir</button>
            </form>
          </td>
        </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});

// Rota para deletar documentos
app.post('/deletar/:id', (req, res) => {
  const id = req.params.id;

  // Buscar os caminhos dos arquivos
  db.query('SELECT artigo_path, termo_path FROM artigos WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      console.error(err);
      return res.status(500).send('Erro ao buscar documentos.');
    }

    const { artigo_path, termo_path } = results[0];
    const artigoFullPath = path.join(__dirname, 'uploads', artigo_path);
    const termoFullPath = path.join(__dirname, 'uploads', termo_path);

    // Excluir os arquivos do sistema
    [artigoFullPath, termoFullPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    // Remover do banco
    db.query('DELETE FROM artigos WHERE id = ?', [id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Erro ao excluir do banco.');
      }
      res.redirect('/documentos');
    });
  });
});
