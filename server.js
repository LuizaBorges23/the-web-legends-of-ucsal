/**
 * THE WEB LEGENDS OF UCSAL - SECURE BACKEND SERVER
 * Express server providing secure student authentication, password hashing, and user persistence.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Função auxiliar para carregar usuários do arquivo JSON
function carregarUsuarios() {
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Erro ao ler users.json:", e);
    return [];
  }
}

// Função auxiliar para salvar usuários no arquivo JSON
function salvarUsuarios(usuarios) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2), 'utf8');
}

// Função para gerar hash seguro de senha com salt (PBKDF2)
function hashSenha(senha, saltOriginal) {
  const salt = saltOriginal || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(senha, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

// Endpoint de Registro / Cadastro
app.post('/api/register', (req, res) => {
  const { nome, senha } = req.body;
  
  if (!nome || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nome e senha são obrigatórios.' });
  }

  const usuarios = carregarUsuarios();
  const usuarioExistente = usuarios.find(u => u.nome.toLowerCase() === nome.toLowerCase());

  if (usuarioExistente) {
    return res.status(400).json({ sucesso: false, mensagem: 'Este nome de usuário já está cadastrado.' });
  }

  const { salt, hash } = hashSenha(senha);
  const novoUsuario = {
    id: crypto.randomUUID(),
    nome: nome.trim(),
    salt,
    hash,
    criadoEm: new Date().toISOString()
  };

  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);

  res.json({ sucesso: true, mensagem: 'Usuário cadastrado com sucesso!', nome: novoUsuario.nome });
});

// Endpoint de Login Seguro
app.post('/api/login', (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nome e senha são obrigatórios.' });
  }

  const usuarios = carregarUsuarios();
  let usuario = usuarios.find(u => u.nome.toLowerCase() === nome.toLowerCase());

  // Se o usuário não existir, cadastra automaticamente para facilitar a experiência do estudante
  if (!usuario) {
    const { salt, hash } = hashSenha(senha);
    usuario = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      salt,
      hash,
      criadoEm: new Date().toISOString()
    };
    usuarios.push(usuario);
    salvarUsuarios(usuarios);
    return res.json({ sucesso: true, mensagem: 'Novo usuário cadastrado e logado com sucesso!', nome: usuario.nome });
  }

  // Validação segura de senha
  const { hash: hashTeste } = hashSenha(senha, usuario.salt);
  if (hashTeste !== usuario.hash) {
    return res.status(401).json({ sucesso: false, mensagem: 'Senha incorreta. Verifique suas credenciais.' });
  }

  res.json({ sucesso: true, mensagem: 'Login realizado com sucesso!', nome: usuario.nome });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend seguro rodando em http://localhost:${PORT}`);
});
