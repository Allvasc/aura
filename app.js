// State Management
let currentProvider = 'gemini'; // 'gemini', 'chatgpt', 'claude'

let currentFocusIndex = 0;
let focusableElements = [];
let isListening = false;
let isSpeaking = false;
let currentUtterance = null;
let currentDeviceCode = 'AUR-8924';

// DOM Elements
const clockDisplay = document.getElementById('clock-display');
const dateDisplay = document.getElementById('date-display');
const queryInput = document.getElementById('query-input');
const btnMic = document.getElementById('btn-mic');
const btnSend = document.getElementById('btn-send');
const btnConfig = document.getElementById('btn-config');
const btnMobile = document.getElementById('btn-mobile');
const btnAccount = document.getElementById('btn-account');
const activeProviderBadge = document.getElementById('active-provider-badge');

const statusText = document.getElementById('status-text');
const aiOrb = document.getElementById('ai-orb');
const responseCard = document.getElementById('response-card');
const responseText = document.getElementById('response-text');
const responseProviderLabel = document.getElementById('response-provider-label');
const btnSpeak = document.getElementById('btn-speak');
const btnStop = document.getElementById('btn-stop');

// Modais
const configModal = document.getElementById('config-modal');
const keyGeminiInput = document.getElementById('key-gemini-input');
const keyChatgptInput = document.getElementById('key-chatgpt-input');
const keyClaudeInput = document.getElementById('key-claude-input');
const btnSaveKey = document.getElementById('btn-save-key');
const btnCloseModal = document.getElementById('btn-close-modal');

const mobileModal = document.getElementById('mobile-modal');
const qrCodeImg = document.getElementById('qr-code-img');
const mobileUrlLabel = document.getElementById('mobile-url-label');
const btnCloseMobile = document.getElementById('btn-close-mobile');

const accountModal = document.getElementById('account-modal');
const pairCodeText = document.getElementById('pair-code');
const btnSimulateActivate = document.getElementById('btn-simulate-activate');
const btnCloseAccount = document.getElementById('btn-close-account');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  generatePairCode();
  updateClock();
  setInterval(updateClock, 1000);
  setupFocusableElements();
  setupEventListeners();
  loadSavedApiKeys();
});

// Clock & Date Updates
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  if (clockDisplay) {
    clockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
  }

  if (dateDisplay) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = now.toLocaleDateString('pt-BR', options);
    dateDisplay.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }
}

// Focus Management for TV Remote Navigation
function setupFocusableElements() {
  focusableElements = Array.from(document.querySelectorAll('.focusable:not(.hidden)'));
  if (focusableElements.length > 0) {
    currentFocusIndex = 0;
    setFocus(currentFocusIndex);
  }
}

function setFocus(index) {
  focusableElements.forEach(el => el.classList.remove('focused'));
  if (focusableElements[index]) {
    focusableElements[index].classList.add('focused');
    focusableElements[index].focus();
  }
}

// Remote D-Pad & Color Keys Event Listener
document.addEventListener('keydown', (e) => {
  const isAnyModalOpen = !configModal.classList.contains('hidden') || 
                         !mobileModal.classList.contains('hidden') || 
                         !accountModal.classList.contains('hidden');

  switch (e.key) {
    case 'ArrowRight':
      navigateFocus(1);
      break;
    case 'ArrowLeft':
      navigateFocus(-1);
      break;
    case 'ArrowDown':
      navigateFocus(2);
      break;
    case 'ArrowUp':
      navigateFocus(-2);
      break;
    case 'Enter':
      if (document.activeElement && document.activeElement.click) {
        document.activeElement.click();
      }
      break;

    // Botões Coloridos do Controle LG (Red, Green, Yellow, Blue)
    case 'Red':
    case '403': // Botão Vermelho: Limpar
      queryInput.value = '';
      responseCard.classList.add('hidden');
      stopSpeech();
      updateStatus('Limpo! Escolha um atalho ou faça uma nova pergunta.');
      break;
    case 'Green':
    case '404': // Botão Verde: Ativar Microfone por Voz
      toggleVoiceRecognition();
      break;
    case 'Yellow':
    case '405': // Botão Amarelo: Ouvir a resposta em áudio novamente
      if (responseText.textContent) speakText(responseText.textContent);
      break;
    case 'Blue':
    case '406': // Botão Azul: Abrir Configurações
      openConfigModal();
      break;

    // Teclas de Mídia do Controle LG
    case 'MediaPlay':
    case '415':
      if (responseText.textContent) speakText(responseText.textContent);
      break;
    case 'MediaPause':
    case 'MediaStop':
    case '19':
    case '413':
      stopSpeech();
      break;

    // Tecla Voltar (Back)
    case 'Back':
    case 'Escape':
    case 'U+001B':
    case '461': // LG webOS Back key code
      if (isAnyModalOpen) {
        closeAllModals();
      } else {
        stopSpeech();
      }
      break;
  }
});

