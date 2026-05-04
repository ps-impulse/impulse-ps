import { ObjectReadWriteStream } from '../../../lib/streams';
import { StreamWorker } from '../../../lib/process-manager';
import { type PokeRogueState } from './types';
import {
	genAIPokemon, packAITeam, packTeam,
	type AIPokemonSet, botLevel,
} from './pokemon';
import { setState, getState } from './state';

class NoopStream extends ObjectReadWriteStream<string> {
	override _write(_data: string): void {}
}

const noopWorker = new StreamWorker(new NoopStream());
let botCounter = 0;

const botBattleHandlers = new Map<string, (roomid: string, requestLine: string) => void>();
const TRAINER_NAME = 'PokéRogue Challenger';

export function destroyBotUser(botUser: User): void {
	botBattleHandlers.delete(botUser.id);
	for (const c of botUser.connections.slice()) {
		c.onDisconnect();
	}
	if (Users.get(botUser.id) === botUser) {
		Users.delete(botUser);
	}
}

function createBotUser(playerId: string): User {
	const uid = ++botCounter;
	const connId = `pokerogue-bot-${uid}`;
	const botInternalName = `pokeroguebot${uid}`;

	let staleRoomId: RoomID | undefined;
	for (const [roomId, match] of activeMatches) {
		if (match.userId === toID(playerId)) {
			staleRoomId = roomId;
			break;
		}
	}
	if (staleRoomId !== undefined) {
		const room = Rooms.get(staleRoomId);
		const battleEnded = !room?.battle || room.battle.ended;
		if (battleEnded) {
			const staleMatch = activeMatches.get(staleRoomId);
			if (staleMatch) {
				const staleBot = Users.get(staleMatch.botUserId);
				if (staleBot) destroyBotUser(staleBot);
			}
			activeMatches.delete(staleRoomId);
		}
	}

	const conn = new Users.Connection(
		connId,
		noopWorker,
		String(uid),
		null,
		'127.0.0.1',
		null
	);

	const botUser = new Users.User(conn);
	conn.user = botUser;

	botUser.forceRename(botInternalName, true);
	(botUser as any).name = TRAINER_NAME;
	(botUser as any).named = false;

	(botUser as any).sendTo = function (roomid: RoomID | BasicRoom | null, data: string) {
		if (typeof data === 'string') {
			const lines = data.split('\n');
			for (const line of lines) {
				if (line.startsWith('|request|')) {
					const roomidStr = typeof roomid === 'string' ? roomid :
						(roomid as any)?.roomid ?? '';
					setTimeout(() => {
						const handler = botBattleHandlers.get(botUser.id);
						if (handler) handler(roomidStr, line);
					}, 150);
					break;
				}
			}
		}
	};

	return botUser;
}

const ABILITY_IMMUNITIES: Record<string, string[]> = {
	levitate: ['Ground'],
	flashfire: ['Fire'],
	voltabsorb: ['Electric'],
	waterabsorb: ['Water'],
	dryskin: ['Water'],
	stormdrain: ['Water'],
	lightningrod: ['Electric'],
	motordrive: ['Electric'],
	sapsipper: ['Grass'],
	wonderguard: [],
	eartheater: ['Ground'],
	wellbakedbody: ['Fire'],
	windpower: [],
	purifyingsalt: ['Ghost'],
	bulletproof: [],
	soundproof: [],
};

// bulletproof-blocked moves
const BULLETPROOF_MOVES = new Set([
	'aurasphere', 'barrage', 'beachballfall', 'beedrillrage', 'cannonball',
	'electroball', 'energyball', 'focusblast', 'gyroball', 'iceball',
	'magnetbomb', 'mindblown', 'mistball', 'mudbomb', 'octazooka',
	'paleowave', 'payday', 'pollenpuff', 'rockblast', 'rockwrecker',
	'seedbomb', 'shadowball', 'sludgebomb', 'weatherball', 'zingzap',
]);

// soundproof-blocked moves
const SOUNDPROOF_MOVES = new Set([
	'boomburst', 'bugbuzz', 'chatter', 'clangingscales', 'clangoroussoul',
	'disarmingvoice', 'echoedvoice', 'grasswhistle', 'growl', 'healbell',
	'howl', 'hypervoice', 'meloettaspiritedstep', 'nobleroar', 'overdrive',
	'perishsong', 'relicsong', 'roar', 'round', 'screech', 'shadowball',
	'sing', 'snarl', 'snore', 'sparklingsurge', 'supersonic', 'uproar',
]);

