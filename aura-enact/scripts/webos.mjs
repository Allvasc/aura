#!/usr/bin/env node
/**
 * Fluxo webOS TV do Aura IA — build, empacota e roda no simulador,
 * no emulador ou numa TV real.
 *
 *   node scripts/webos.mjs <comando> [opcoes]
 *
 * Comandos:
 *   build              enact pack -p              (gera ./dist)
 *   package            build + ares-package       (gera ./bin/*.ipk)
 *   sim [versao]       package + abre no webOS TV Simulator (padrao 6.0)
 *   deploy [device]    package + install + launch + inspect  (padrao: emulator)
 *   inspect [device]   abre o Web Inspector do app no device
 *   add-tv <ip>        registra uma TV real (Modo Desenvolvedor ligado) como device "tv"
 *   devices            lista os devices configurados
 *
 * Ex.:  npm run sim
 *       npm run deploy -- tv
 *       node scripts/webos.mjs add-tv 192.168.0.42
 */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {existsSync, readdirSync} from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_ID = 'com.aura.ia.app';
const DIST = resolve(ROOT, 'dist');
const BIN = resolve(ROOT, 'bin');

const run = (cmd, args, opts = {}) => {
	console.log(`\n$ ${cmd} ${args.join(' ')}`);
	const r = spawnSync(cmd, args, {cwd: ROOT, stdio: 'inherit', shell: true, ...opts});
	if (r.status !== 0) {
		console.error(`\n✗ falhou: ${cmd} (codigo ${r.status})`);
		process.exit(r.status || 1);
	}
	return r;
};

const ipkPath = () => {
	if (!existsSync(BIN)) return null;
	const ipk = readdirSync(BIN).filter((f) => f.endsWith('.ipk')).sort().pop();
	return ipk ? resolve(BIN, ipk) : null;
};

// --- comandos -----------------------------------------------------------

function build() {
	run('npx', ['enact', 'pack', '-p']);
}

function pkg() {
	build();
	run('npx', ['ares-package', JSON.stringify(DIST), '-o', JSON.stringify(BIN)]);
	const ipk = ipkPath();
	console.log(`\n✓ pacote: ${ipk}`);
	return ipk;
}

// Procura a pasta do webOS TV Simulator nos locais mais comuns no Windows.
// Pode-se forçar com a env var AURA_SIMULATOR_PATH.
function findSimulator() {
	const home = process.env.USERPROFILE || process.env.HOME || '';
	const candidates = [
		process.env.AURA_SIMULATOR_PATH,
		'C:\\webOS_TV_Simulator',
		'C:\\Program Files\\webOS_TV_Simulator',
		'C:\\webOS_TV_SDK\\Simulator',
		home && resolve(home, 'AppData/Local/Programs/webOS_TV_Simulator'),
		home && resolve(home, '.webos-studio/sdk'),
		home && resolve(home, 'webOS_TV_Simulator')
	].filter(Boolean);
	for (const base of candidates) {
		if (!existsSync(base)) continue;
		// aceita a propria pasta ou uma subpasta versionada (ex.: webOS_TV_Simulator_6.0.0)
		if (readdirSync(base).some((f) => /simulator/i.test(f))) return base;
		try {
			const sub = readdirSync(base).find((f) => /simulator/i.test(f));
			if (sub) return resolve(base, sub);
		} catch { /* ignora */ }
		return base;
	}
	return null;
}

function sim(version = '6.0') {
	build();
	if (!existsSync(DIST)) {
		console.error('✗ ./dist nao existe'); process.exit(1);
	}
	const simPath = findSimulator();
	console.log(`\n▶ abrindo no webOS TV Simulator ${version} ...`);
	const args = ['ares-launch', '--simulator', version, JSON.stringify(DIST)];
	if (simPath) {
		console.log(`  simulator: ${simPath}`);
		args.push('--simulator-path', JSON.stringify(simPath));
	} else {
		console.log('  ⚠ Simulator nao encontrado automaticamente.');
		console.log('    Instale via "webOS Studio > Simulator Manager" no VS Code, ou');
		console.log('    defina AURA_SIMULATOR_PATH=<pasta do simulator> e rode de novo.');
		console.log('    Alternativa: comando "webOS TV: Run on Simulator" no VS Code.');
	}
	run('npx', args);
}

function deploy(device = 'emulator') {
	const ipk = pkg();
	if (!ipk) { console.error('✗ nenhum .ipk gerado'); process.exit(1); }
	run('npx', ['ares-install', '--device', device, JSON.stringify(ipk)]);
	run('npx', ['ares-launch', '--device', device, APP_ID]);
	console.log(`\n✓ ${APP_ID} rodando em "${device}".`);
	inspect(device);
}

function inspect(device = 'emulator') {
	run('npx', ['ares-inspect', '--device', device, '--app', APP_ID, '--open']);
}

function addTv(ip) {
	if (!ip) { console.error('uso: node scripts/webos.mjs add-tv <ip-da-tv>'); process.exit(1); }
	run('npx', [
		'ares-setup-device', '--add', 'tv',
		'-i', `"host=${ip}"`, '-i', '"port=9922"', '-i', '"username=prisoner"',
		'-i', '"description=LG webOS TV (Modo Desenvolvedor)"'
	]);
	console.log('\nProximo passo — chave SSH da TV (Developer Mode > Key Server ligado):');
	console.log('  npx ares-novacom --device tv --getkey    (pede o passphrase que aparece no app Developer Mode)');
}

function devices() {
	run('npx', ['ares-setup-device', '--listfull']);
}

// --- dispatch ---------------------------------------------------------
const [, , cmd, arg] = process.argv;
({
	build,
	package: pkg,
	sim: () => sim(arg),
	deploy: () => deploy(arg),
	inspect: () => inspect(arg),
	'add-tv': () => addTv(arg),
	devices
}[cmd] || (() => {
	console.log('comandos: build | package | sim [versao] | deploy [device] | inspect [device] | add-tv <ip> | devices');
	process.exit(1);
}))();
