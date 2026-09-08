import Spottable from '@enact/spotlight/Spottable';

// Botao navegavel pelo controle da TV, com o visual do Aura.
// Spotlight aplica foco (:focus) e dispara onClick no OK/Enter.
const SpottableDiv = Spottable('div');

const AuraButton = ({variant, active, className = '', children, ...rest}) => {
	const classes = ['aura-btn'];
	if (variant) classes.push(variant);
	if (active) classes.push('active');
	if (className) classes.push(className);

	return (
		<SpottableDiv role="button" className={classes.join(' ')} {...rest}>
			{children}
		</SpottableDiv>
	);
};

export default AuraButton;