function getMoveEffectiveness(
	moveData: any,
	targetDex: any,
	targetAbility: string,
): number {
	const moveType = moveData.type as string;
	const moveId = moveData.id as string;

	// wonder guard: only super-effective hits
	if (targetAbility === 'wonderguard') {
		let eff = 1;
		for (const defType of targetDex.types) {
			eff *= Dex.getEffectiveness(moveType, defType);
		}
		return eff > 1 ? eff : 0;
	}

	if (targetAbility === 'bulletproof' && BULLETPROOF_MOVES.has(moveId)) return 0;

	if (targetAbility === 'soundproof' && SOUNDPROOF_MOVES.has(moveId)) return 0;

	
	const immuneTypes = ABILITY_IMMUNITIES[targetAbility];
	if (immuneTypes && immuneTypes.includes(moveType)) return 0;

	
	let effectiveness = 1;
	for (const defType of targetDex.types) {
		effectiveness *= Dex.getEffectiveness(moveType, defType);
	}
	return effectiveness;
}

function getStatCategoryModifier(moveData: any, pokemon: any): number {
	if (moveData.category === 'Status') return 1;

	const stats = pokemon.stats;
	if (!stats) return 1;

	if (moveData.category === 'Physical') {
		return stats.atk >= stats.spa ? 1.1 : 0.85;
	} else {
		return stats.spa >= stats.atk ? 1.1 : 0.85;
	}
}

// defensive score vs opponent move types
function getDefensiveScore(switchInSpecies: string, oppMoveTypes: string[]): number {
	const dex = Dex.species.get(switchInSpecies);
	if (!dex.exists) return 0;
	let score = 0;
	for (const atkType of oppMoveTypes) {
		let eff = 1;
		for (const defType of dex.types) {
			eff *= Dex.getEffectiveness(atkType, defType);
		}
		if (eff === 0) score += 3;
		else if (eff < 1) score += 1;
		else if (eff > 1) score -= 1.5;
	}
	return score;
}

function getOpponentMoveTypes(room: AnyObject | null | undefined, slot: number): string[] {
	try {
		const oppActive = (room?.battle)?.p1?.active?.[slot];
		if (!oppActive) return [];
		const species = Dex.species.get(oppActive.species?.name ?? '');
		return species.exists ? species.types : [];
	} catch {
		return [];
	}
}

function scoreMove(
	move: any,
	userSpecies: string,
	targetSpecies: string,
	targetAbility: string,
	userPokemon: any,
	turn: number,
): number {
	const moveData = Dex.moves.get(move.id);
	if (!moveData.exists) return 0;

	if (moveData.category === 'Status') {
		return scoreStatusMove(move.id, userPokemon, turn);
	}

	const userDex = Dex.species.get(userSpecies);
	const targetDex = Dex.species.get(targetSpecies);

	const effectiveness = targetDex.exists ?
		getMoveEffectiveness(moveData, targetDex, targetAbility) :
		1;

	if (effectiveness === 0) return -Infinity;

	let basePower = moveData.basePower ?? 0;
	if (basePower === 0) {
		basePower = estimateVariablePower(move.id);
	}
	if (basePower === 0) return 5;

	let score = basePower;

	
	score *= effectiveness;

	// super-effective bonus / resisted penalty
	if (effectiveness > 1) score *= 1.2;
	else if (effectiveness < 1) score *= 0.7;

	
	if (userDex.exists && userDex.types.includes(moveData.type)) {
		score *= 1.5;
	}

	
	score *= getStatCategoryModifier(moveData, userPokemon);

	
	const acc = moveData.accuracy;
	if (typeof acc === 'number') {
		score *= acc / 100;
	}

	// Recoil penalty
	if (moveData.recoil || moveData.mindBlownRecoil) score *= 0.85;
	if (moveData.struggle) score *= 0.5;

	// Multi-hit bonus
	if (moveData.multihit) score *= 1.25;

	// Priority bonus
	if ((moveData.priority ?? 0) > 0) {
		const hpRatio = parseHpRatio(userPokemon?.condition);
		if (hpRatio < 0.35) score *= 1.3;
		else score *= 1.05;
	}

	// Two-turn charge move penalty
	if (moveData.flags?.charge && !moveData.flags?.recharge) score *= 0.75;

	// Recharge next turn penalty
	if (moveData.flags?.recharge) score *= 0.8;

	return score;
}

