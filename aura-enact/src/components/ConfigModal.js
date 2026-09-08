import { useEffect, useRef, useState } from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Spotlight from '@enact/spotlight';

import AuraButton from './AuraButton';

const Container = SpotlightContainerDecorator(
	{ enterTo: 'last-focused', preserveId: true, spotlightRestrict: 'self-only' },
	'div'
);

const FIELDS = [
	['key_gemini', 'Chave Google Gemini', 'AIzaSy...'],
	['key_chatgpt', 'Chave OpenAI ChatGPT', 'sk-proj-...'],
	['key_claude', 'Chave Anthropic Claude', 'sk-ant-...']
];

const read = (k) => {
	try { return window.localStorage.getItem(k) || ''; } catch { return ''; }
};

const ConfigModal = ({ onClose }) => {
	const [values, setValues] = useState(() => ({
		key_gemini: read('key_gemini'),
		key_chatgpt: read('key_chatgpt'),
		key_claude: read('key_claude')
	}));
	const firstInput = useRef(null);

	useEffect(() => {
		const prev = Spotlight.getCurrent();
		const t = setTimeout(() => {
			if (firstInput.current) firstInput.current.focus();
			else Spotlight.focus('aura-config');
		}, 60);
		return () => {
			clearTimeout(t);
			if (prev && prev.focus) prev.focus();
		};
	}, []);

	const setField = (k, v) => setValues((s) => ({ ...s, [k]: v }));

	const handleSave = () => {
		try {
			FIELDS.forEach(([k]) => {
				const v = (values[k] || '').trim();
				if (v) window.localStorage.setItem(k, v);
				else window.localStorage.removeItem(k);
			});
		} catch { /* localStorage indisponivel */ }
		onClose(true);
	};

	return (
		<div className="aura-modal">
			<Container spotlightId="aura-config" className="aura-modal-card">
				<h2 className="aura-modal-title">Configurar Chaves de IA</h2>
				<p className="aura-modal-sub">
					Cole a chave da API de cada serviço. Ela fica salva só nesta TV.
				</p>

				{FIELDS.map(([k, label, ph], i) => (
					<label key={k} className="aura-field">
						<span>{label}</span>
						<input
							ref={i === 0 ? firstInput : null}
							type="text"
							className="spottable aura-input aura-field-input"
							placeholder={ph}
							value={values[k]}
							autoComplete="off"
							spellCheck={false}
							onChange={(ev) => setField(k, ev.target.value)}
						/>
					</label>
				))}

				<div className="aura-modal-actions">
					<AuraButton variant="primary" onClick={handleSave}>Salvar</AuraButton>
					<AuraButton className="pill" onClick={() => onClose(false)}>Fechar</AuraButton>
				</div>
			</Container>
		</div>
	);
};

export default ConfigModal;
