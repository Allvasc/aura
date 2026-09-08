import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import Modal from './Modal';
import AuraButton from './AuraButton';
import { getDeviceCode, mobileUrl } from '../services/sync';

const MobileModal = ({ syncStatus, onClose }) => {
	const code = getDeviceCode();
	const url = mobileUrl(code);
	const [qr, setQr] = useState('');

	useEffect(() => {
		QRCode.toDataURL(url, { width: 300, margin: 1, color: { dark: '#0b1220', light: '#ffffff' } })
			.then(setQr)
			.catch(() => setQr(''));
	}, [url]);

	return (
		<Modal title="📲 Configurar / Controlar pelo Celular" spotlightId="aura-mobile">
			<p className="aura-modal-sub">
				Aponte a câmera do celular para o QR Code para colar as chaves de API ou enviar perguntas para a TV:
			</p>

			<div className="aura-qr">
				{qr ? <img src={qr} alt="QR Code" width={280} height={280} /> : <div className="aura-qr-empty">Gerando QR…</div>}
			</div>

			<p className="aura-modal-line">
				No celular acesse: <strong>{url.replace(/^https?:\/\//, '')}</strong>
			</p>
			<p className="aura-modal-line">
				Código de pareamento: <strong className="aura-pair-code">{code}</strong>
			</p>
			<p className="aura-modal-hint">
				Conexão com o servidor: {syncStatus === 'online' ? '🟢 conectada' : '🔴 offline (o servidor gratuito pode levar ~30s para acordar)'}
			</p>

			<div className="aura-modal-actions">
				<AuraButton className="pill" onClick={onClose}>Fechar</AuraButton>
			</div>
		</Modal>
	);
};

export default MobileModal;
