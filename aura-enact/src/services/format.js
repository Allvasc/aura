// Converte o Markdown simples das respostas de IA em HTML seguro,
// no mesmo estilo do app vanilla (negrito, itálico, listas, parágrafos).
// O texto é escapado antes de qualquer tag ser inserida.

const escapeHtml = (s) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function formatMarkdown(text) {
	if (!text) return '';

	let out = escapeHtml(text);

	// **negrito**
	out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	// *itálico* (evita casar com ** já consumido)
	out = out.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
	// `código`
	out = out.replace(/`([^`]+?)`/g, '<code>$1</code>');

	// listas numeradas "1. item"
	out = out.replace(
		/^\s*(\d+)\.\s+(.*)$/gim,
		'<div class="aura-li"><span class="aura-li-num">$1</span><span>$2</span></div>'
	);
	// listas com marcador "- item" / "* item"
	out = out.replace(
		/^\s*[*-]\s+(.*)$/gim,
		'<div class="aura-li"><span class="aura-li-dot">•</span><span>$1</span></div>'
	);

	// parágrafos
	out = out
		.split(/\n\n+/)
		.map((p) => `<p class="aura-p">${p.replace(/\n/g, '<br>')}</p>`)
		.join('');

	// limpa <br> grudado nos itens de lista
	return out
		.replace(/<br>\s*(<div class="aura-li">)/g, '$1')
		.replace(/(<\/div>)\s*<br>/g, '$1');
}

// Texto limpo para a leitura por voz (tira marcações).
export const stripMarkdown = (text) =>
	(text || '').replace(/[*_#`~]/g, '').replace(/\s+/g, ' ').trim();
