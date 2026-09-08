import { useState } from 'react';

import Modal from './Modal';
import AuraButton from './AuraButton';
import { getDeviceCode } from '../services/sync';

const readVip = () => {
	try { return window.localStorage.getItem('aura_vip_active') === 'true'; } catch (e) { return false; }
};

const AccountModal = ({ onClose }) => {
	const code = getDeviceCode();
	const [vip, setVip] = useState(readVip);

	const activate = () => {
		try { window.localStorage.setItem('aura_vip_active', 'true'); } catch (e) { /* ignora */ }
		setVip(true);
	};

	return (
		<Modal title="🔑 Ativação da Conta na TV" spotlightId="aura-account">
			{vip ? (
				<p className="aura-modal-sub">✨ Conta Aura IA VIP ativa nesta Smart TV.</p>
			) : (
				<>
					<p className="aura-modal-sub">
						Acesse <strong>aura.app/conectar</strong> no celular ou computador e digite este código de ativação:
					</p>
					<div className="aura-qr">
						<span className="aura-pair-code aura-pair-code-big">{code}</span>
					</div>
					<p className="aura-modal-hint">Aguardando confirmação de assinatura…</p>
				</>
			)}

			<div className="aura-modal-actions">
				{!vip && <AuraButton variant="primary" onClick={activate}>Simular Ativação VIP</AuraButton>}
				<AuraButton className="pill" onClick={onClose}>Fechar</AuraButton>
			</div>
		</Modal>
	);
};

export default AccountModal;
