import { getInstalledAppsSummary, adjustTVVolume, toggleTVMute, launchAppOnTV } from './webosService';

// Os comandos de hardware rodam em background (Luna); ignora falha silenciosamente.
const fire = (p) => { if (p && p.catch) p.catch(() => {}); };

export function parseAndExecuteIntents(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  if (q.includes('aumenta o volume') || q.includes('aumentar volume') || q.includes('subir volume') || q.includes('mais alto')) {
    fire(adjustTVVolume('up'));
    return 'Aumentei o volume da sua Smart TV LG!';
  }
  if (q.includes('diminui o volume') || q.includes('diminuir volume') || q.includes('baixar volume') || q.includes('mais baixo')) {
    fire(adjustTVVolume('down'));
    return 'Diminuí o volume da sua Smart TV LG!';
  }
  if (q.includes('mudo') || q.includes('mutar tv') || q.includes('silenciar')) {
    fire(toggleTVMute());
    return 'Alterei a função Mudo na sua Smart TV LG!';
  }
  if (q.includes('youtube')) {
    fire(launchAppOnTV('youtube.leanback.v4'));
    return 'Abrindo o aplicativo do YouTube na sua Smart TV LG...';
  }
  if (q.includes('netflix')) {
    fire(launchAppOnTV('netflix'));
    return 'Abrindo o aplicativo da Netflix na sua Smart TV LG...';
  }
  if (q.includes('spotify')) {
    fire(launchAppOnTV('spotify-tv'));
    return 'Abrindo o aplicativo do Spotify na sua Smart TV LG...';
  }
  if (q.includes('prime video') || q.includes('amazon prime')) {
    fire(launchAppOnTV('amazon'));
    return 'Abrindo o Amazon Prime Video na sua Smart TV LG...';
  }
  if (q.includes('globoplay')) {
    fire(launchAppOnTV('globoplay'));
    return 'Abrindo o Globoplay na sua Smart TV LG...';
  }

  return null;
}

function getSystemPrompt(providerName) {
  const appsSummary = getInstalledAppsSummary();
  let sys = `Você é o Aura IA (Provedor ${providerName}), o assistente virtual oficial, futurista, amigável, onisciente e potente em um app Enact JS para Smart TV LG.`;
  if (appsSummary) {
    sys += ` Esta TV possui os seguintes apps instalados: [${appsSummary}]. Considere-os sempre nas recomendações.`;
  }
  sys += ` Responda de forma clara, direta e concisa em português do Brasil.`;
  return sys;
}

export async function fetchAIResponse(provider, query) {
  const directIntent = parseAndExecuteIntents(query);
  if (directIntent) {
    return { text: directIntent, providerName: 'Comando de Hardware TV' };
  }

  if (provider === 'chatgpt') {
    const text = await fetchChatGPT(query);
    return { text, providerName: 'OpenAI ChatGPT' };
  }
  if (provider === 'claude') {
    const text = await fetchClaude(query);
    return { text, providerName: 'Anthropic Claude' };
  }
  const text = await fetchGemini(query);
  return { text, providerName: 'Google Gemini' };
}

async function fetchGemini(query) {
  const apiKey = window.localStorage.getItem('key_gemini');
  if (!apiKey) {
    return 'Para usar o Google Gemini, insira sua chave no menu de configurações!';
  }

  const sysPrompt = getSystemPrompt('Google Gemini');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${sysPrompt}\n\nPergunta: ${query}` }]
      }]
    })
  });

  const data = await response.json();
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error('Resposta inválida do Gemini');
}

async function fetchChatGPT(query) {
  const apiKey = window.localStorage.getItem('key_chatgpt');
  if (!apiKey) {
    return 'Para usar o OpenAI ChatGPT, insira sua chave no menu de configurações!';
  }

  const sysPrompt = getSystemPrompt('OpenAI ChatGPT');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: query }
      ]
    })
  });

  const data = await response.json();
  if (data.choices && data.choices[0].message.content) {
    return data.choices[0].message.content;
  }
  throw new Error('Resposta inválida do ChatGPT');
}

async function fetchClaude(query) {
  const apiKey = window.localStorage.getItem('key_claude');
  if (!apiKey) {
    return 'Para usar o Anthropic Claude, insira sua chave no menu de configurações!';
  }

  const sysPrompt = getSystemPrompt('Anthropic Claude');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: sysPrompt,
      messages: [{ role: 'user', content: query }]
    })
  });

  const data = await response.json();
  if (data.content && data.content[0].text) {
    return data.content[0].text;
  }
  throw new Error('Resposta inválida do Claude');
}
