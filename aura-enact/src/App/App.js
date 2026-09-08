import kind from '@enact/core/kind';
import ThemeDecorator from '@enact/sandstone/ThemeDecorator';

// Fonte Outfit auto-hospedada (sem depender de CDN / rede na TV)
import '@fontsource/outfit/latin-300.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';

import MainPanel from '../views/MainPanel';

import css from './App.module.less';

const App = kind({
	name: 'App',

	styles: {
		css,
		className: 'app'
	},

	render: (props) => (
		<div {...props}>
			<MainPanel />
		</div>
	)
});

// ThemeDecorator: inicializa Spotlight (navegacao pelo controle),
// resolucao independente e i18n. Sem Panels — o layout e proprio.
export default ThemeDecorator(App);
