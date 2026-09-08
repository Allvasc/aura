// Sincronia com o celular via WebSocket (Socket.IO).
// O celular acessa o backend, entra na "sala" do código da TV e envia:
//   - keys-updated   -> chaves de API (Gemini/ChatGPT/Claude) + provedor ativo
//   - prompt-received -> uma pergunta para a TV responder na hora
//
// socket.io-client é empacotado (não vem de CDN).

import { io } from 'socket.io-client';

export const BACKEND_URL =
	(typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost')
		? 'http://localhost:3000'
		: 'https://aura-backend-gwiv.onrender.com';

// Código de pareamento da TV — gerado uma vez e mantido nesta TV.
export function getDeviceCode() {
	try {
		let code = window.localStorage.getItem('aura_device_code');
		if (!code || !/^AUR-\d{4}$/.test(code)) {
			code = 'AUR-' + Math.floor(1000 + Math.random() * 9000);
			window.localStorage.setItem('aura_device_code', code);
		}
		return code;
	} catch (e) {
		return 'AUR-' + Math.floor(1000 + Math.random() * 9000);
	}
}

export function mobileUrl(code) {
	return `${BACKEND_URL}/connect?device=${code}`;
}

let socket = null;

// Conecta e assina os eventos. Retorna uma função para desconectar.
export function connectSync({ deviceCode, onKeys, onPrompt, onStatus } = {}) {
	if (socket) { try { socket.disconnect(); } catch (e) { /* ignora */ } socket = null; }

	try {
		socket = io(BACKEND_URL, {
			transports: ['websocket', 'polling'],
			reconnectionAttempts: 10,
			timeout: 8000
		});
	} catch (e) {
		if (onStatus) onStatus('offline');
		return () => {};
	}

	socket.on('connect', () => {
		if (onStatus) onStatus('online');
		socket.emit('join-room', { deviceCode });
	});
	socket.on('disconnect', () => { if (onStatus) onStatus('offline'); });
	socket.on('connect_error', () => { if (onStatus) onStatus('offline'); });

	socket.on('keys-updated', (data) => {
		try {
			if (data.geminiKey) window.localStorage.setItem('key_gemini', data.geminiKey);
			if (data.chatgptKey) window.localStorage.setItem('key_chatgpt', data.chatgptKey);
			if (data.claudeKey) window.localStorage.setItem('key_claude', data.claudeKey);
			if (data.activeProvider) window.localStorage.setItem('aura_active_provider', data.activeProvider);
		} catch (e) { /* ignora */ }
		if (onKeys) onKeys(data);
	});

	socket.on('prompt-received', (data) => {
		if (onPrompt && data && data.prompt) onPrompt(data.prompt, data.provider);
	});

	return () => {
		if (socket) { try { socket.disconnect(); } catch (e) { /* ignora */ } socket = null; }
	};
}