// score status moves
function scoreStatusMove(moveId: string, pokemon: any, turn: number): number {
	if (['thunderwave', 'glare', 'stunspore'].includes(moveId)) return 55;

	if (['spore', 'sleeppowder', 'hypnosis', 'lovelykiss', 'sing', 'darkvoid'].includes(moveId)) return 65;

	if (['willowisp', 'scald'].includes(moveId)) return 50;

	if (['toxic', 'toxicspikes', 'poisongas', 'poisonpowder'].includes(moveId)) return 45;

	const setupMoves: Record<string, number> = {
		swordsdance: 75, nastyplot: 75, calmmind: 70, dragondance: 80,
		quiverdance: 80, shellsmash: 85, growth: 60, bulkup: 65,
		coilingcurrent: 70, tidyup: 65, victorydance: 80,
		agility: 55, rockpolish: 55,
	};
	if (setupMoves[moveId] !== undefined) {
		return turn <= 3 ? setupMoves[moveId] : setupMoves[moveId] * 0.5;
	}

	if (['stealthrock', 'spikes', 'toxicspikes', 'stickyweb'].includes(moveId)) return 40;

	if (['recover', 'roost', 'moonlight', 'morningsun', 'synthesis', 'slackoff',
		'milkdrink', 'softboiled', 'shoreup', 'lifedew', 'healorder'].includes(moveId)) {
		const hpRatio = parseHpRatio(pokemon?.condition);
		return hpRatio < 0.6 ? 60 : 10;
	}

	if (['reflect', 'lightscreen', 'auroraveil'].includes(moveId)) return 35;

	if (moveId === 'taunt') return 30;

	return 15;
}

// estimate variable move bp
function estimateVariablePower(moveId: string): number {
	const estimates: Record<string, number> = {
		gyroball: 60, electroball: 60, heatcrash: 60, heavyslam: 60,
		lowkick: 60, grassknot: 60, eruption: 100, waterspout: 100,
		reversal: 50, flail: 50, magnitude: 70, naturalgift: 70,
		trumpcard: 40, returnn: 102, frustration: 102,
		hiddenpower: 60, weatherball: 50, terrainpulse: 50,
		powertrip: 40, storedpower: 40, punishment: 60,
		knockoff: 65, acrobatics: 55, fling: 50,
	};
	return estimates[moveId] ?? 60;
}

// parse "hp/max" or "hp/max status" string
function parseHpRatio(condition: string | undefined): number {
	if (!condition || condition.endsWith(' fnt')) return 0;
	const match = /^(\d+)\/(\d+)/.exec(condition);
	if (!match) return 1;
	return parseInt(match[1]) / parseInt(match[2]);
}

function getOpponentAbility(room: AnyObject | null | undefined, slot: number): string {
	try {
		const oppActive = (room?.battle)?.p1?.active?.[slot];
		if (!oppActive) return '';
		return toID(oppActive.ability ?? oppActive.baseAbility ?? '');
	} catch {
		return '';
	}
}

function getOpponentSpecies(room: AnyObject | null | undefined, slot: number): string {
	try {
		const oppActive = (room?.battle)?.p1?.active?.[slot];
		if (!oppActive) return '';
		return toID(oppActive.species?.name ?? '');
	} catch {
		return '';
	}
}

