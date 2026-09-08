// Leitura por voz com 3 níveis de fallback (portado do app vanilla):
//   1. TTS nativo da TV LG (Luna com.webos.service.tts)
//   2. Web Speech Synthesis (vozes do sistema)
//   3. Áudio do Google Translate TTS, dividido por frases
//
// Uso:  speak(texto, { onStateChange })  ->  onStateChange('speaking'|'idle')
//       stopSpeech()

import { speakLunaNative, stopLunaNativeTTS } from './webosService';
import { stripMarkdown } from './format';

let audioEl = null;
let queue = [];
let utterance = null;
let audioUnlocked = false;

// --- desbloqueio de autoplay (1a interação) --------------------------
export function unlockAudio() {
	if (audioUnlocked) return;
	try {
		const a = new window.Audio(
			'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
		);
		a.volume = 0;
		const p = a.play();
		if (p && p.then) p.then(() => { audioUnlocked = true; }).catch(() => {});
	} catch (e) { /* ignora */ }
}

// --- divisão em blocos de frase ------------------------------------
function chunk(text, max = 170) {
	const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
	const out = [];
	let cur = '';
	sentences.forEach((s) => {
		if ((cur + s).length <= max) {
			cur += ' ' + s;
		} else {
			if (cur.trim()) out.push(cur.trim());
			if (s.length > max) {
				let sub = '';
				s.split(/[,;\s]+/).forEach((w) => {
					if ((sub + ' ' + w).length <= max) sub += ' ' + w;
					else { if (sub.trim()) out.push(sub.trim()); sub = w; }
				});
				if (sub.trim()) out.push(sub.trim());
				cur = '';
			} else {
				cur = s;
			}
		}
	});
	if (cur.trim()) out.push(cur.trim());
	return out;
}

function playNext(onState) {
	if (queue.length === 0) {
		if (onState) onState('idle');
		return;
	}
	const part = queue.shift();
	const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=gtx&q=${encodeURIComponent(part)}`;
	if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignora */ } }
	audioEl = new window.Audio(url);
	audioEl.play()
		.then(() => { if (onState) onState('speaking'); })
		.catch(() => playNext(onState));
	audioEl.onended = () => playNext(onState);
	audioEl.onerror = () => playNext(onState);
}

function googleFallback(text, onState) {
	queue = chunk(text);
	if (queue.length === 0) { if (onState) onState('idle'); return; }
	playNext(onState);
}

// --- API pública -------------------------------------------------
export function speak(rawText, { onStateChange } = {}) {
	const text = stripMarkdown(rawText);
	if (!text) return;
	stopSpeech();
	const onState = onStateChange || (() => {});
	onState('speaking');

	// 1) TTS nativo da TV
	speakLunaNative(text, (ok) => {
		if (ok) return;

		// 2) Web Speech Synthesis
		if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
			try {
				const voices = window.speechSynthesis.getVoices();
				if (voices && voices.length) {
					utterance = new window.SpeechSynthesisUtterance(text);
					utterance.lang = 'pt-BR';
					utterance.rate = 1;
					utterance.onend = () => onState('idle');
					utterance.onerror = () => googleFallback(text, onState);
					window.speechSynthesis.speak(utterance);
					return;
				}
			} catch (e) { /* cai pro nivel 3 */ }
		}

		// 3) Google Translate TTS
		googleFallback(text, onState);
	});
}

export function stopSpeech() {
	queue = [];
	stopLunaNativeTTS();
	if ('speechSynthesis' in window) {
		try { window.speechSynthesis.cancel(); } catch (e) { /* ignora */ }
	}
	if (audioEl) {
		try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) { /* ignora */ }
		audioEl = null;
	}
	utterance = null;
}
