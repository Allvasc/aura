import { useEffect } from 'react';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Spotlight from '@enact/spotlight';

const Container = SpotlightContainerDecorator(
	{ enterTo: 'last-focused', preserveId: true, spotlightRestrict: 'self-only' },
	'div'
);

let seq = 0;

// Overlay modal com foco preso (self-only) e restauração do foco ao fechar.
const Modal = ({ title, spotlightId, children }) => {
	const id = spotlightId || `aura-modal-${++seq}`;

	useEffect(() => {
		const prev = Spotlight.getCurrent();
		const t = setTimeout(() => Spotlight.focus(id), 60);
		return () => {
			clearTimeout(t);
			if (prev && prev.focus) prev.focus();
		};
	}, [id]);

	return (
		<div className="aura-modal">
			<Container
				spotlightId={id}
				className="aura-modal-card"
				role="dialog"
				aria-modal="true"
				aria-label={typeof title === 'string' ? title : 'Janela'}
			>
				{title && <h2 className="aura-modal-title">{title}</h2>}
				{children}
			</Container>
		</div>
	);
};

export default Modal;
