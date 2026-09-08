/* global ENACT_PACK_ISOMORPHIC */
import 'core-js/stable';
import {createRoot, hydrateRoot} from 'react-dom/client';

import App from './App';

const appElement = (<App />);

// Em ambiente de navegador (a TV), renderiza; no build isomórfico apenas exporta.
if (typeof window !== 'undefined') {
	const container = document.getElementById('root');

	if (container) {
		if (typeof ENACT_PACK_ISOMORPHIC !== 'undefined' && ENACT_PACK_ISOMORPHIC) {
			hydrateRoot(container, appElement);
		} else {
			createRoot(container).render(appElement);
		}
	}

	// webOS: avisa o sistema da TV LG que a UI está pronta (evita tela preta no boot)
	if (window.webOSSystem && typeof window.webOSSystem.stageReady === 'function') {
		window.webOSSystem.stageReady();
	}
}

export default appElement;