function shouldSwitch(
	request: any,
	activeIdx: number,
	targetSpecies: string,
	targetAbility: string,
	room: AnyObject | null | undefined,
): number {
	const pokemon = request.side?.pokemon ?? [];
	const currentPokemon = pokemon[activeIdx];
	if (!currentPokemon) return 0;

	const hpRatio = parseHpRatio(currentPokemon.condition);
	const userSpecies = toID(currentPokemon.details?.split(',')[0] ?? '');
	const userDex = Dex.species.get(userSpecies);
	const targetDex = Dex.species.get(targetSpecies);

	// Check if current mon is fully walled (all moves immune/resisted)
	const active = (request.active as any[])[activeIdx];
	const moves: any[] = active?.moves ?? [];
	const usableMoves = moves.filter((m: any) => !m.disabled && (m.pp ?? 1) > 0);

	let bestMoveScore = 0;
	for (const m of usableMoves) {
		const moveData = Dex.moves.get(m.id);
		if (!moveData.exists || moveData.category === 'Status') continue;
		const eff = targetDex.exists ? getMoveEffectiveness(moveData, targetDex, targetAbility) : 1;
		if (eff > bestMoveScore) bestMoveScore = eff;
	}

	const isWalled = bestMoveScore === 0;

	let worstIncomingEff = 1;
	if (targetDex.exists && userDex.exists) {
		for (const atkType of targetDex.types) {
			let eff = 1;
			for (const defType of userDex.types) {
				eff *= Dex.getEffectiveness(atkType, defType);
			}
			if (eff > worstIncomingEff) worstIncomingEff = eff;
		}
	}

	const inBadMatchup = worstIncomingEff >= 2;
	const isLowHp = hpRatio < 0.25;
	const isCriticallyLow = hpRatio < 0.15;

	// Only switch if there's a real reason
	if (!isWalled && !inBadMatchup && !isLowHp) return 0;

	// Don't switch if HP is fine and matchup is only slightly bad
	if (hpRatio > 0.65 && !isWalled) return 0;

	const numActive = (request.active as any[]).length;
	const oppMoveTypes = getOpponentMoveTypes(room, activeIdx);

	const bench = pokemon
		.map((p: any, idx: number) => ({ p, idx: idx + 1 }))
		.filter(({ p, idx }: { p: any, idx: number }) =>
			idx > numActive &&
			!p.condition?.endsWith(' fnt')
		);

	if (!bench.length) return 0;

	const scored = bench.map(({ p, idx }: { p: any, idx: number }) => {
		const benchSpecies = toID(p.details?.split(',')[0] ?? '');
		const benchDex = Dex.species.get(benchSpecies);
		let score = 0;

		// Defensive score
		score += getDefensiveScore(benchSpecies, oppMoveTypes) * 1.5;

		// Offensive score vs opponent
		if (benchDex.exists && targetDex.exists) {
			for (const atkType of benchDex.types) {
				let eff = 1;
				for (const defType of targetDex.types) {
					eff *= Dex.getEffectiveness(atkType, defType);
				}
				if (eff > 1) score += eff * 2;
			}
		}

		score += parseHpRatio(p.condition) * 8;

		// Penalize switching into a bad matchup
		if (targetDex.exists && benchDex.exists) {
			for (const atkType of targetDex.types) {
				let eff = 1;
				for (const defType of benchDex.types) {
					eff *= Dex.getEffectiveness(atkType, defType);
				}
				if (eff >= 2) score -= 3;
				if (eff === 0) score += 2;
			}
		}

		return { idx, score };
	}).sort((a: any, b: any) => b.score - a.score);

	const best = scored[0];
	// only switch if clearly better
	if (best && best.score > 3) return best.idx;
	// force switch at critically low hp
	if (isCriticallyLow && bench.length) return scored[0]?.idx ?? 0;

	return 0;
}

// move history per battle room
const recentMoveHistory = new Map<string, Map<number, Map<string, number>>>();

function recordMoveUsed(roomid: string, slot: number, moveId: string, turn: number): void {
	if (!recentMoveHistory.has(roomid)) recentMoveHistory.set(roomid, new Map());
	const slots = recentMoveHistory.get(roomid)!;
	if (!slots.has(slot)) slots.set(slot, new Map());
	slots.get(slot)!.set(moveId, turn);
}

function getLastUsedTurn(roomid: string, slot: number, moveId: string): number {
	return recentMoveHistory.get(roomid)?.get(slot)?.get(moveId) ?? -99;
}

export function clearMoveHistory(roomid: string): void {
	recentMoveHistory.delete(roomid);
}

