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

// ---- TTS nativo (Luna) --------------------------------------------

let ttsRequest = null;

export function speakLunaNative(text, callback) {
	if (!isWebOS()) { if (callback) callback(false); return; }

	let done = false;
	const finish = (ok) => { if (!done) { done = true; if (callback) callback(ok); } };

	try {
		ttsRequest = new LS2Request().send({
			service: 'luna://com.webos.service.tts',
			method: 'speak',
			parameters: {text, language: 'pt-BR', clear: true},
			onSuccess: (res) => finish(res.returnValue !== false),
			onFailure: () => finish(false)
		});
		// a fala continua em background; considera OK apos iniciar
		setTimeout(() => finish(true), 800);
	} catch (e) {
		finish(false);
	}
}

export function stopLunaNativeTTS() {
	if (ttsRequest && ttsRequest.cancel) {
		try { ttsRequest.cancel(); } catch (e) { /* ignora */ }
		ttsRequest = null;
	}
	luna('com.webos.service.tts', 'stop', {}).catch(() => {});
}
