// Leitura por voz da resposta da IA.
//
// Estratégia recomendada pela LG para apps de TV:
//   1. Guia de Áudio (Audio Guidance) — quando o usuário ativou em
//      Acessibilidade. Fala com a voz do sistema da TV via:
//        - readAlert()  (@enact/webos/speech -> luna://com.webos.service.tts)
//        - aria-live     (announce(), lido pelo leitor de tela da webOS)
//   Se o Guia de Áudio NÃO estiver ativo, cai para áudio próprio:
//   2. Web Speech Synthesis (vozes do sistema, se houver)
//   3. Áudio do Google Translate TTS, dividido por frases
//
// O app declara "supportsAudioGuidance": true no appinfo.json.

import { readAlert } from '@enact/webos/speech';

import { checkAudioGuidance, stopLunaNativeTTS } from './webosService';
import { stripMarkdown } from './format';

let audioEl = null;
let queue = [];
let utterance = null;
let audioUnlocked = false;
let announceFn = null;

// Permite ao MainPanel injetar a função announce() do @enact/ui/AnnounceDecorator.
export function setAnnouncer(fn) { announceFn = fn; }

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

// Escolhe a melhor voz pt-BR disponível, preferindo vozes femininas.
const FEMALE_HINTS = /female|mulher|feminin|maria|francisca|luciana|camila|vit[oó]ria|helena|joana|catarina|ang[eé]lica/i;
const MALE_HINTS = /\bmale\b|homem|masculin|daniel|ricardo|felipe|jo[aã]o|ant[oó]nio/i;

function pickPtBrVoice() {
	let voices = [];
	try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }

	const pt = voices.filter(
		(v) => /^pt[-_]?BR/i.test(v.lang) || /portugu.s.*brasil/i.test(v.name) || /^pt\b/i.test(v.lang)
	);
	if (!pt.length) return null;

	const female = (v) => FEMALE_HINTS.test(v.name);
	const male = (v) => MALE_HINTS.test(v.name);

	return (
		pt.find((v) => v.localService && female(v)) ||   // 1) feminina offline (mais confiável)
		pt.find((v) => /google.*brasil/i.test(v.name)) || // 2) Google pt-BR (feminina, natural, online)
		pt.find(female) ||                                // 3) qualquer feminina
		pt.find((v) => !male(v)) ||                        // 4) qualquer que não seja claramente masculina
		pt[0]
	);
}

function speakUtterance(text, onState) {
	utterance = new window.SpeechSynthesisUtterance(text);
	utterance.lang = 'pt-BR';
	utterance.rate = 1;
	utterance.pitch = 1;
	const v = pickPtBrVoice();
	if (v) utterance.voice = v;
	utterance.onend = () => onState('idle');
	utterance.onerror = () => googleFallback(text, onState);
	window.speechSynthesis.speak(utterance);
}

function webSpeech(text, onState) {
	if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
		googleFallback(text, onState);
		return;
	}
	try {
		if ((window.speechSynthesis.getVoices() || []).length) {
			speakUtterance(text, onState);
			return;
		}
		// lista de vozes ainda não carregou — espera o evento (até 1s)
		let done = false;
		const go = () => {
			if (done) return;
			done = true;
			window.speechSynthesis.removeEventListener('voiceschanged', go);
			if ((window.speechSynthesis.getVoices() || []).length) speakUtterance(text, onState);
			else googleFallback(text, onState);
		};
		window.speechSynthesis.addEventListener('voiceschanged', go);
		setTimeout(go, 1000);
	} catch (e) {
		googleFallback(text, onState);
	}
}

// --- API pública -------------------------------------------------
export function speak(rawText, { onStateChange } = {}) {
	const text = stripMarkdown(rawText);
	if (!text) return;
	stopSpeech();
	const onState = onStateChange || (() => {});
	onState('speaking');

	// aria-live: sempre — inofensivo, e o leitor de tela da TV lê se ativo
	if (announceFn) { try { announceFn(text); } catch (e) { /* ignora */ } }

	checkAudioGuidance().then((guidanceOn) => {
		if (guidanceOn) {
			// A TV lê com a voz do sistema; não duplicar com áudio próprio.
			readAlert(text, true);
			onState('idle');
		} else {
			readAlert(text, true); // no-op se o Guia de Áudio estiver desligado
			webSpeech(text, onState);
		}
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
