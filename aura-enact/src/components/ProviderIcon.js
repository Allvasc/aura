// Logos das IAs (SVG inline) — portados do app vanilla.

const ProviderIcon = ({ provider, size = 20 }) => {
	if (provider === 'chatgpt') {
		return (
			<svg className="llm-icon chatgpt-icon" viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
				<path d="M22.28 9.82a6 6 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18 6 6 0 0 0 .98 7.08a6.05 6.05 0 0 0 .74 7.05 6 6 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 6 6 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.51zM3.6 18.31a4.47 4.47 0 0 1-.54-3.01l.14.08 4.78 2.76a.79.79 0 0 0 .79 0l5.83-3.37v2.34a.07.07 0 0 1-.03.06l-4.84 2.79a4.5 4.5 0 0 1-6.13-1.65zM2.37 7.88a4.48 4.48 0 0 1 2.34-1.97v5.69a.79.79 0 0 0 .39.68l5.84 3.37-2.02 1.17a.07.07 0 0 1-.07 0l-4.84-2.79a4.5 4.5 0 0 1-1.64-6.15zm16.43 3.02l-5.84-3.37 2.02-1.17a.07.07 0 0 1 .07 0l4.84 2.79a4.5 4.5 0 0 1 1.64 6.14 4.48 4.48 0 0 1-2.34 1.97v-5.69a.79.79 0 0 0-.39-.67zm1.88-4.39l-.14-.08-4.78-2.76a.79.79 0 0 0-.79 0l-5.83 3.37v-2.34a.07.07 0 0 1 .03-.06l4.84-2.79a4.5 4.5 0 0 1 6.67 4.66zm-12.44-4.22a4.48 4.48 0 0 1 2.88 1.04l-.14.08-4.78 2.76a.79.79 0 0 0-.39.68v6.74l-2.02-1.17a.07.07 0 0 1-.04-.05V8.16a4.5 4.5 0 0 1 4.49-4.49z" />
			</svg>
		);
	}
	if (provider === 'claude') {
		return (
			<svg className="llm-icon claude-icon" viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
				<path d="M14.862 3.52c-.322-.924-1.625-.924-1.947 0l-1.96 5.626a1.025 1.025 0 01-.628.628l-5.626 1.96c-.924.322-.924 1.625 0 1.947l5.626 1.96c.264.092.474.302.566.566l1.96 5.626c.322.924 1.625.924 1.947 0l1.96-5.626a1.025 1.025 0 01.628-.628l5.626-1.96c.924-.322.924-1.625 0-1.947l-5.626-1.96a1.025 1.025 0 01-.628-.628l-1.96-5.626z" />
			</svg>
		);
	}
	// gemini
	return (
		<svg className="llm-icon gemini-icon" viewBox="0 0 24 24" width={size} height={size} fill="none">
			<path
				d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
				fill="url(#aura-gem-grad)"
			/>
			<defs>
				<linearGradient id="aura-gem-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
					<stop stopColor="#4E82EE" />
					<stop offset="0.5" stopColor="#9B72CB" />
					<stop offset="1" stopColor="#D96570" />
				</linearGradient>
			</defs>
		</svg>
	);
};

export default ProviderIcon;