function navigateFocus(direction) {
  if (focusableElements.length === 0) return;
  currentFocusIndex = (currentFocusIndex + direction + focusableElements.length) % focusableElements.length;
  setFocus(currentFocusIndex);
}

// Event Listeners
function setupEventListeners() {
  btnSend.addEventListener('click', () => handleQuery(queryInput.value));
  btnMic.addEventListener('click', toggleVoiceRecognition);
  btnConfig.addEventListener('click', openConfigModal);
  btnCloseModal.addEventListener('click', closeConfigModal);
  btnSaveKey.addEventListener('click', saveApiKeys);

  btnMobile.addEventListener('click', openMobileModal);
  btnCloseMobile.addEventListener('click', closeMobileModal);

  btnAccount.addEventListener('click', openAccountModal);
  btnCloseAccount.addEventListener('click', closeAccountModal);
  btnSimulateActivate.addEventListener('click', activateVipAccount);

  btnSpeak.addEventListener('click', () => speakText(responseText.textContent));
  btnStop.addEventListener('click', stopSpeech);

  // Provider Choice Buttons (DENTRO do Modal de Configurações)
  document.querySelectorAll('.provider-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentProvider = btn.getAttribute('data-provider');
      localStorage.setItem('aura_active_provider', currentProvider);
      syncProviderChoiceButtons();
      updateProviderBadge();
    });
  });

  // Shortcut Buttons
  document.querySelectorAll('.shortcut-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      queryInput.value = prompt;
      handleQuery(prompt);
    });
  });

  // Enter Key on Input
  queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleQuery(queryInput.value);
    }
  });
}

// Voice Recognition (Web Speech Recognition API)
function toggleVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    updateStatus('Seu controle/navegador não suporta ditado por voz direto. Use a digitação.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    setOrbState('listening');
    updateStatus('🎙️ Ouvindo você... Fale agora!');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    queryInput.value = transcript;
    updateStatus(`Você disse: "${transcript}"`);
    handleQuery(transcript);
  };

  recognition.onerror = () => {
    isListening = false;
    setOrbState('idle');
    updateStatus('Não entendi bem. Tente novamente ou use os atalhos!');
  };

  recognition.onend = () => {
    isListening = false;
    if (!isSpeaking) setOrbState('idle');
  };

  recognition.start();
}

// Multi-AI Dispatcher (Gemini, ChatGPT, Claude)
async function handleQuery(query) {
  if (!query || query.trim() === '') {
    updateStatus('Por favor, faça uma pergunta ou escolha um atalho!');
    return;
  }

  stopSpeech();
  setOrbState('thinking');
  responseCard.classList.add('hidden');

  let providerName = 'Google Gemini';
  if (currentProvider === 'chatgpt') providerName = 'OpenAI ChatGPT';
  if (currentProvider === 'claude') providerName = 'Anthropic Claude';

  updateStatus(`✨ O Aura IA está consultando o ${providerName}...`);

  let reply = '';
  try {
    if (currentProvider === 'gemini') {
      reply = await fetchGemini(query);
    } else if (currentProvider === 'chatgpt') {
      reply = await fetchChatGPT(query);
    } else if (currentProvider === 'claude') {
      reply = await fetchClaude(query);
    }
    displayResponse(reply, providerName);
  } catch (err) {
    console.error('Erro na API:', err);
    displayResponse(`Ops! Ocorreu um problema ao conectar com o ${providerName}. Verifique sua chave da API ou conexão de internet.`, providerName);
  }
}

