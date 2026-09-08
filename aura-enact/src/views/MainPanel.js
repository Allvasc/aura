import { useCallback, useEffect, useRef, useState } from 'react';
import Scroller from '@enact/ui/Scroller';
import { useAnnounce } from '@enact/ui/AnnounceDecorator';

import {
  checkAudioGuidance,
  fetchInstalledTVApps,
  getDeviceInfo,
  isWebOS,
  showNativeToast
} from '../services/webosService';
import { fetchAIResponse } from '../services/aiService';
import { formatMarkdown } from '../services/format';
import { setAnnouncer, speak, stopSpeech, unlockAudio } from '../services/speech';
import { connectSync, getDeviceCode } from '../services/sync';
import AuraButton from '../components/AuraButton';
import ConfigModal from '../components/ConfigModal';
import MobileModal from '../components/MobileModal';
import AccountModal from '../components/AccountModal';
import ProviderIcon from '../components/ProviderIcon';

const readLS = (k, fallback = '') => {
  try { return window.localStorage.getItem(k) || fallback; } catch { return fallback; }
};
const writeLS = (k, v) => {
  try { window.localStorage.setItem(k, v); } catch { /* indisponivel */ }
};

const PROVIDERS = [
  ['gemini', 'Google Gemini', 'Gemini'],
  ['chatgpt', 'OpenAI ChatGPT', 'ChatGPT'],
  ['claude', 'Anthropic Claude', 'Claude']
];

const SHORTCUTS = [
  ['🍲 Ideias de Jantar', 'Me dê 3 ideias de jantares rápidos e deliciosos para fazer hoje em casa.'],
  ['✨ Curiosidade do Dia', 'Me conte uma curiosidade incrível e fascinante sobre o universo ou a ciência.'],
  ['📖 História Curta', 'Me conte uma história curta, divertida e envolvente para ler antes de dormir.'],
  ['🎬 O que Assistir', 'Me dê 3 sugestões de filmes ou séries de suspense ou ficção científica para assistir na TV.']
];

const fmtClock = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const providerLabel = (id) => (PROVIDERS.find((p) => p[0] === id) || PROVIDERS[0])[1];
const providerShort = (id) => (PROVIDERS.find((p) => p[0] === id) || PROVIDERS[0])[2];

