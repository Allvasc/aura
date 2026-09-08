import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchInstalledTVApps, speakLunaNative, stopLunaNativeTTS } from '../services/webosService';
import { fetchAIResponse } from '../services/aiService';
import AuraButton from '../components/AuraButton';
import ConfigModal from '../components/ConfigModal';

const readLS = (k, fallback = '') => {
  try { return window.localStorage.getItem(k) || fallback; } catch { return fallback; }
};
const writeLS = (k, v) => {
  try { window.localStorage.setItem(k, v); } catch { /* indisponivel */ }
};

const PROVIDERS = [
  ['gemini', 'Google Gemini'],
  ['chatgpt', 'OpenAI ChatGPT'],
  ['claude', 'Anthropic Claude']
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

const MainPanel = () => {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState(() => readLS('aura_active_provider', 'gemini'));
  const [status, setStatus] = useState('Pronto! Faça uma pergunta por voz ou escolha um atalho abaixo...');
  const [orbState, setOrbState] = useState('idle');
  const [response, setResponse] = useState(null);
  const [clock, setClock] = useState(fmtClock());
  const [showConfig, setShowConfig] = useState(false);

  const recognitionRef = useRef(null);

  const hasKey = (p) => !!readLS(`key_${p}`);

  const changeProvider = useCallback((id) => {
    setProvider(id);
    writeLS('aura_active_provider', id);
  }, []);

  const closeConfig = useCallback((saved) => {
    setShowConfig(false);
    if (saved) setStatus('Chaves salvas! Já pode fazer perguntas.');
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchInstalledTVApps((apps, summary) => {
      console.log('Enact webOS Apps carregados:', summary);
    });
  }, []);

  const activeProviderName = PROVIDERS.find((p) => p[0] === provider)[1];

  const handleSend = useCallback(async (textToSend) => {
    const q = (textToSend || query || '').trim();
    if (!q) return;

    if (!hasKey(provider)) {
      setStatus(`Configure a chave do ${activeProviderName} para começar.`);
      setShowConfig(true);
      return;
    }

    setResponse(null);
    setOrbState('thinking');
    setStatus('Consultando a inteligência artificial...');

    try {
      const res = await fetchAIResponse(provider, q);
      setResponse(res);
      setOrbState('speaking');
      setStatus(`✨ Resposta gerada via ${res.providerName}`);

      speakLunaNative(res.text, (ok) => {
        if (!ok && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
          const u = new window.SpeechSynthesisUtterance(res.text.replace(/[*_#`~]/g, ''));
          u.lang = 'pt-BR';
          u.onend = () => setOrbState('idle');
          window.speechSynthesis.speak(u);
        }
      });
    } catch (err) {
      setStatus('Ops! Não consegui falar com a inteligência artificial agora.');
      setOrbState('idle');
    }
  }, [provider, query]);

  const handleStopSpeech = useCallback(() => {
    stopLunaNativeTTS();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setOrbState('idle');
  }, []);

  const handleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus('Reconhecimento de voz não disponível nesta TV. Digite sua pergunta.');
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      setOrbState('idle');
      return;
    }

    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    const watchdog = setTimeout(() => rec.abort(), 10000);

    setOrbState('listening');
    setStatus('Ouvindo... pode falar!');

    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setQuery(text);
      handleSend(text);
    };
    rec.onerror = () => {
      setStatus('Não entendi. Tente novamente.');
      setOrbState('idle');
    };
    rec.onend = () => {
      clearTimeout(watchdog);
      recognitionRef.current = null;
      if (orbState === 'listening') setOrbState('idle');
    };

    rec.start();
  }, [handleSend, orbState]);

  return (
    <div className="aura-root">
      {/* ---------- Header ---------- */}
      <header className="aura-header">
        <div className="aura-brand">
          <div className="aura-dot" />
          <h1>AURA</h1>
          <span className="aura-badge">{activeProviderName.split(' ').pop()}</span>
        </div>
        <div className="aura-header-right">
          <AuraButton className="pill" onClick={() => setShowConfig(true)}>
            Chaves / IAs
          </AuraButton>
          <div className="aura-clock">{clock}</div>
        </div>
      </header>

      {/* ---------- Conteúdo ---------- */}
      <main className="aura-main">
        <div className="aura-orb-wrap">
          <div className={`ai-orb ${orbState}`}>
            <div className="orb-core" />
            <div className="orb-ring ring-1" />
            <div className="orb-ring ring-2" />
          </div>
          <div className="aura-status">{status}</div>
        </div>

        {/* Barra de pergunta */}
        <div className="aura-searchbox">
          <AuraButton className="pill" onClick={handleMic}>
            {orbState === 'listening' ? '● Gravando' : 'Falar'}
          </AuraButton>
          <input
            type="text"
            className="spottable aura-input"
            placeholder="Fale ou digite sua pergunta aqui..."
            value={query}
            autoComplete="off"
            onChange={(ev) => setQuery(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') handleSend(query); }}
          />
          <AuraButton variant="primary" onClick={() => handleSend(query)}>
            Perguntar
          </AuraButton>
        </div>

        {/* Atalhos rápidos */}
        <div className="aura-shortcuts">
          {SHORTCUTS.map(([label, prompt]) => (
            <AuraButton key={label} onClick={() => handleSend(prompt)}>
              {label}
            </AuraButton>
          ))}
        </div>

        {/* Troca de provedor */}
        <div className="aura-row">
          {PROVIDERS.map(([id, name]) => (
            <AuraButton
              key={id}
              className="pill"
              active={provider === id}
              onClick={() => changeProvider(id)}
            >
              {name}
            </AuraButton>
          ))}
        </div>

        {/* Resposta */}
        {response && (
          <div className="aura-response">
            <div className="aura-response-head">
              <span className="aura-response-title">{response.providerName}</span>
              <AuraButton className="pill" onClick={handleStopSpeech}>Parar Voz</AuraButton>
            </div>
            <div className="aura-response-body">{response.text}</div>
          </div>
        )}
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="aura-footer">
        🔴 Limpar &nbsp;|&nbsp; 🟢 Falar &nbsp;|&nbsp; 🟡 Reouvir &nbsp;|&nbsp; 🔵 Provedores
      </footer>

      {showConfig && <ConfigModal onClose={closeConfig} />}
    </div>
  );
};

export default MainPanel;
