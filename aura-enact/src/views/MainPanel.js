import { useState, useEffect } from 'react';
import { Panel, Header } from '@enact/sandstone/Panels';
import Button from '@enact/sandstone/Button';
import Input from '@enact/sandstone/Input';
import Scroller from '@enact/sandstone/Scroller';

import { fetchInstalledTVApps, speakLunaNative, stopLunaNativeTTS } from '../services/webosService';
import { fetchAIResponse } from '../services/aiService';

const MainPanel = () => {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [status, setStatus] = useState('Pronto! Faça uma pergunta por voz ou escolha um atalho...');
  const [orbState, setOrbState] = useState('idle');
  const [response, setResponse] = useState(null);

  useEffect(() => {
    fetchInstalledTVApps((apps, summary) => {
      console.log('Enact webOS Apps loaded:', summary);
    });
  }, []);

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q || !q.trim()) return;

    setResponse(null);
    setOrbState('thinking');
    setStatus(`Consultando IA...`);

    try {
      const res = await fetchAIResponse(provider, q);
      setResponse(res);
      setOrbState('speaking');
      setStatus(`✨ Resposta do Aura IA (${res.providerName})`);
      
      // Voz Nativa
      speakLunaNative(res.text, (success) => {
        if (!success) {
          // Fallback Web Speech
          if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
            const u = new window.SpeechSynthesisUtterance(res.text.replace(/[*_#`~]/g, ''));
            u.lang = 'pt-BR';
            u.onend = () => setOrbState('idle');
            window.speechSynthesis.speak(u);
          }
        }
      });
    } catch (err) {
      setStatus('Ops! Erro ao consultar a Inteligência Artificial.');
      setOrbState('idle');
    }
  };

  const handleStopSpeech = () => {
    stopLunaNativeTTS();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setOrbState('idle');
  };

  const handleQueryChange = (ev) => setQuery(ev.value);
  const handleAsk = () => handleSend(query);

  // Nota: layout evita `gap` em flexbox (sem suporte no Chrome 68 / webOS 5);
  // o espacamento e feito com margin nos filhos.
  const shortcuts = [
    ['🍲 Ideias de Jantar', 'Me dê 3 ideias de jantares rápidos e deliciosos para fazer hoje em casa.'],
    ['✨ Curiosidade do Dia', 'Me conte uma curiosidade incrível e fascinante sobre o universo ou a ciência.'],
    ['📖 História Curta', 'Me conte uma história curta, divertida e envolvente para ler antes de dormir.'],
    ['🎬 O que Assistir', 'Me dê 3 sugestões de filmes ou séries de suspense ou ficção científica para assistir na TV.']
  ];

  return (
    <Panel>
      <Header
        title="AURA IA"
        subtitle={`Provedor Ativo: ${provider.toUpperCase()}`}
      />

      <div style={{ textAlign: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <div className={`ai-orb ${orbState}`} style={{ margin: '24px 0' }}>
          <div style={{ fontSize: '1.4rem', color: '#94a3b8' }}>{status}</div>
        </div>

        {/* Barra de pergunta */}
        <div style={{ margin: '24px 0' }}>
          <Input
            placeholder="Digite ou fale sua pergunta aqui..."
            value={query}
            onChange={handleQueryChange}
            style={{ width: '900px', maxWidth: '80%' }}
          />
          <Button onClick={handleAsk} style={{ marginLeft: '16px' }}>Perguntar</Button>
        </div>

        {/* Atalhos rapidos */}
        <div style={{ margin: '24px 0' }}>
          {shortcuts.map(([label, prompt]) => (
            <Button key={label} onClick={() => handleSend(prompt)} style={{ margin: '8px' }}>
              {label}
            </Button>
          ))}
        </div>

        {/* Troca de provedor */}
        <div style={{ margin: '24px 0' }}>
          <Button selected={provider === 'gemini'} onClick={() => setProvider('gemini')} style={{ margin: '8px' }}>
            Google Gemini
          </Button>
          <Button selected={provider === 'chatgpt'} onClick={() => setProvider('chatgpt')} style={{ margin: '8px' }}>
            OpenAI ChatGPT
          </Button>
          <Button selected={provider === 'claude'} onClick={() => setProvider('claude')} style={{ margin: '8px' }}>
            Anthropic Claude
          </Button>
        </div>

        {/* Resposta */}
        {response && (
          <div style={{
            width: '900px',
            maxWidth: '90%',
            margin: '0 auto',
            textAlign: 'left',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #00f2fe',
            borderRadius: '20px',
            padding: '30px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ color: '#00f2fe', fontWeight: 'bold', fontSize: '1.3rem' }}>
                {response.providerName}
              </span>
              <Button onClick={handleStopSpeech} style={{ marginLeft: '16px' }}>Parar Voz</Button>
            </div>
            <Scroller style={{ height: '260px' }}>
              <div style={{ fontSize: '1.3rem', lineHeight: '1.8', color: '#e2e8f0' }}>
                {response.text}
              </div>
            </Scroller>
          </div>
        )}
      </div>
    </Panel>
  );
};

export default MainPanel;