// Google Gemini API (gemini-3.6-flash)
async function fetchGemini(query) {
  const apiKey = localStorage.getItem('key_gemini');
  if (!apiKey) {
    return "Para usar o Google Gemini, por favor insira sua chave da API do Gemini no botão ⚙️ Keys no topo da tela ou pelo celular!";
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Você é o Aura IA (Provedor Google Gemini), um assistente virtual futurista e amigável para uma Smart TV LG. Responda de forma clara, direta e concisa em português do Brasil: ${query}`
        }]
      }]
    })
  });

  const data = await response.json();
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Resposta inválida do Gemini");
}

// OpenAI ChatGPT API (GPT-4o-mini)
async function fetchChatGPT(query) {
  const apiKey = localStorage.getItem('key_chatgpt');
  if (!apiKey) {
    return "Para usar o OpenAI ChatGPT, por favor insira sua chave da API da OpenAI no botão ⚙️ Keys no topo da tela ou pelo celular!";
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é o Aura IA (Provedor OpenAI ChatGPT), um assistente virtual futurista para Smart TV LG. Responda de forma clara e concisa em português do Brasil.' },
        { role: 'user', content: query }
      ]
    })
  });

  const data = await response.json();
  if (data.choices && data.choices[0].message.content) {
    return data.choices[0].message.content;
  }
  throw new Error("Resposta inválida do ChatGPT");
}

// Anthropic Claude API (Claude 3 Haiku)
async function fetchClaude(query) {
  const apiKey = localStorage.getItem('key_claude');
  if (!apiKey) {
    return "Para usar o Anthropic Claude, por favor insira sua chave da API da Anthropic no botão ⚙️ Keys no topo da tela ou pelo celular!";
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: 'Você é o Aura IA (Provedor Anthropic Claude), um assistente virtual futurista para Smart TV LG. Responda de forma clara e concisa em português do Brasil.',
      messages: [{ role: 'user', content: query }]
    })
  });

  const data = await response.json();
  if (data.content && data.content[0].text) {
    return data.content[0].text;
  }
  throw new Error("Resposta inválida do Claude");
}

// Display & Speak Response
function displayResponse(text, providerName) {
  setOrbState('speaking');
  updateStatus(`✨ Resposta gerada via ${providerName}!`);
  responseProviderLabel.textContent = `✨ Resposta do Aura IA (${providerName})`;
  responseText.innerHTML = formatMarkdownText(text);
  responseCard.classList.remove('hidden');
  responseCard.scrollIntoView({ behavior: 'smooth' });
  speakText(text);
}

// Markdown Rich Text Formatter para Smart TV
function formatMarkdownText(text) {
  if (!text) return '';
  
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Destaques em negrito **texto**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Itálico *texto*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Listas numeradas "1. Item"
  formatted = formatted.replace(/^(\d+)\.\s+(.*)$/gim, '<div class="list-item"><span class="list-num">$1</span><span>$2</span></div>');

  // Listas com marcadores "* Item" ou "- Item"
  formatted = formatted.replace(/^[\*\-]\s+(.*)$/gim, '<div class="list-item"><span class="list-bullet">•</span><span>$1</span></div>');

  // Parágrafos espaçados
  const paragraphs = formatted.split(/\n\n+/);
  return paragraphs.map(p => `<p class="response-paragraph">${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// Text-to-Speech (Voz da TV)
function speakText(text) {
  stopSpeech();
  setOrbState('speaking');
  isSpeaking = true;

  if ('speechSynthesis' in window) {
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'pt-BR';
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;

    currentUtterance.onstart = () => {
      isSpeaking = true;
      setOrbState('speaking');
    };

    currentUtterance.onend = () => {
      isSpeaking = false;
      setOrbState('idle');
    };

    currentUtterance.onerror = () => {
      isSpeaking = false;
      setOrbState('idle');
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  if (window.webOS && window.webOS.service) {
    try {
      window.webOS.service.request("luna://com.webos.service.tts", {
        method: "speak",
        parameters: { text: text, language: "pt-BR" },
        onSuccess: function() {
          isSpeaking = false;
          setOrbState('idle');
        },
        onFailure: function() {
          isSpeaking = false;
          setOrbState('idle');
        }
      });
    } catch (e) {
      console.log('Luna Service TTS fallback:', e);
    }
  }
}

function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  setOrbState('idle');
}

// UI States
function setOrbState(state) {
  aiOrb.className = `ai-orb ${state}`;
}

function updateStatus(msg) {
  statusText.textContent = msg;
}

// Modais Handlers
function openMobileModal() {
  closeAllModals();
  const remoteUrl = `https://aura-ia.app/keys?device=${currentDeviceCode}`;
  if (mobileUrlLabel) mobileUrlLabel.textContent = `aura-ia.app/keys?device=${currentDeviceCode}`;
  qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(remoteUrl)}`;
  mobileModal.classList.remove('hidden');
  setupFocusableElements();
}

function closeMobileModal() {
  mobileModal.classList.add('hidden');
  setupFocusableElements();
}

function openAccountModal() {
  closeAllModals();
  accountModal.classList.remove('hidden');
  setupFocusableElements();
}

function closeAccountModal() {
  accountModal.classList.add('hidden');
  setupFocusableElements();
}

function updateProviderBadge() {
  let name = 'Gemini';
  let svg = `<svg class="llm-icon gemini-icon" viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" fill="url(#gem-bdg)"/><defs><linearGradient id="gem-bdg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stop-color="#4E82EE"/><stop offset="0.5" stop-color="#9B72CB"/><stop offset="1" stop-color="#D96570"/></linearGradient></defs></svg>`;
  
  if (currentProvider === 'chatgpt') {
    name = 'ChatGPT';
    svg = `<svg class="llm-icon chatgpt-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.28 9.82a6 6 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18 6 6 0 0 0 .98 7.08a6.05 6.05 0 0 0 .74 7.05 6 6 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 6 6 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.51zM3.6 18.31a4.47 4.47 0 0 1-.54-3.01l.14.08 4.78 2.76a.79.79 0 0 0 .79 0l5.83-3.37v2.34a.07.07 0 0 1-.03.06l-4.84 2.79a4.5 4.5 0 0 1-6.13-1.65zM2.37 7.88a4.48 4.48 0 0 1 2.34-1.97v5.69a.79.79 0 0 0 .39.68l5.84 3.37-2.02 1.17a.07.07 0 0 1-.07 0l-4.84-2.79a4.5 4.5 0 0 1-1.64-6.15zm16.43 3.02l-5.84-3.37 2.02-1.17a.07.07 0 0 1 .07 0l4.84 2.79a4.5 4.5 0 0 1 1.64 6.14 4.48 4.48 0 0 1-2.34 1.97v-5.69a.79.79 0 0 0-.39-.67zm1.88-4.39l-.14-.08-4.78-2.76a.79.79 0 0 0-.79 0l-5.83 3.37v-2.34a.07.07 0 0 1 .03-.06l4.84-2.79a4.5 4.5 0 0 1 6.67 4.66zm-12.44-4.22a4.48 4.48 0 0 1 2.88 1.04l-.14.08-4.78 2.76a.79.79 0 0 0-.39.68v6.74l-2.02-1.17a.07.07 0 0 1-.04-.05V8.16a4.5 4.5 0 0 1 4.49-4.49z"/></svg>`;
  }
  
  if (currentProvider === 'claude') {
    name = 'Claude';
    svg = `<svg class="llm-icon claude-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14.862 3.52c-.322-.924-1.625-.924-1.947 0l-1.96 5.626a1.025 1.025 0 01-.628.628l-5.626 1.96c-.924.322-.924 1.625 0 1.947l5.626 1.96c.264.092.474.302.566.566l1.96 5.626c.322.924 1.625.924 1.947 0l1.96-5.626a1.025 1.025 0 01.628-.628l5.626-1.96c.924-.322.924-1.625 0-1.947l-5.626-1.96a1.025 1.025 0 01-.628-.628l-1.96-5.626z"/></svg>`;
  }

  if (activeProviderBadge) {
    activeProviderBadge.innerHTML = `${svg} <span>${name}</span>`;
  }
}

function syncProviderChoiceButtons() {
  document.querySelectorAll('.provider-choice-btn').forEach(btn => {
    if (btn.getAttribute('data-provider') === currentProvider) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function openConfigModal() {
  closeAllModals();
  configModal.classList.remove('hidden');
  
  currentProvider = localStorage.getItem('aura_active_provider') || 'gemini';
  syncProviderChoiceButtons();

  keyGeminiInput.value = localStorage.getItem('key_gemini') || '';
  keyChatgptInput.value = localStorage.getItem('key_chatgpt') || '';
  keyClaudeInput.value = localStorage.getItem('key_claude') || '';
  setupFocusableElements();
}

function closeConfigModal() {
  configModal.classList.add('hidden');
  setupFocusableElements();
}

function closeAllModals() {
  configModal.classList.add('hidden');
  mobileModal.classList.add('hidden');
  accountModal.classList.add('hidden');
  setupFocusableElements();
}

function generatePairCode() {
  currentDeviceCode = 'AUR-' + Math.floor(1000 + Math.random() * 9000);
  if (pairCodeText) {
    pairCodeText.textContent = currentDeviceCode;
  }
}

function activateVipAccount() {
  localStorage.setItem('aura_vip_active', 'true');
  alert('✨ Sua conta Aura IA Multi-Engine v3.0 VIP foi ativada com sucesso nesta Smart TV!');
  closeAccountModal();
}

function saveApiKeys() {
  const gemini = keyGeminiInput.value.trim();
  const chatgpt = keyChatgptInput.value.trim();
  const claude = keyClaudeInput.value.trim();

  if (gemini) localStorage.setItem('key_gemini', gemini);
  if (chatgpt) localStorage.setItem('key_chatgpt', chatgpt);
  if (claude) localStorage.setItem('key_claude', claude);

  alert('Chaves das IAs salvas com sucesso!');
  closeConfigModal();
}

function loadSavedApiKeys() {
  currentProvider = localStorage.getItem('aura_active_provider') || 'gemini';
  updateProviderBadge();
  syncProviderChoiceButtons();
  if (keyGeminiInput) keyGeminiInput.value = localStorage.getItem('key_gemini') || '';
  if (keyChatgptInput) keyChatgptInput.value = localStorage.getItem('key_chatgpt') || '';
  if (keyClaudeInput) keyClaudeInput.value = localStorage.getItem('key_claude') || '';
}