const MainPanel = () => {
  const [query, setQuery] = useState('');
  const [provider, setProviderState] = useState(() => readLS('aura_active_provider', 'gemini'));
  const [status, setStatus] = useState('Pronto! Faça uma pergunta por voz ou escolha um atalho abaixo...');
  const [orbState, setOrbState] = useState('idle');
  const [response, setResponse] = useState(null);
  const [clock, setClock] = useState(fmtClock());
  const [showConfig, setShowConfig] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [device, setDevice] = useState(null);
  const [syncStatus, setSyncStatus] = useState('offline');

  const { announce, children: announceChildren } = useAnnounce();

  const recognitionRef = useRef(null);
  const watchdogRef = useRef(null);
  const responseRef = useRef(null);
  const providerRef = useRef(provider);
  const anyModalRef = useRef(false);
  // refs de handlers usados no listener global de teclas (registrado 1x)
  const keyActions = useRef({});
  providerRef.current = provider;
  anyModalRef.current = showConfig || showMobile || showAccount;

  const closeAllModals = useCallback(() => {
    setShowConfig(false);
    setShowMobile(false);
    setShowAccount(false);
  }, []);

  const hasKey = (p) => !!readLS(`key_${p}`);

  const setProvider = useCallback((id) => {
    setProviderState(id);
    writeLS('aura_active_provider', id);
  }, []);

  const onOrbState = useCallback((s) => setOrbState(s), []);

  // --- envio de pergunta ------------------------------------------------
  const handleSend = useCallback(async (textToSend) => {
    const q = (textToSend || '').trim();
    if (!q) return;
    const p = providerRef.current;

    if (!hasKey(p)) {
      setStatus(`Configure a chave do ${providerLabel(p)} para começar.`);
      setShowConfig(true);
      return;
    }

    stopSpeech();
    setResponse(null);
    setOrbState('thinking');
    setStatus(`O Aura IA está consultando o ${providerLabel(p)}...`);

    try {
      const res = await fetchAIResponse(p, q);
      setResponse(res);
      setOrbState('speaking');
      setStatus(`✨ Resposta gerada via ${res.providerName}!`);
      speak(res.text, { onStateChange: onOrbState });
    } catch (err) {
      setStatus(`Ops! Problema ao conectar com o ${providerLabel(p)}. Verifique a chave da API ou a internet.`);
      setOrbState('idle');
    }
  }, [onOrbState]);

  const ask = useCallback(() => handleSend(query), [handleSend, query]);

  const replaySpeech = useCallback(() => {
    if (response && response.text) {
      setOrbState('speaking');
      speak(response.text, { onStateChange: onOrbState });
    }
  }, [response, onOrbState]);

  const handleStopSpeech = useCallback(() => {
    stopSpeech();
    setOrbState('idle');
  }, []);

  const clearAll = useCallback(() => {
    stopSpeech();
    setQuery('');
    setResponse(null);
    setOrbState('idle');
    setStatus('Limpo! Escolha um atalho ou faça uma nova pergunta.');
  }, []);

  // --- reconhecimento de voz -----------------------------------------
  const stopListening = useCallback(() => {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { /* ignora */ }
      recognitionRef.current = null;
    }
    setOrbState((s) => (s === 'listening' ? 'idle' : s));
  }, []);

  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus('Ditado por voz indisponível nesta TV. Digite a pergunta ou use o celular.');
      return;
    }
    if (recognitionRef.current) {
      stopListening();
      setStatus('Ditado interrompido.');
      return;
    }

    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;

    rec.onstart = () => {
      setOrbState('listening');
      setStatus('Ouvindo você... fale agora!');
      watchdogRef.current = setTimeout(() => {
        stopListening();
        setStatus('Nenhum áudio detectado. Tente de novo ou use a digitação.');
      }, 10000);
    };
    rec.onresult = (ev) => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      const transcript = ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript;
      recognitionRef.current = null;
      if (transcript) {
        setQuery(transcript);
        setStatus(`Você disse: "${transcript}"`);
        handleSend(transcript);
      } else {
        setOrbState('idle');
      }
    };
    rec.onerror = () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      recognitionRef.current = null;
      setOrbState('idle');
      setStatus('Não consegui captar o áudio. Tente novamente ou digite.');
    };
    rec.onend = () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      recognitionRef.current = null;
      setOrbState((s) => (s === 'listening' ? 'idle' : s));
    };

    try { rec.start(); } catch (e) { recognitionRef.current = null; }
  }, [handleSend, stopListening]);

  // --- relógio -------------------------------------------------------
  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(t);
  }, []);

  // --- webOS: device, apps, teclas do controle ---------------------
  useEffect(() => {
    setAnnouncer(announce);
    checkAudioGuidance();
    getDeviceInfo((info) => { setDevice(info); console.log('webOS device:', info); });
    fetchInstalledTVApps((apps, summary) => console.log(`webOS: ${apps.length} apps`, summary));

    const unlockOnce = () => {
      unlockAudio();
      window.removeEventListener('keydown', unlockOnce);
      window.removeEventListener('click', unlockOnce);
    };
    window.addEventListener('keydown', unlockOnce);
    window.addEventListener('click', unlockOnce);

    const onKey = (ev) => {
      const a = keyActions.current;
      const k = ev.key;
      const c = ev.keyCode;
      // Botões coloridos do controle LG
      if (k === 'ColorF0Red' || c === 403) { a.clear(); return; }
      if (k === 'ColorF1Green' || c === 404) { a.voice(); return; }
      if (k === 'ColorF2Yellow' || c === 405) { a.replay(); return; }
      if (k === 'ColorF3Blue' || c === 406) { setShowConfig(true); return; }
      // Teclas de mídia
      if (k === 'MediaPlay' || c === 415) { a.replay(); return; }
      if (k === 'MediaPause' || k === 'MediaStop' || c === 413 || c === 19) { a.stop(); return; }
      // Voltar
      if (k === 'GoBack' || k === 'Escape' || c === 461) {
        if (anyModalRef.current) { ev.preventDefault(); ev.stopPropagation(); a.closeModals(); }
        else { a.stop(); }
      }
    };
    window.addEventListener('keydown', onKey, true);

    // Sincronia com o celular (Socket.IO)
    const disconnect = connectSync({
      deviceCode: getDeviceCode(),
      onStatus: setSyncStatus,
      onKeys: () => {
        setProviderState(readLS('aura_active_provider', 'gemini'));
        setStatus('✨ Chaves sincronizadas pelo seu celular!');
        showNativeToast('Chaves recebidas do celular');
      },
      onPrompt: (prompt, prov) => {
        if (prov) { setProviderState(prov); writeLS('aura_active_provider', prov); }
        setQuery(prompt);
        keyActions.current.send(prompt);
      }
    });

    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keydown', unlockOnce);
      window.removeEventListener('click', unlockOnce);
      disconnect();
    };
  }, []);

  // mantem os handlers atuais acessiveis ao listener global e ao socket
  keyActions.current = {
    clear: clearAll,
    voice: toggleVoice,
    replay: replaySpeech,
    stop: handleStopSpeech,
    send: handleSend,
    closeModals: closeAllModals
  };

  const closeConfig = useCallback((saved) => {
    setShowConfig(false);
    if (saved) {
      setStatus('Chaves salvas! Já pode fazer perguntas.');
      showNativeToast('Chaves salvas');
    }
  }, []);

  return (
    <div className="aura-root">
      {/* ---------- Header ---------- */}
      <header className="aura-header">
        <div className="aura-brand">
          <div className="aura-dot" />
          <h1>AURA</h1>
          <span className="aura-badge">
            <ProviderIcon provider={provider} size={16} />
            {providerShort(provider)}
          </span>
        </div>
        <div className="aura-header-right">
          <AuraButton className="pill" onClick={() => setShowMobile(true)}>
            Celular {syncStatus === 'online' ? '🟢' : ''}
          </AuraButton>
          <AuraButton className="pill" onClick={() => setShowAccount(true)}>Conta</AuraButton>
          <AuraButton className="pill" onClick={() => setShowConfig(true)}>Chaves / IAs</AuraButton>
          <div className="aura-clock">{clock}</div>
        </div>
      </header>

      {/* ---------- Conteúdo ---------- */}
      <main className="aura-main">
        <div className="aura-orb-wrap">
          <div className={`ai-orb ${orbState}`} aria-hidden="true">
            <div className="orb-core" />
            <div className="orb-ring ring-1" />
            <div className="orb-ring ring-2" />
          </div>
          <div className="aura-status" role="status" aria-live="polite">{status}</div>
        </div>

        {/* Barra de pergunta */}
        <div className="aura-searchbox">
          <AuraButton className="pill" onClick={toggleVoice} aria-label={orbState === 'listening' ? 'Parar gravação de voz' : 'Falar por voz'}>
            {orbState === 'listening' ? '● Gravando' : 'Falar'}
          </AuraButton>
          <input
            type="text"
            className="spottable aura-input"
            aria-label="Digite sua pergunta"
            placeholder="Fale ou digite sua pergunta aqui..."
            value={query}
            autoComplete="off"
            onChange={(ev) => setQuery(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') ask(); }}
          />
          <AuraButton variant="primary" onClick={ask}>Perguntar</AuraButton>
        </div>

        {/* Atalhos rápidos */}
        <div className="aura-shortcuts">
          {SHORTCUTS.map(([label, prompt]) => (
            <AuraButton key={label} onClick={() => handleSend(prompt)}>{label}</AuraButton>
          ))}
        </div>

        {/* Troca de provedor */}
        <div className="aura-row">
          {PROVIDERS.map(([id, name]) => (
            <AuraButton key={id} className="pill" active={provider === id} onClick={() => setProvider(id)}>
              <ProviderIcon provider={id} size={18} />
              {name}
            </AuraButton>
          ))}
        </div>

        {/* Resposta */}
        {response && (
          <div
            className="aura-response"
            ref={responseRef}
            role="region"
            aria-label={`Resposta do Aura IA via ${response.providerName}`}
          >
            <div className="aura-response-head">
              <span className="aura-response-title">
                <ProviderIcon provider={provider} size={18} /> Resposta do Aura IA ({response.providerName})
              </span>
              <div className="aura-response-actions">
                <AuraButton className="pill" onClick={replaySpeech} aria-label="Ouvir a resposta novamente">Ouvir Novamente</AuraButton>
                <AuraButton className="pill" onClick={handleStopSpeech} aria-label="Parar a leitura por voz">Parar Voz</AuraButton>
              </div>
            </div>
            <Scroller className="aura-response-scroller" direction="vertical">
              <div
                className="aura-response-body"
                tabIndex={0}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: formatMarkdown(response.text) }}
              />
            </Scroller>
          </div>
        )}
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="aura-footer">
        <span>🔴 Limpar &nbsp;|&nbsp; 🟢 Falar &nbsp;|&nbsp; 🟡 Reouvir &nbsp;|&nbsp; 🔵 Chaves</span>
        {isWebOS() && device && (
          <span className="aura-footer-dev">
            {device.modelName || 'LG'} · webOS {device.sdkVersion || '?'} · {device.screenWidth}×{device.screenHeight}
          </span>
        )}
      </footer>

      {showConfig && <ConfigModal provider={provider} onProviderChange={setProvider} onClose={closeConfig} />}
      {showMobile && <MobileModal syncStatus={syncStatus} onClose={() => setShowMobile(false)} />}
      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}

      {announceChildren}
    </div>
  );
};

export default MainPanel;
