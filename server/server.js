const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { saveDeviceKeys, getDeviceKeys, savePromptHistory, getPromptHistory } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/tv', express.static(path.join(__dirname, '..')));

// Health check endpoint para o Render.com
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Aura IA Backend Multi-Engine',
    version: '3.2.0',
    timestamp: new Date().toISOString()
  });
});

// GET: Buscar chaves armazenadas no banco de um dispositivo
app.get('/api/device/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = await getDeviceKeys(code);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Dispositivo não encontrado.' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Celular envia Chaves de API para a TV (REST Fallback)
app.post('/api/device/:code/keys', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { geminiKey, chatgptKey, claudeKey, activeProvider } = req.body;

    await saveDeviceKeys(code, geminiKey, chatgptKey, claudeKey, activeProvider);

    // Emite via WebSocket em tempo real para a TV na sala desse código
    io.to(code).emit('keys-updated', {
      geminiKey,
      chatgptKey,
      claudeKey,
      activeProvider,
      timestamp: new Date().toISOString()
    });

    console.log(`🔑 Chaves atualizadas para a TV [${code}]`);
    res.json({ success: true, message: 'Chaves atualizadas e enviadas para a TV!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Celular envia Prompt / Pergunta por Texto para a TV
app.post('/api/device/:code/prompt', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { prompt, provider } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt não informado.' });
    }

    await savePromptHistory(code, prompt, provider);

    // Emite via WebSocket em tempo real para a TV
    io.to(code).emit('prompt-received', {
      prompt,
      provider,
      timestamp: new Date().toISOString()
    });

    console.log(`💬 Prompt enviado para a TV [${code}]: "${prompt}"`);
    res.json({ success: true, message: 'Pergunta enviada para a TV!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rota de Redirecionamento da URL do QR Code (ex: /connect?device=AUR-8924 ou /keys?device=AUR-8924)
app.get(['/connect', '/keys'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io Real-Time Engine
io.on('connection', (socket) => {
  console.log(`🔌 Novo cliente conectado: ${socket.id}`);

  // Entrar na sala do código da TV
  socket.on('join-room', async (data) => {
    const deviceCode = typeof data === 'string' ? data.toUpperCase() : data.deviceCode.toUpperCase();
    socket.join(deviceCode);
    console.log(`📱 Cliente [${socket.id}] entrou na sala da TV [${deviceCode}]`);

    // Busca chaves existentes no banco e sincroniza com quem acabou de entrar
    try {
      const keys = await getDeviceKeys(deviceCode);
      if (keys) {
        socket.emit('keys-updated', keys);
      }
    } catch (e) {
      console.error('Erro ao sincronizar chaves do banco:', e);
    }
  });

  // Atualizar Chaves via WebSocket
  socket.on('update-keys', async (data) => {
    const { deviceCode, geminiKey, chatgptKey, claudeKey, activeProvider } = data;
    const code = deviceCode.toUpperCase();

    await saveDeviceKeys(code, geminiKey, chatgptKey, claudeKey, activeProvider);

    io.to(code).emit('keys-updated', {
      geminiKey,
      chatgptKey,
      claudeKey,
      activeProvider,
      timestamp: new Date().toISOString()
    });
  });

  // Enviar Pergunta via WebSocket
  socket.on('send-prompt', async (data) => {
    const { deviceCode, prompt, provider } = data;
    const code = deviceCode.toUpperCase();

    await savePromptHistory(code, prompt, provider);

    io.to(code).emit('prompt-received', {
      prompt,
      provider,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// Inicialização do Servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor Aura IA Backend rodando na porta ${PORT}`);
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
});
