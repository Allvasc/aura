import { useEffect, useRef, useState } from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Spotlight from '@enact/spotlight';

import AuraButton from './AuraButton';
import ProviderIcon from './ProviderIcon';

const Container = SpotlightContainerDecorator(
	{ enterTo: 'last-focused', preserveId: true, spotlightRestrict: 'self-only' },
	'div'
);

const PROVIDERS = [
	['gemini', 'Google Gemini'],
	['chatgpt', 'OpenAI ChatGPT'],
	['claude', 'Anthropic Claude']
];

const FIELDS = [
	['key_gemini', 'gemini', 'Chave Google Gemini', 'AIzaSy...'],
	['key_chatgpt', 'chatgpt', 'Chave OpenAI ChatGPT', 'sk-proj-...'],
	['key_claude', 'claude', 'Chave Anthropic Claude', 'sk-ant-...']
];

const read = (k) => {
	try { return window.localStorage.getItem(k) || ''; } catch { return ''; }
};

const ConfigModal = ({ provider, onProviderChange, onClose }) => {
	const [values, setValues] = useState(() => ({
		key_gemini: read('key_gemini'),
		key_chatgpt: read('key_chatgpt'),
		key_claude: read('key_claude')
	}));
	const firstFocus = useRef(null);

	useEffect(() => {
		const prev = Spotlight.getCurrent();
		const t = setTimeout(() => {
			if (firstFocus.current && firstFocus.current.focus) firstFocus.current.focus();
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
				<h2 className="aura-modal-title">Configurações de Inteligência Artificial</h2>

				<p className="aura-modal-sub">🤖 Escolha qual IA vai responder:</p>
				<div className="aura-provider-choice">
					{PROVIDERS.map(([id, name], i) => (
						<AuraButton
							key={id}
							ref={i === 0 ? firstFocus : null}
							className="pill"
							active={provider === id}
							onClick={() => onProviderChange(id)}
						>
							<ProviderIcon provider={id} size={18} />
							{name}
						</AuraButton>
					))}
				</div>

				<p className="aura-modal-sub">🔑 Cole a chave da API de cada serviço (fica salva só nesta TV):</p>
				{FIELDS.map(([k, pid, label, ph]) => (
					<label key={k} className="aura-field">
						<span><ProviderIcon provider={pid} size={16} /> {label}</span>
						<input
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
					<AuraButton variant="primary" onClick={handleSave}>Salvar Alterações</AuraButton>
					<AuraButton className="pill" onClick={() => onClose(false)}>Fechar</AuraButton>
				</div>
			</Container>
		</div>
	);
};

export default ConfigModal;
