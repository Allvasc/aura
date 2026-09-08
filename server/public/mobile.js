let socket = null;
let currentDeviceCode = '';
let currentProvider = 'gemini';

// Elements
const deviceCodeInput = document.getElementById('device-code-input');
const btnConnectDevice = document.getElementById('btn-connect-device');
const statusPill = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

const keyGemini = document.getElementById('key-gemini');
const keyChatgpt = document.getElementById('key-chatgpt');
const keyClaude = document.getElementById('key-claude');
const btnSaveKeys = document.getElementById('btn-save-keys');

const promptInput = document.getElementById('prompt-input');
const btnSendPrompt = document.getElementById('btn-send-prompt');
const btnPromptMic = document.getElementById('btn-prompt-mic');
const toastEl = document.getElementById('toast');

document.addEventListener('DOMContentLoaded', () => {
  // Ler código do dispositivo pela URL ?device=AUR-8924 ou ?code=AUR-8924
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get('device') || urlParams.get('code') || localStorage.getItem('aura_mobile_device_code') || '';

  if (codeFromUrl) {
    deviceCodeInput.value = codeFromUrl.toUpperCase();
    currentDeviceCode = codeFromUrl.toUpperCase();
  }

  // Carregar chaves salvas no celular
  keyGemini.value = localStorage.getItem('key_gemini') || '';
  keyChatgpt.value = localStorage.getItem('key_chatgpt') || '';
  keyClaude.value = localStorage.getItem('key_claude') || '';

  initSocketConnection();
  setupEventListeners();
});

function initSocketConnection() {
  socket = io();

  socket.on('connect', () => {
    updateStatus(true, 'Conectado ao Servidor');
    if (currentDeviceCode) {
      connectToDeviceRoom(currentDeviceCode);
    }
  });

  socket.on('disconnect', () => {
    updateStatus(false, 'Desconectado');
  });

  socket.on('keys-updated', (data) => {
    if (data.geminiKey) keyGemini.value = data.geminiKey;
    if (data.chatgptKey) keyChatgpt.value = data.chatgptKey;
    if (data.claudeKey) keyClaude.value = data.claudeKey;
    if (data.activeProvider) {
      currentProvider = data.activeProvider;
      updateProviderUI(currentProvider);
    }
  });
}

function connectToDeviceRoom(code) {
  if (!code || code.trim() === '') return;
  currentDeviceCode = code.trim().toUpperCase();
  localStorage.setItem('aura_mobile_device_code', currentDeviceCode);
  socket.emit('join-room', { deviceCode: currentDeviceCode });
  updateStatus(true, `TV ${currentDeviceCode}`);
  showToast(`Conectado à TV ${currentDeviceCode}!`);
}

function updateStatus(isOnline, text) {
  statusText.textContent = text;
  if (isOnline) {
    statusPill.className = 'status-pill online';
  } else {
    statusPill.className = 'status-pill offline';
  }
}

function setupEventListeners() {
  btnConnectDevice.addEventListener('click', () => {
    connectToDeviceRoom(deviceCodeInput.value);
  });

  // Botões de Provedor de IA
  document.querySelectorAll('.btn-provider').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-provider').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentProvider = btn.getAttribute('data-provider');
    });
  });

  // Botões de Colar Chave
  document.querySelectorAll('.btn-paste').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-target');
      const inputEl = document.getElementById(targetId);
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          inputEl.value = text.trim();
          showToast('Chave colada com sucesso!');
        }
      } catch (err) {
        showToast('Cole a chave manualmente no campo.');
      }
    });
  });

  // Salvar Chaves e Enviar para a TV
  btnSaveKeys.addEventListener('click', () => {
    if (!currentDeviceCode) {
      showToast('Por favor, informe o Código da TV acima!');
      return;
    }

    const payload = {
      deviceCode: currentDeviceCode,
      geminiKey: keyGemini.value.trim(),
      chatgptKey: keyChatgpt.value.trim(),
      claudeKey: keyClaude.value.trim(),
      activeProvider: currentProvider
    };

    // Salva localmente no celular
    localStorage.setItem('key_gemini', payload.geminiKey);
    localStorage.setItem('key_chatgpt', payload.chatgptKey);
    localStorage.setItem('key_claude', payload.claudeKey);

    // Envia via WebSocket e REST
    socket.emit('update-keys', payload);
    fetch(`/api/device/${currentDeviceCode}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error(e));

    showToast('✨ Chaves salvas e enviadas para a TV!');
  });

  // Enviar Pergunta para a TV
  btnSendPrompt.addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      showToast('Digite uma pergunta primeiro!');
      return;
    }
    if (!currentDeviceCode) {
      showToast('Informe o Código da TV!');
      return;
    }

    const payload = {
      deviceCode: currentDeviceCode,
      prompt: prompt,
      provider: currentProvider
    };

    socket.emit('send-prompt', payload);
    fetch(`/api/device/${currentDeviceCode}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error(e));

    showToast('💬 Pergunta enviada para a TV!');
    promptInput.value = '';
  });

  // Ditado por Voz no Celular
  if (btnPromptMic) {
    btnPromptMic.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('Navegador celular não suporta ditado.');
        return;
      }

      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.onstart = () => showToast('🎙️ Ouvindo celular...');
      rec.onresult = (e) => {
        promptInput.value = e.results[0][0].transcript;
      };
      rec.start();
    });
  }
}

function updateProviderUI(provider) {
  document.querySelectorAll('.btn-provider').forEach(btn => {
    if (btn.getAttribute('data-provider') === provider) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000);
}
