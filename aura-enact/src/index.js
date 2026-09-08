import { createRoot } from 'react-dom/client';
import App from './App';

if (typeof window !== 'undefined') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  }

  // Notifica o sistema operacional da TV LG webOS que o app está pronto (evita tela preta no boot)
  if (window.webOSSystem && window.webOSSystem.stageReady) {
    window.webOSSystem.stageReady();
  }
  document.dispatchEvent(new CustomEvent('webOSLaunch'));
}

export default App;