function makeAIChoice(requestJson: string, roomid: string, turn: number): string {
	let request: any;
	try {
		request = JSON.parse(requestJson.startsWith('|request|') ? requestJson.slice(9) : requestJson);
	} catch {
		return 'move 1';
	}

	if (!request || request.wait) return 'pass';

	if (request.teamPreview) {
		const count = request.side?.pokemon?.length ?? 1;
		const order = Array.from({ length: count }, (_, i) => i + 1);
		return `team ${order.join('')}`;
	}

	if (request.forceSwitch) {
		const choices: string[] = [];
		const pokemon = request.side?.pokemon ?? [];
		const chosen: number[] = [];
		const switchStart = (request.forceSwitch as boolean[]).length;

		for (const forceSwitchEntry of (request.forceSwitch as boolean[])) {
			if (!forceSwitchEntry) {
				choices.push('pass');
				continue;
			}
			const available = pokemon
				.map((p: any, idx: number) => ({ p, idx: idx + 1 }))
				.filter(({ p, idx }: { p: any, idx: number }) =>
					idx > switchStart &&
					!p.condition?.endsWith(' fnt') &&
					!chosen.includes(idx)
				)
				.sort((a: any, b: any) => {
					const aHp = parseHpRatio(a.p.condition);
					const bHp = parseHpRatio(b.p.condition);
					return bHp - aHp;
				});

			if (available.length) {
				const pick = available[0];
				chosen.push(pick.idx);
				choices.push(`switch ${pick.idx}`);
			} else {
				choices.push('pass');
			}
		}
		return choices.join(', ');
	}

	if (request.active) {
		const choicesList: string[] = [];

		const room = Rooms.get(roomid as RoomID);
		const match = activeMatches.get(roomid as RoomID);
		const currentFloor = match?.floor ?? 1;

		for (let i = 0; i < (request.active as any[]).length; i++) {
			const active = (request.active as any[])[i];
			const pokemon = request.side?.pokemon?.[i];

			if (!pokemon || pokemon.condition?.endsWith(' fnt') || pokemon.commanding) {
				choicesList.push('pass');
				continue;
			}

			const userSpecies = toID(pokemon.details?.split(',')[0] ?? '');
			const targetSpecies = getOpponentSpecies(room, i);
			const targetAbility = getOpponentAbility(room, i);

			const switchIdx = shouldSwitch(request, i, targetSpecies, targetAbility, room);
			if (switchIdx > 0) {
				choicesList.push(`switch ${switchIdx}`);
				continue;
			}

			const moves: any[] = active?.moves ?? [];
			const usableMoves = moves.filter((m: any) => !m.disabled && (m.pp ?? 1) > 0);

			let chosen = '';
			if (usableMoves.length > 0) {
				const scored = usableMoves.map((m: any) => {
					let score = scoreMove(m, userSpecies, targetSpecies, targetAbility, pokemon, turn);

					// penalize recently used moves
					const lastUsed = getLastUsedTurn(roomid, i, m.id);
					const turnsSince = turn - lastUsed;
					if (turnsSince === 1) score *= 0.55;
					else if (turnsSince === 2) score *= 0.75;
					else if (turnsSince === 3) score *= 0.9;

					return { m, originalIdx: moves.indexOf(m) + 1, score };
				});

				scored.sort((a: any, b: any) => b.score - a.score);

				let pickIdx = 0;
				if (scored.length > 1 && scored[0].score > 0) {
					const ratio = scored[1].score / scored[0].score;
					if (ratio >= 0.85 && Math.random() < 0.1) pickIdx = 1;
				}

				const pick = scored[pickIdx];
				if (pick.score === -Infinity || pick.score <= 0) {
					const fallback = scored.find((s: any) => s.score > -Infinity);
					chosen = fallback ? `move ${fallback.originalIdx}` : 'move 1';
					if (fallback) recordMoveUsed(roomid, i, fallback.m.id, turn);
				} else {
					chosen = `move ${pick.originalIdx}`;
					recordMoveUsed(roomid, i, pick.m.id, turn);
				}
			} else {
				chosen = 'move 1';
			}

			if (active.canMegaEvo) {
				chosen += ' mega';
			} else if (active.canTerastallize && currentFloor > 25) {
				const targetDex = Dex.species.get(targetSpecies);
				const userDex = Dex.species.get(userSpecies);
				let worstIncoming = 1;
				if (targetDex.exists && userDex.exists) {
					for (const atkType of targetDex.types) {
						let eff = 1;
						for (const defType of userDex.types) {
							eff *= Dex.getEffectiveness(atkType, defType);
						}
						if (eff > worstIncoming) worstIncoming = eff;
					}
				}
				const hpRatio = parseHpRatio(pokemon.condition);
				if ((worstIncoming >= 2 || currentFloor > 40) && hpRatio > 0.3 && Math.random() < 0.7) {
					chosen += ' terastallize';
				}
			}

			choicesList.push(chosen);
		}

		return choicesList.join(', ') || 'move 1';
	}

	return 'move 1';
}

interface ActiveRougeMatch {
	userId: ID;
	botUserId: ID;
	floor: number;
	lastPanelTurn?: number;
}

