// Services Bridge for LG webOS Smart TV Luna APIs

let installedAppsList = [];
let installedAppsSummary = '';

export function fetchInstalledTVApps(callback) {
  if (window.PalmServiceBridge) {
    try {
      const bridge = new window.PalmServiceBridge();
      bridge.onservicecallback = function(res) {
        try {
          const parsed = JSON.parse(res);
          if (parsed.apps && Array.isArray(parsed.apps)) {
            installedAppsList = parsed.apps;
            const names = parsed.apps.map(a => a.title || a.id).slice(0, 30);
            installedAppsSummary = names.join(', ');
            if (callback) callback(parsed.apps, installedAppsSummary);
          }
        } catch (e) {}
      };
      bridge.call("luna://com.webos.applicationManager/listApps", "{}");
    } catch (e) {
      console.warn('Erro ao consultar apps:', e);
    }
  }
}

export function getInstalledAppsSummary() {
  return installedAppsSummary;
}

export function launchAppOnTV(appId) {
  if (!appId || !window.PalmServiceBridge) return false;
  try {
    const bridge = new window.PalmServiceBridge();
    bridge.call("luna://com.webos.applicationManager/launch", JSON.stringify({ id: appId }));
    showNativeToast(`Abrindo app...`);
    return true;
  } catch (e) {
    return false;
  }
}

export function adjustTVVolume(direction) {
  if (!window.PalmServiceBridge) return false;
  try {
    const bridge = new window.PalmServiceBridge();
    const endpoint = direction === 'up' 
      ? "luna://com.webos.service.audio/volumeUp" 
      : "luna://com.webos.service.audio/volumeDown";
    bridge.call(endpoint, "{}");
    showNativeToast(`Volume (${direction === 'up' ? '+' : '-'})`);
    return true;
  } catch (e) {
    return false;
  }
}

export function toggleTVMute() {
  if (!window.PalmServiceBridge) return false;
  try {
    const bridge = new window.PalmServiceBridge();
    bridge.call("luna://com.webos.service.audio/toggleMute", "{}");
    showNativeToast('Mudo alterado');
    return true;
  } catch (e) {
    return false;
  }
}

export function showNativeToast(msg) {
  if (!window.PalmServiceBridge) return;
  try {
    const bridge = new window.PalmServiceBridge();
    bridge.call("luna://com.webos.notification/createToast", JSON.stringify({
      message: `⚡ Aura IA: ${msg}`
    }));
  } catch (e) {}
}

export function speakLunaNative(text, callback) {
  if (!window.PalmServiceBridge) {
    if (callback) callback(false);
    return;
  }

  let responded = false;
  const finish = (success) => {
    if (!responded) {
      responded = true;
      if (callback) callback(success);
    }
  };

  try {
    const bridge = new window.PalmServiceBridge();
    bridge.onservicecallback = function(res) {
      try {
        const parsed = JSON.parse(res);
        finish(parsed.returnValue !== false);
      } catch (e) {
        finish(false);
      }
    };

    bridge.call("luna://com.webos.service.tts/speak", JSON.stringify({
      text,
      language: "pt-BR",
      clear: true
    }));

    setTimeout(() => finish(true), 800);
  } catch (e) {
    finish(false);
  }
}

export function stopLunaNativeTTS() {
  if (window.PalmServiceBridge) {
    try {
      const bridge = new window.PalmServiceBridge();
      bridge.call("luna://com.webos.service.tts/stop", "{}");
    } catch (e) {}
  }
}
