import { useState, useEffect } from 'react';
import kind from '@enact/core/kind';
import { Panel, Header } from '@enact/limestone/Panels';
import Button from '@enact/limestone/Button';
import Input from '@enact/limestone/Input';
import Scroller from '@enact/limestone/Scroller';

import { fetchInstalledTVApps, speakLunaNative, stopLunaNativeTTS } from '../services/webosService';
import { fetchAIResponse } from '../services/aiService';

const MainPanel = () => {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [status, setStatus] = useState('Pronto! Faça uma pergunta por voz ou escolha um atalho...');
  const [orbState, setOrbState] = useState('idle');
  const [response, setResponse] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  return (
    <Panel style={{ padding: '30px 40px' }}>
      <Header
        title="AURA IA"
        subtitle={`Provedor Ativo: ${provider.toUpperCase()}`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', margin: '30px 0' }}>
        {/* Esfera de IA Animada */}
        <div className={`ai-orb ${orbState}`} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', color: '#94a3b8' }}>{status}</div>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '900px' }}>
          <Input
            placeholder="Digite ou fale sua pergunta aqui..."
            value={query}
            onChange={(e) => setQuery(e.value)}
            style={{ flex: 1 }}
          />
          <Button onClick={() => handleSend(query)}>Perguntar</Button>
        </div>

        {/* Shortcuts */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button onClick={() => { setQuery('Ideias de jantar'); handleSend('Ideias de jantar'); }}>
            🍲 Ideias de Jantar
          </Button>
          <Button onClick={() => { setQuery('Curiosidade do dia'); handleSend('Curiosidade do dia'); }}>
            ✨ Curiosidade do Dia
          </Button>
          <Button onClick={() => { setQuery('História curta'); handleSend('História curta'); }}>
            📖 História Curta
          </Button>
          <Button onClick={() => { setQuery('O que assistir na TV'); handleSend('O que assistir na TV'); }}>
            🎬 O que Assistir
          </Button>
        </div>

        {/* Provider Switcher */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <Button selected={provider === 'gemini'} onClick={() => setProvider('gemini')}>
            Google Gemini
          </Button>
          <Button selected={provider === 'chatgpt'} onClick={() => setProvider('chatgpt')}>
            OpenAI ChatGPT
          </Button>
          <Button selected={provider === 'claude'} onClick={() => setProvider('claude')}>
            Anthropic Claude
          </Button>
        </div>

        {/* Resposta */}
        {response && (
          <div style={{
            width: '100%',
            maxWidth: '900px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #00f2fe',
            borderRadius: '20px',
            padding: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ color: '#00f2fe', fontWeight: 'bold', fontSize: '1.3rem' }}>
                {response.providerName}
              </span>
              <Button onClick={handleStopSpeech}>Parar Voz</Button>
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