export const activeMatches = new Map<RoomID, ActiveRougeMatch>();

function buildBotTeam(state: PokeRogueState): string {
	const floor = state.floor;
	const isBossFloor = floor % 10 === 0;

	let size = 1;

	if (!isBossFloor) {
		const hasLure = (state.keyItems ?? []).includes('Lure');
		if (hasLure && Math.random() < 0.5) {
			size = 2;
		}
	}

	const luck = state.luck ?? 0;
	const aiTeam = genAIPokemon(size, floor, luck);
	return packAITeam(aiTeam);
}

export function startBattle(user: User, state: PokeRogueState): boolean {
	const livingTeam = state.team.filter(m => (m.currentHp ?? 100) > 0);

	if (!livingTeam.length) {
		user.popup('All your Pokémon have fainted! Use a Revive from the shop before battling.');
		return false;
	}

	const playerTeam = packTeam(livingTeam);
	const botTeam = buildBotTeam(state);
	const isBoss = state.floor % 10 === 0;

	const botUser = createBotUser(user.id);
	const botSlot = 'p2' as const;

	const format = state.floor >= 15 ? '[Gen 9] PokeRogue' : '[Gen 9] PokeRogue Early';

	let battleRoom: AnyObject | null = null;
	try {
		battleRoom = Rooms.createBattle({
			format,
			players: [
				{ user, team: playerTeam },
				{ user: botUser, team: botTeam },
			],
			rated: false,
			title: `PokéRogue Battle - Floor ${state.floor}: ${user.name} vs ${isBoss ? 'BOSS ' : ''}${TRAINER_NAME}`,
		});
	} catch (e) {
		destroyBotUser(botUser);
		user.popup('Failed to start the PokéRogue battle. Please try again.');
		Monitor.crashlog(e as Error, 'PokéRogue battle creation');
		return false;
	}

	if (!battleRoom) {
		destroyBotUser(botUser);
		return false;
	}

	botBattleHandlers.set(botUser.id, (roomid, requestLine) => {
		const room = Rooms.get(roomid as RoomID);
		if (!room?.battle) return;

		const match = activeMatches.get(roomid as RoomID);
		if (match) {
			const activeState = getState(match.userId);
			if (activeState && activeState.floor % 10 !== 0) {
				const turn = room.battle.turn || 0;

				if (turn > 0 && match.lastPanelTurn !== turn) {
					const inv = activeState.inventory || {};
					const pb = inv['pokeball'] || 0;
					const gb = inv['greatball'] || 0;
					const ub = inv['ultraball'] || 0;
					const mb = inv['masterball'] || 0;

					const catchHTML = `<div class="pr-catch-panel" style="padding:8px; background:rgba(0,0,0,0.2); border-radius:6px; text-align:center; margin-top:5px;">` +
						`<div style="font-weight:bold; margin-bottom:6px; color:#ddd;">Wild Encounter!</div>` +
						`<button name="send" value="/pokerogue catch pokeball" class="button" ${pb ? '' : 'disabled'}>Poké Ball (${pb})</button> ` +
						`<button name="send" value="/pokerogue catch greatball" class="button" ${gb ? '' : 'disabled'}>Great Ball (${gb})</button> ` +
						`<button name="send" value="/pokerogue catch ultraball" class="button" ${ub ? '' : 'disabled'}>Ultra Ball (${ub})</button> ` +
						`<button name="send" value="/pokerogue catch masterball" class="button" ${mb ? '' : 'disabled'}>Master Ball (${mb})</button>` +
						`</div>`;

					const playerUser = Users.get(match.userId);
					if (playerUser) {
						if (match.lastPanelTurn) {
							playerUser.sendTo(room, `|uhtmlchange|catchpanel-${match.lastPanelTurn}|`);
						}
						playerUser.sendTo(room, `|uhtml|catchpanel-${turn}|${catchHTML}`);
					}
					match.lastPanelTurn = turn;
				}
			}
		}

		const turn = room.battle.turn || 0;
		const choice = makeAIChoice(requestLine, roomid, turn);
		void room.battle.stream.write(`>${botSlot} ${choice}`);
	});

	state.battleRoomId = battleRoom.roomid;
	setState(user.id, state);

	activeMatches.set(battleRoom.roomid, {
		userId: user.id,
		botUserId: botUser.id,
		floor: state.floor,
	});

	clearMoveHistory(battleRoom.roomid);

	return true;
}
