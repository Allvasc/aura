// Ponte com os servicos da Smart TV LG (Luna Service API) usando os
// wrappers oficiais do Enact — sem carregar o webOSTV.js externo.
//
//   @enact/webos/LS2Request   -> chamadas Luna (luna://...)
//   @enact/webos/deviceinfo   -> modelo, versao de SDK, resolucao
//   @enact/webos/platform     -> detecta se esta rodando numa TV webOS
//   @enact/webos/application  -> id do app, appinfo, tecla BACK

import LS2Request from '@enact/webos/LS2Request';
import {deviceinfo} from '@enact/webos/deviceinfo';
import {platform} from '@enact/webos/platform';

export const isWebOS = () => Boolean(platform && platform.tv);

// Executa uma chamada Luna e resolve numa Promise.
export function luna(service, method, parameters = {}, {subscribe = false} = {}) {
	return new Promise((resolve, reject) => {
		if (!isWebOS()) {
			reject(new Error('fora da TV webOS'));
			return;
		}
		try {
			new LS2Request().send({
				service: `luna://${service}`,
				method,
				parameters,
				subscribe,
				onSuccess: resolve,
				onFailure: reject
			});
		} catch (e) {
			reject(e);
		}
	});
}

// ---- Guia de Áudio (Audio Guidance) --------------------------------
// A leitura por voz nativa da TV só é permitida a apps quando o usuário
// habilitou o Guia de Áudio (Acessibilidade). Consultamos essa flag.

let audioGuidance = null;

export function checkAudioGuidance() {
	return new Promise((resolve) => {
		if (audioGuidance !== null) { resolve(audioGuidance); return; }
		if (!isWebOS()) { audioGuidance = false; resolve(false); return; }
		try {
			new LS2Request().send({
				service: 'luna://com.webos.settingsservice',
				method: 'getSystemSettings',
				subscribe: true,
				parameters: {keys: ['audioGuidance'], category: 'option'},
				onSuccess: (res) => {
					audioGuidance = !!(res && res.settings && res.settings.audioGuidance === 'on');
					resolve(audioGuidance);
				},
				onFailure: () => { audioGuidance = false; resolve(false); }
			});
		} catch (e) {
			audioGuidance = false;
			resolve(false);
		}
	});
}

export const isAudioGuidanceOn = () => audioGuidance === true;

// ---- info do dispositivo ------------------------------------------------

let cachedDevice = null;

export function getDeviceInfo(callback) {
	deviceinfo((info) => {
		cachedDevice = info;
		if (callback) callback(info);
	});
}

export const getCachedDeviceInfo = () => cachedDevice;

// ---- apps instalados --------------------------------------------------

let installedApps = [];
let installedAppsSummary = '';

export function fetchInstalledTVApps(callback) {
	luna('com.webos.service.applicationManager', 'listLaunchPoints', {})
		.then((res) => {
			const list = res.launchPoints || res.apps || [];
			installedApps = list;
			installedAppsSummary = list
				.map((a) => a.title || a.id)
				.filter(Boolean)
				.slice(0, 30)
				.join(', ');
			if (callback) callback(installedApps, installedAppsSummary);
		})
		.catch(() => {
			if (callback) callback([], '');
		});
}

export const getInstalledAppsSummary = () => installedAppsSummary;

// ---- controle de hardware da TV ------------------------------------

export function launchAppOnTV(appId) {
	if (!appId) return Promise.reject(new Error('sem appId'));
	return luna('com.webos.service.applicationManager', 'launch', {id: appId})
		.then((r) => { showNativeToast('Abrindo aplicativo...'); return r; });
}

export function adjustTVVolume(direction) {
	const method = direction === 'up' ? 'volumeUp' : 'volumeDown';
	return luna('com.webos.service.audio', method, {})
		.then((r) => { showNativeToast(`Volume ${direction === 'up' ? '+' : '-'}`); return r; });
}

let muted = false;
export function toggleTVMute() {
	muted = !muted;
	return luna('com.webos.service.audio', 'setMuted', {muted})
		.then((r) => { showNativeToast(muted ? 'TV no mudo' : 'Som ligado'); return r; });
}

export function showNativeToast(message) {
	return luna('com.webos.notification', 'createToast', {message: `Aura IA: ${message}`})
		.catch(() => {});
}

// ---- parar o TTS nativo (Luna) -----------------------------------
// A fala é disparada pelo Guia de Áudio (services/speech.js -> readAlert);
// aqui só interrompe.

export function stopLunaNativeTTS() {
	luna('com.webos.service.tts', 'stop', {fadeOut: true}).catch(() => {});
}
