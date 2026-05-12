import { Utils } from '../../../lib';
import { CATCH_RATES } from './pokemon-basic-data';
import { SHOP_ITEMS, genItem } from './items';
import { type PokemonEntry, type PokeRogueState, type StatusCondition } from './types';
import { getState, setState, deleteState, savedData, saveAllData } from './state';
import {
	pickStarterOptions,
	expForLevel,
	applyExpAndLevelUp, getLevelUpEvo,
	getLevelUpMoves, getMovesLearnedBetween,
	calcKillExp, getExpType, getExpYield, botLevel,
	packTeam, TRAINERS,
} from './pokemon';
import { renderGamePage, refreshGamePage } from './render';
import {
	activeMatches,
	startBattle, destroyBotUser,
} from './battle';
import { devCommands } from './dev-tools';

const BP_PER_WIN = 5;
const BP_PER_BOSS = 5;
const STARTING_BP = 20;

const EXP_SHARE_NAME = 'Exp. All';
const LADDER_RESET_CONFIRM_WINDOW = 2 * 60 * 1000;
const pendingLadderResetConfirmations = new Map<ID, number>();

function repairEmptyPendingChoice(state: PokeRogueState, userId: string): void {
	if (!state.pendingChoice || state.pendingChoice.length) return;
	state.pendingChoice = pickStarterOptions();
	setState(userId, state);
}

function isBossFloorBoundary(floor: number): boolean {
	return floor % 10 === 0;
}

function fullHealPP(mon: PokemonEntry): void {
	mon.ppLeft = mon.moves.map(m => {
		const dexMove = Dex.moves.get(m);
		return Math.floor((dexMove.pp ?? 5) * (8 / 5));
	});
}

function processLevelUp(
	mon: PokemonEntry,
	oldLevel: number,
	oldSpecies: string,
	evolved: boolean,
	teamIdx: number,
	state: PokeRogueState,
): string[] {
	const detailMsgs: string[] = [];

	if (evolved) {
		detailMsgs.push(`<b>${oldSpecies}</b> evolved into <b>${mon.species}</b> and reached Lv. ${mon.level}!`);
	} else if (mon.level > oldLevel) {
		detailMsgs.push(`<b>${mon.species}</b> reached Lv. ${mon.level}!`);
	}

	if (!mon.moves) mon.moves = getLevelUpMoves(mon.species, oldLevel);

	const newMoves = getMovesLearnedBetween(oldSpecies, oldLevel, mon.level);
	if (evolved) {
		const evoMoves = getMovesLearnedBetween(mon.species, oldLevel, mon.level, true);
		for (const m of evoMoves) if (!newMoves.includes(m)) newMoves.push(m);
	}

	state.pendingMoves = state.pendingMoves ?? [];

	for (const move of newMoves) {
		if (mon.moves.includes(move)) continue;
		if (state.pendingMoves.some(p => p.pokemonIndex === teamIdx && p.move === move)) continue;

		if (mon.moves.length < 4) {
			mon.moves.push(move);
			detailMsgs.push(`<b>${mon.species}</b> learned <b>${Dex.moves.get(move).name}</b>!`);
		} else {
			state.pendingMoves.push({ pokemonIndex: teamIdx, move, speciesName: mon.species });
		}
	}

	return detailMsgs;
}

const RESIDUAL_FROM_TAGS: Record<string, true> = {
	'Leech Seed': true, 'Salt Cure': true, 'Infestation': true, 'Whirlpool': true,
	'Bind': true, 'Wrap': true, 'Clamp': true, 'Fire Spin': true, 'Sand Tomb': true,
	'Magma Storm': true, 'Snap Trap': true, 'Thunder Cage': true, 'Octolock': true,
	'Curse': true, 'Nightmare': true, 'Bad Dreams': true, 'Perish Song': true,
	'Future Sight': true, 'Doom Desire': true,
};

const SELF_KO_MOVES = new Set([
	'explosion', 'selfdestruct', 'mistyexplosion', 'memento',
	'healingwish', 'lunardance', 'finalgambit',
]);

function parseKillExp(
	logLines: string[],
	state: PokeRogueState,
	floor: number,
	isBossFloor: boolean,
): { expMap: Map<number, number>, baseShareExpMap: Map<number, number> } {
	const expMap = new Map<number, number>();
	const baseShareExpMap = new Map<number, number>();
	const isTrainerFloor = !!TRAINERS[floor.toString()];

	for (const line of logLines) {
		if (!line.includes('PR_EXP|')) continue;

		const parts = line.split('|');
		const dataIndex = parts.indexOf('PR_EXP') + 1;
		const enemySpecies = parts[dataIndex];
		const enemyLevel = parseInt(parts[dataIndex + 1]);
		const participantSpeciesIds = parts[dataIndex + 2] ? parts[dataIndex + 2].split(',') : [];

		const participantIndices = new Set<number>();
		for (const sid of participantSpeciesIds) {
			const idx = state.team.findIndex(m => toID(m.species) === sid && (m.currentHp ?? 100) > 0);
			if (idx !== -1) participantIndices.add(idx);
		}

		if (participantIndices.size === 0 && state.team.length > 0) {
			participantIndices.add(0);
		}

		const validParticipantCount = Math.max(1, participantIndices.size);
		const b = getExpYield(enemySpecies);
		const a = (isBossFloor || isTrainerFloor) ? 1.5 : 1;
		const rawKillExp = Math.floor(Math.floor((b * enemyLevel) / 5 + 1) * a);
		const basePerParticipant = Math.max(1, Math.floor(rawKillExp / validParticipantCount));

		for (const teamIdx of participantIndices) {
			const mon = state.team[teamIdx];
			if (!mon) continue;
			const hasLuckyEgg = mon.heldItem === 'luckyegg';
			const exp = calcKillExp(enemySpecies, enemyLevel, validParticipantCount, isBossFloor, hasLuckyEgg, isTrainerFloor);
			expMap.set(teamIdx, (expMap.get(teamIdx) ?? 0) + exp);
		}

		for (let i = 0; i < state.team.length; i++) {
			if (participantIndices.has(i)) continue;
			if ((state.team[i].currentHp ?? 100) <= 0) continue;
			baseShareExpMap.set(i, (baseShareExpMap.get(i) ?? 0) + basePerParticipant);
		}
	}

	return { expMap, baseShareExpMap };
}

function applyExpShare(
	expMap: Map<number, number>,
	baseShareExpMap: Map<number, number>,
	state: PokeRogueState,
): Map<number, number> {
	const expAllStacks = Math.min(5, (state.keyItems ?? []).filter(k => k === EXP_SHARE_NAME).length);
	const expCharmStacks = (state.keyItems ?? []).filter(k => k === 'Exp. Charm').length;
	const charmMult = expCharmStacks > 0 ? (1 + 0.25 * expCharmStacks) : 1;

	const result = new Map<number, number>();

	for (const [teamIdx, baseExp] of expMap) {
		result.set(teamIdx, Math.max(1, Math.floor(baseExp * charmMult)));
	}

	if (expAllStacks === 0) return result;

	for (const [teamIdx, basePerParticipant] of baseShareExpMap) {
		if (expMap.has(teamIdx)) continue;
		const mon = state.team[teamIdx];
		if (!mon || (mon.currentHp ?? 100) <= 0) continue;

		let benchedExp = Math.floor(basePerParticipant * expAllStacks * 0.2);
		const hasLuckyEgg = mon.heldItem === 'luckyegg';
		if (hasLuckyEgg) benchedExp = Math.floor(benchedExp * 1.4);
		benchedExp = Math.max(1, Math.floor(benchedExp * charmMult));

		result.set(teamIdx, benchedExp);
	}

	return result;
}

function syncBattleOutcome(
	logLines: string[],
	state: PokeRogueState,
): { consumedItems: string[] } {
	const slotToTeamIdx: Record<string, number> = {};
	const activelyAssigned = new Set<number>();
	const teamHp: Record<number, number> = {};
	const teamStatus: Record<number, StatusCondition | ''> = {};
	const faintedIndices = new Set<number>();
	const idxOf = (slot: string): number | undefined => slotToTeamIdx[slot];

	for (const line of logLines) {
		const switchMatch = /^\|(?:switch|drag)\|p1([a-z]): [^|]+\|([^|,]+)[^|]*\|(\d+)(?:\/\d+)?/.exec(line);
		if (switchMatch) {
			const slot = 'p1' + switchMatch[1];
			const sid = toID(switchMatch[2].trim());
			const hp = parseInt(switchMatch[3]);

			const prev = slotToTeamIdx[slot];
			if (prev !== undefined) activelyAssigned.delete(prev);

			let matched = -1;
			for (let i = 0; i < state.team.length; i++) {
				if (!activelyAssigned.has(i) && toID(state.team[i].species) === sid) {
					matched = i;
					break;
				}
			}

			if (matched !== -1) {
				slotToTeamIdx[slot] = matched;
				activelyAssigned.add(matched);
				teamHp[matched] = hp;

				const statusInSwitch = /\|\d+\/\d+ (brn|psn|tox|par|slp|frz)/.exec(line);
				teamStatus[matched] = statusInSwitch ? statusInSwitch[1] as StatusCondition : (teamStatus[matched] ?? '');
			}
			continue;
		}

		const hpMatch = /^\|(?:-damage|-heal)\|p1([a-z]): [^|]+\|(\d+)(?:\/\d+)?( (brn|psn|tox|par|slp|frz))?/.exec(line);
		if (hpMatch) {
			const idx = idxOf('p1' + hpMatch[1]);
			if (idx !== undefined) {
				teamHp[idx] = parseInt(hpMatch[2]);
				if (hpMatch[4]) teamStatus[idx] = hpMatch[4].trim() as StatusCondition;
			}
			continue;
		}

		const statusApply = /^\|-status\|p1([a-z]): [^|]+\|(brn|psn|tox|par|slp|frz)/.exec(line);
		if (statusApply) {
			const idx = idxOf('p1' + statusApply[1]);
			if (idx !== undefined) teamStatus[idx] = statusApply[2] as StatusCondition;
			continue;
		}

		const statusCure = /^\|-curestatus\|p1([a-z]): /.exec(line);
		if (statusCure) {
			const idx = idxOf('p1' + statusCure[1]);
			if (idx !== undefined) teamStatus[idx] = '';
			continue;
		}

		const faintP1 = /^\|faint\|p1([a-z]):/.exec(line);
		if (faintP1) {
			const slot = 'p1' + faintP1[1];
			const idx = idxOf(slot);
			if (idx !== undefined) {
				teamHp[idx] = 0;
				teamStatus[idx] = '';
				faintedIndices.add(idx);
				activelyAssigned.delete(idx);
				delete slotToTeamIdx[slot];
			}
			continue;
		}
	}

	for (const [idxStr, hp] of Object.entries(teamHp)) {
		const idx = Number(idxStr);
		state.team[idx].currentHp = faintedIndices.has(idx) ? 0 : hp;
	}
	for (const idx of faintedIndices) {
		state.team[idx].currentHp = 0;
	}

	for (const [idxStr, status] of Object.entries(teamStatus)) {
		const idx = Number(idxStr);
		if (status) {
			state.team[idx].status = status;
		} else {
			delete state.team[idx].status;
		}
	}

	const consumedItems: string[] = [];
	const itemSlotMap: Record<string, number> = {};
	const itemAssigned = new Set<number>();
	for (const line of logLines) {
		const sw = /^\|(?:switch|drag)\|p1([a-z]): [^|]+\|([^|,]+)/.exec(line);
		if (sw) {
			const slot = 'p1' + sw[1];
			const sid = toID(sw[2].trim());
			const prev = itemSlotMap[slot];
			if (prev !== undefined) itemAssigned.delete(prev);
			for (let i = 0; i < state.team.length; i++) {
				if (!itemAssigned.has(i) && toID(state.team[i].species) === sid) {
					itemSlotMap[slot] = i;
					itemAssigned.add(i);
					break;
				}
			}
			continue;
		}
		const endItemMatch = /^\|-enditem\|p1([a-z]): [^|]+\|([^|]+)/.exec(line);
		if (!endItemMatch) continue;
		if (line.includes('[from] move: Knock Off') || line.includes('[from] move: Thief') || line.includes('[from] move: Incinerate')) continue;
		const slot = 'p1' + endItemMatch[1];
		const itemId = toID(endItemMatch[2].trim());
		const teamIdx = itemSlotMap[slot];
		if (teamIdx !== undefined && state.team[teamIdx].heldItem === itemId) {
			delete state.team[teamIdx].heldItem;
			const dexItem = Dex.items.get(itemId);
			consumedItems.push(dexItem.name || itemId);
		}
	}

	return { consumedItems };
}

export const commands: Chat.ChatCommands = {
	pokerogue: {

		start(target, room, user) {
			if (!user.named) return this.errorReply("Login required.");
			let state = getState(user.id);
			if (state?.battleRoomId) {
				const bRoom = Rooms.get(state.battleRoomId as RoomID);
				if (!bRoom?.battle || bRoom.battle.ended) delete state.battleRoomId;
			}
			if (!state || (!state.team?.length && !state.pendingChoice?.length && !state.battleRoomId && !state.gameOver)) {
				const highestFloor = state?.highestFloor || 0;
				const displayName = state?.displayName || user.name;
				const recordTeam = state?.recordTeam || [];
				state = {
					floor: 1,
					team: [],
					battlePoints: STARTING_BP,
					timesRerolled: 0,
					keyItems: ['Exp. Charm', 'Exp. All', 'Exp. All'],
					inventory: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 },
					pendingChoice: pickStarterOptions(),
					pendingChoiceType: 'starter',
					highestFloor,
					displayName,
					recordTeam,
				} as PokeRogueState;
				setState(user.id, state);
			}
			repairEmptyPendingChoice(state, user.id);
			return this.parse('/join view-pokerogue');
		},

		newgame(target, room, user) {
			const existing = getState(user.id);
			const hasProgress = existing && (existing.team?.length > 0 || (existing.floor ?? 1) > 1);
			if (hasProgress && !existing.gameOver && target !== 'confirm') {
				return this.sendReplyBox(`<b>Warning: Run in progress!</b><br><button name="send" value="/pokerogue newgame confirm" class="button">Yes, start fresh</button>`);
			}
			const highestFloor = existing?.highestFloor || 0;
			const displayName = existing?.displayName || user.name;
			const recordTeam = existing?.recordTeam || [];
			const newState: PokeRogueState = {
				floor: 1,
				team: [],
				battlePoints: STARTING_BP,
				timesRerolled: 0,
				keyItems: ['Exp. Charm', 'Exp. All', 'Exp. All'],
				inventory: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 },
				pendingChoice: pickStarterOptions(),
				pendingChoiceType: 'starter',
				highestFloor,
				displayName,
				recordTeam,
			};
			setState(user.id, newState);
			return this.parse('/pokerogue start');
		},

		view(target, room, user) {
			const state = getState(user.id);
			if (!state) return;
			const v = target.trim() as any;
			if (['main', 'shop', 'top', 'bag', 'guide', 'resetconfirm'].includes(v)) {
				(state as any).view = v;
				setState(user.id, state);
				refreshGamePage(user);
			}
		},

		battle(target, room, user) {
			const state = getState(user.id);
			if (!state || state.gameOver) return this.errorReply("The run is over. Start a new run first.");
			if (state.pendingChoice?.length || state.pendingMoves?.length || state.pendingSwap ||
				state.moveToLearn || state.pendingItemName || state.itemOptions?.length || state.pendingConsumableType) {
				return this.errorReply("Resolve all pending choices before starting a battle.");
			}

			if (!state.team.some(m => (m.currentHp ?? 100) > 0)) {
				return this.errorReply("All your Pokémon have fainted! Buy a Revive from the shop before battling.");
			}

			if (startBattle(user, state)) {
				(state as any).view = 'main';
				setState(user.id, state);
				refreshGamePage(user);
			}
		},

		choose(target, room, user) {
			const state = getState(user.id);
			const n = parseInt(target) - 1;
			if (!state?.pendingChoice || isNaN(n) || n < 0 || n >= state.pendingChoice.length) return;
			const choice = state.pendingChoice[n];

			const isStarterChoice = state.pendingChoiceType === 'starter' || !state.team?.length;

			let addedLevel = 5;
			if (!isStarterChoice) {
				const maxPlayerLevel = state.team.length > 0 ? Math.max(...state.team.map(m => m.level)) : 5;
				if (state.floor <= 30) {
					addedLevel = Math.max(1, maxPlayerLevel - 1);
				} else if (state.floor <= 50) {
					addedLevel = Math.max(1, maxPlayerLevel - 2);
				} else {
					const levelDrop = Math.floor(Math.random() * 2) + 2;
					addedLevel = Math.max(1, maxPlayerLevel - levelDrop);
				}
			}

			let finalSpecies = choice;
			if (!isStarterChoice) {
				while (true) {
					const evo = getLevelUpEvo(finalSpecies);
					if (!evo || addedLevel < evo.evoLevel) break;
					finalSpecies = evo.evoTo;
				}
			}

			const finalExpType = getExpType(finalSpecies);
			const initialMoves = getLevelUpMoves(finalSpecies, addedLevel);

			const natures = Dex.natures.all().map(n => n.name);
			const hash = ((state.floor ?? 1) * 37) + (n * 13) + Dex.species.get(finalSpecies).id.length;
			const displayNature = natures[hash % natures.length] ?? 'Hardy';

			const newMon = {
				species: finalSpecies,
				level: addedLevel,
				exp: expForLevel(addedLevel, finalExpType),
				expType: finalExpType,
				moves: initialMoves,
				ppLeft: initialMoves.map(m => Math.floor((Dex.moves.get(m).pp ?? 5) * (8 / 5))),
				nature: displayNature,
			} as PokemonEntry;

			if (isStarterChoice) {
				state.team = [newMon];
			} else if (state.team.length < 6) {
				state.team.push(newMon);
			} else {
				state.pendingSwap = newMon;
			}

			delete state.pendingChoice;
			delete state.pendingChoiceType;
			delete state.pendingChoiceFloor;
			setState(user.id, state);
			refreshGamePage(user);
		},

		resolve(target, room, user) {
			const state = getState(user.id);
			if (!state) return;

			const spaceIdx = target.indexOf(' ');
			const action = spaceIdx === -1 ? target.trim() : target.slice(0, spaceIdx).trim();
			const rest = spaceIdx === -1 ? '' : target.slice(spaceIdx + 1).trim();

			switch (action) {
			case 'learnmove': {
				if (!state.pendingMoves?.length) return;
				const pending = state.pendingMoves[0];
				const mon = state.team[pending.pokemonIndex];
				if (!mon.moves) mon.moves = getLevelUpMoves(mon.species, mon.level);
				if (rest === 'skip') {
					state.notification = `Your Pokémon gave up on learning <b>${Dex.moves.get(pending.move).name}</b>.`;
				} else {
					const slot = parseInt(rest) - 1;
					if (isNaN(slot) || slot < 0 || slot >= mon.moves.length) return this.errorReply("Invalid move slot.");
					const oldMoveName = Dex.moves.get(mon.moves[slot]).name;
					mon.moves[slot] = pending.move;
					if (mon.ppLeft) mon.ppLeft[slot] = Math.floor((Dex.moves.get(pending.move).pp ?? 5) * (8 / 5));
					state.notification = `Forgot ${oldMoveName} and learned <b>${Dex.moves.get(pending.move).name}</b>!`;
				}
				state.pendingMoves.shift();
				break;
			}

			case 'swapmon': {
				if (!state.pendingSwap) return;
				const newMon = state.pendingSwap;
				const newMonName = Dex.species.get(toID(newMon.species)).name;
				if (rest === 'skip') {
					state.notification = `You released <b>${newMonName}</b> into the wild.`;
				} else {
					const slot = parseInt(rest) - 1;
					if (isNaN(slot) || slot < 0 || slot >= state.team.length) return this.errorReply("Invalid team slot.");
					const oldMonName = Dex.species.get(toID(state.team[slot].species)).name;
					state.team[slot] = newMon;
					if (state.pendingMoves) state.pendingMoves = state.pendingMoves.filter(p => p.pokemonIndex !== slot);
					state.notification = `You replaced ${oldMonName} with <b>${newMonName}</b>!`;
				}
				delete state.pendingSwap;
				break;
			}

			case 'pickitem': {
				if (!state.itemOptions?.length) return;
				if (rest === 'skip') {
					delete state.itemOptions;
					delete state.purchasedItem;
				} else {
					const dexItem = Dex.items.get(rest);
					if (!dexItem.exists) return this.errorReply("Unknown item.");
					state.pendingItemName = dexItem.name;
					delete state.itemOptions;
				}
				break;
			}

			case 'giveitem': {
				if (!state.pendingItemName) return this.errorReply("No item pending.");
				if (rest === 'skip') {
					delete state.pendingItemName;
					delete state.purchasedItem;
					delete state.pendingItemIsEvo;
					delete state.pendingConsumableType;
				} else {
					const slot = parseInt(rest) - 1;
					if (isNaN(slot) || slot < 0 || slot >= state.team.length) return this.errorReply("Invalid team slot.");

					const mon = state.team[slot];
					const dexNewItem = Dex.items.get(state.pendingItemName);
					const dexSpecies = Dex.species.get(toID(mon.species));

					let evoTarget = '';
					if (state.pendingItemIsEvo) {
						const evoList = dexSpecies.evos;
						if (evoList) {
							for (const newEvo of evoList) {
								const evoData = Dex.species.get(newEvo);
								if (evoData.evoType === 'useItem' && toID(evoData.evoItem) === toID(dexNewItem.name)) {
									evoTarget = evoData.id;
									break;
								}
							}
						}
						if (!evoTarget) return this.errorReply("That Pokémon can't evolve with this item.");
					}

					if (state.purchasedItem) {
						const item = SHOP_ITEMS[state.purchasedItem];
						if (item) {
							state.battlePoints -= item.cost;
						}
					}

					if (state.pendingItemIsEvo) {
						mon.species = evoTarget;
						mon.expType = getExpType(evoTarget);
						const evoName = Dex.species.get(evoTarget).name;
						state.notification = `<b>${dexSpecies.name}</b> evolved into <b>${evoName}</b>!`;
					} else {
						if (dexNewItem.forcedForme && dexSpecies.otherFormes?.includes(dexNewItem.forcedForme)) {
							mon.species = toID(dexNewItem.forcedForme);
						} else if (mon.heldItem) {
							const dexOldItem = Dex.items.get(mon.heldItem);
							if (dexOldItem.forcedForme && dexSpecies.otherFormes?.includes(dexOldItem.forcedForme)) {
								mon.species = toID(dexSpecies.changesFrom ?? dexSpecies.baseSpecies);
							}
						}
						mon.heldItem = toID(state.pendingItemName);
						state.notification = `Gave <b>${Utils.escapeHTML(dexNewItem.name)}</b> to <b>${dexSpecies.name}</b>!`;
					}

					delete state.pendingItemName;
					delete state.purchasedItem;
					delete state.pendingItemIsEvo;
				}
				break;
			}

			case 'useshopitem': {
				if (!state.purchasedItem) return this.errorReply("No item selected.");
				if (rest === 'skip') {
					delete state.purchasedItem;
					delete state.pendingConsumableType;
				} else {
					const itemKey = state.purchasedItem;
					const item = SHOP_ITEMS[itemKey];
					if (!item) return this.errorReply("Unknown item.");

					const slot = parseInt(rest) - 1;
					if (isNaN(slot) || slot < 0 || slot >= state.team.length) return this.errorReply("Invalid team slot.");
					const mon = state.team[slot];
					const hp = mon.currentHp ?? 100;

					if (item.type === 'healHP') {
						if (hp >= 100) return this.errorReply("That Pokémon is already at full HP.");
						state.battlePoints -= item.cost;
						let healAmt = 20;
						switch (item.name) {
						case 'Potion': healAmt = 30; break;
						case 'Super Potion': healAmt = 60; break;
						case 'Hyper Potion': healAmt = 120; break;
						case 'Max Potion': healAmt = 100; break;
						}
						mon.currentHp = item.name === 'Max Potion' ? 100 : Math.min(100, hp + healAmt);
						state.notification = `<b>${Dex.species.get(toID(mon.species)).name}</b> restored HP! (${hp}% → ${mon.currentHp}%)`;
					} else if (item.type === 'cureStatus') {
						if (hp <= 0) return this.errorReply("Can't cure a fainted Pokémon.");
						if (!mon.status) return this.errorReply("That Pokémon has no status condition.");
						state.battlePoints -= item.cost;
						const oldStatus = mon.status;
						delete mon.status;
						state.notification = `<b>${Dex.species.get(toID(mon.species)).name}</b>'s ${oldStatus.toUpperCase()} was cured!`;
					} else if (item.type === 'revive') {
						if (hp > 0) return this.errorReply("That Pokémon hasn't fainted.");
						state.battlePoints -= item.cost;
						mon.currentHp = (item.name === 'Max Revive' || mon.species === 'shedinja') ? 100 : 50;
						delete mon.status;
						state.notification = `<b>${Dex.species.get(toID(mon.species)).name}</b> was revived${item.name === 'Max Revive' ? ' to full health' : ''}!`;
					}

					delete state.purchasedItem;
					delete state.pendingConsumableType;
				}
				break;
			}

			default:
				return this.errorReply("Unknown resolve action.");
			}

			setState(user.id, state);
			refreshGamePage(user);
		},

		movemon(target, room, user) {
			const state = getState(user.id);
			if (!state || state.gameOver) return this.errorReply("No active run.");
			if (state.battleRoomId) return this.errorReply("Can't organize your team during a battle.");

			const args = target.split(' ').map(s => s.trim());

			if (args[0] === 'cancel') {
				delete state.pendingMoveSlot;
				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			if (args[0] === 'confirm') {
				if (state.pendingMoveSlot === undefined) return;
				const toSlot = parseInt(args[1]) - 1;
				const fromSlot = state.pendingMoveSlot;

				if (isNaN(toSlot) || toSlot < 0 || toSlot >= state.team.length) return this.errorReply("Invalid slot.");

				const temp = state.team[fromSlot];
				state.team[fromSlot] = state.team[toSlot];
				state.team[toSlot] = temp;

				delete state.pendingMoveSlot;
				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			const fromSlot = parseInt(args[0]) - 1;
			if (isNaN(fromSlot) || fromSlot < 0 || fromSlot >= state.team.length) return this.errorReply("Invalid slot.");

			state.pendingMoveSlot = fromSlot;
			setState(user.id, state);
			refreshGamePage(user);
		},

		releasemon(target, room, user) {
			const state = getState(user.id);
			if (!state || state.gameOver) return this.errorReply("No active run.");
			if (state.battleRoomId) return this.errorReply("Can't release Pokémon during a battle.");

			const args = target.split(' ').map(s => s.trim());

			if (args[0] === 'cancel') {
				delete state.pendingReleaseSlot;
				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			if (args[0] === 'confirm') {
				if (state.pendingReleaseSlot === undefined) return;
				const slot = state.pendingReleaseSlot;

				if (slot < 0 || slot >= state.team.length) return this.errorReply("Invalid slot.");
				if (state.team.length <= 1) return this.errorReply("You cannot release your last Pokémon!");

				const mon = state.team[slot];
				const spName = Dex.species.get(toID(mon.species)).name;

				state.team.splice(slot, 1);

				state.notification = `You released <b>${spName}</b>.`;
				delete state.pendingReleaseSlot;

				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			const slot = parseInt(args[0]) - 1;
			if (isNaN(slot) || slot < 0 || slot >= state.team.length) return this.errorReply("Invalid slot.");
			if (state.team.length <= 1) return this.errorReply("You cannot release your last Pokémon!");

			state.pendingReleaseSlot = slot;
			setState(user.id, state);
			refreshGamePage(user);
		},

		buy(target, room, user) {
			const state = getState(user.id);
			if (!state || state.gameOver) return this.errorReply("No active run.");
			if (state.battleRoomId) return this.errorReply("Can't shop during a battle.");
			if (state.pendingChoice?.length || state.pendingMoves?.length || state.pendingSwap ||
				state.moveToLearn || state.pendingItemName || state.itemOptions?.length || state.pendingConsumableType) {
				return this.errorReply("Resolve pending choices first.");
			}

			const key = toID(target);
			const item = SHOP_ITEMS[key];
			if (!item) return this.errorReply("Unknown item.");

			const bp = state.battlePoints ?? 0;
			if (item.cost > bp) return this.errorReply(`Not enough BP! Need ${item.cost} BP.`);

			if (item.minFloor > (state.floor ?? 1)) return this.errorReply("Your floor isn't high enough for this item.");

			if (item.type === 'key') {
				const ownedCount = (state.keyItems ?? []).filter(k => k === item.name).length;

				if (item.name === EXP_SHARE_NAME && ownedCount >= 5) {
					return this.errorReply(`You have reached the maximum stacks (5) for ${EXP_SHARE_NAME}.`);
				} else if (item.name === 'Exp. Charm' && ownedCount >= 99) {
					return this.errorReply("You have reached the maximum stacks (99) for Exp. Charm.");
				} else if (item.name !== EXP_SHARE_NAME && item.name !== 'Exp. Charm' && ownedCount > 0) {
					return this.errorReply("You already own this key item.");
				}

				state.battlePoints -= item.cost;
				state.keyItems = state.keyItems ?? [];
				state.keyItems.push(item.name);

				const stackMsg = ownedCount > 0 ? ` (Stack ${ownedCount + 1})` : '';
				state.notification = `Bought key item: <b>${item.name}</b>${stackMsg}!`;

				if (item.name === EXP_SHARE_NAME) {
					state.notification += ` All non-participating Pokémon will now receive +20% EXP per stack!`;
				} else if (item.name === 'Exp. Charm') {
					state.notification += ` Total EXP gained increased by 25% per stack!`;
				}

				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			if (item.type === 'pokeball') {
				state.battlePoints -= item.cost;

				state.inventory = state.inventory || {};
				state.inventory[key] = (state.inventory[key] || 0) + 1;
				state.notification = `Bought 1x <b>${item.name}</b>!`;

				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			if (item.type === 'itemPack') {
				const pseudoTeam = state.team.map(m => ({ species: Dex.species.get(toID(m.species)).name } as PokemonSet));
				const options = genItem(3, pseudoTeam);
				state.battlePoints -= item.cost;
				state.itemOptions = options;
				state.purchasedItem = key;
				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			if (item.type === 'item' || item.type === 'evolveItem') {
				state.pendingItemName = item.name;
				state.purchasedItem = key;
				state.pendingItemIsEvo = item.type === 'evolveItem';
				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			if (['healHP', 'revive', 'cureStatus'].includes(item.type)) {
				state.purchasedItem = key;
				state.pendingConsumableType = item.type;
				setState(user.id, state);
				refreshGamePage(user);
				return;
			}

			setState(user.id, state);
			refreshGamePage(user);
		},

		catch(target, room, user) {
			const state = getState(user.id);
			if (!state || state.gameOver) return this.errorReply("No active run.");
			if (!room?.battle) return this.errorReply("You must be in a battle to catch Pokémon.");

			const catchMatch = activeMatches.get(room.roomid);
			if (!catchMatch || catchMatch.userId !== user.id) {
				return this.errorReply("You can only catch Pokémon in your own battle.");
			}

			if (!room.battle.turn) return this.errorReply("The battle hasn't started yet!");
			if (state.caughtPokemon) return this.errorReply("You already caught this Pokémon!");

			const floor = state.floor;
			if (floor % 10 === 0 || TRAINERS[floor.toString()]) {
				return this.errorReply("You cannot catch Trainer or Boss Pokémon!");
			}

			const ballType = toID(target);
			if (!['pokeball', 'greatball', 'ultraball', 'masterball'].includes(ballType)) {
				return this.errorReply("Invalid Poké Ball type.");
			}

			state.inventory = state.inventory || {};
			if ((state.inventory[ballType] || 0) <= 0) return this.errorReply(`You don't have any ${ballType}s left!`);

			const now = Date.now();
			const lastThrow = (state as any).lastThrowTime || 0;
			if (now - lastThrow < 1500) {
				return this.errorReply("Please wait a moment before throwing another Poké Ball.");
			}
			(state as any).lastThrowTime = now;

			const log = room.log?.log || [];
			let p2Species = '';
			let p2Level = botLevel(floor);
			let p2Hp = -1;
			let p2MaxHp = 100;
			let p2Status = '';
			let isFainted = false;

			let p1Fainted = false;
			let p1Found = false;

			for (let i = log.length - 1; i >= 0; i--) {
				const line = log[i];

				if (!p1Found) {
					if (/^\|faint\|p1[a-z]:/.test(line)) {
						p1Fainted = true;
						p1Found = true;
					} else if (/^\|(?:switch|drag)\|p1[a-z]:/.test(line)) {
						p1Fainted = false;
						p1Found = true;
					}
				}

				if (p2Hp === -1 && /^\|faint\|p2[a-z]:/.test(line)) {
					isFainted = true;
				}

				const hpMatch = /^\|(?:-damage|-heal)\|p2[a-z]: [^|]+\|(\d+)(?:\/(\d+))?(?: (brn|psn|tox|par|slp|frz))?/.exec(line);
				if (hpMatch && p2Hp === -1 && !isFainted) {
					p2Hp = parseInt(hpMatch[1]);
					p2MaxHp = hpMatch[2] ? parseInt(hpMatch[2]) : 100;
					if (hpMatch[3]) p2Status = hpMatch[3];
				}

				const statusMatch = /^\|-status\|p2[a-z]: [^|]+\|(brn|psn|tox|par|slp|frz)/.exec(line);
				if (statusMatch && p2Status === '') p2Status = statusMatch[1];

				const cureMatch = /^\|-curestatus\|p2[a-z]:/.exec(line);
				if (cureMatch && p2Status === '') p2Status = 'none';

				const switchMatch = /^\|(?:switch|drag)\|p2[a-z]: [^|]+\|([^|,]+)(?:, L(\d+))?[^|]*\|(\d+)(?:\/(\d+))?(?: (brn|psn|tox|par|slp|frz))?/.exec(line);
				if (switchMatch) {
					p2Species = toID(switchMatch[1]);
					if (switchMatch[2]) p2Level = parseInt(switchMatch[2]);
					if (p2Hp === -1 && !isFainted) {
						p2Hp = parseInt(switchMatch[3]);
						p2MaxHp = switchMatch[4] ? parseInt(switchMatch[4]) : 100;
						if (switchMatch[5] && p2Status === '') p2Status = switchMatch[5];
					}
					break;
				}
			}

			if (p1Fainted) {
				return this.errorReply("You cannot throw a Poké Ball while your Pokémon is fainted! Please send out a new Pokémon first.");
			}

			if (p2Status === 'none') p2Status = '';
			if (p2Hp === -1) p2Hp = 100;

			if (!p2Species || isFainted) return this.errorReply("There is no active Pokémon to catch.");

			state.inventory[ballType]--;
			setState(user.id, state);

			const turn = room.battle.turn || 1;
			const inv = state.inventory;
			const catchHTML = `<div class="pr-catch-panel" style="padding:8px; background:rgba(0,0,0,0.2); border-radius:6px; text-align:center; margin-top:5px;">` +
				`<div style="font-weight:bold; margin-bottom:6px; color:#ddd;">Wild Encounter!</div>` +
				`<button name="send" value="/pokerogue catch pokeball" class="button" ${inv['pokeball'] ? '' : 'disabled'}>Poké Ball (${inv['pokeball'] || 0})</button> ` +
				`<button name="send" value="/pokerogue catch greatball" class="button" ${inv['greatball'] ? '' : 'disabled'}>Great Ball (${inv['greatball'] || 0})</button> ` +
				`<button name="send" value="/pokerogue catch ultraball" class="button" ${inv['ultraball'] ? '' : 'disabled'}>Ultra Ball (${inv['ultraball'] || 0})</button> ` +
				`<button name="send" value="/pokerogue catch masterball" class="button" ${inv['masterball'] ? '' : 'disabled'}>Master Ball (${inv['masterball'] || 0})</button>` +
				`</div>`;

			user.sendTo(room, `|uhtmlchange|catchpanel-${turn}|${catchHTML}`);

			room.add(`|c|~|You threw a ${ballType}!`).update();

			const baseCatchRate = CATCH_RATES[p2Species] || 45;

			let ballBonus = 1;
			if (ballType === 'greatball') ballBonus = 1.5;
			if (ballType === 'ultraball') ballBonus = 2.0;

			let statusBonus = 1;
			if (['slp', 'frz'].includes(p2Status)) statusBonus = 2.5;
			else if (['brn', 'psn', 'tox', 'par'].includes(p2Status)) statusBonus = 1.5;

			const hpPercent = p2Hp / p2MaxHp;
			const modifiedCatchRate = (1 - (2 / 3) * hpPercent) * baseCatchRate * ballBonus * statusBonus;

			const shakeProb = Math.min(65536, Math.floor(65536 * (modifiedCatchRate / 255) ** 0.1875));

			let shakes = 0;
			if (ballType === 'masterball') {
				shakes = 3;
			} else {
				for (let i = 0; i < 3; i++) {
					if (Math.floor(Math.random() * 65536) < shakeProb) {
						shakes++;
					} else {
						break;
					}
				}
			}

			if (shakes === 3) {
				const dexSp = Dex.species.get(p2Species);
				room.add(`|c|~|Gotcha! ${dexSp.name} was caught!`).update();

				const p1Participants = new Set<string>();
				let p2SwitchIdx = 0;

				for (let i = log.length - 1; i >= 0; i--) {
					if (/^\|(?:switch|drag)\|p2[a-z]:/.test(log[i])) {
						p2SwitchIdx = i;
						break;
					}
				}

				for (let i = p2SwitchIdx; i >= 0; i--) {
					const match = /^\|(?:switch|drag)\|p1[a-z]: [^|]+\|([^|,]+)/.exec(log[i]);
					if (match) {
						p1Participants.add(toID(match[1]));
						break;
					}
				}

				for (let i = p2SwitchIdx; i < log.length; i++) {
					const match = /^\|(?:switch|drag)\|p1[a-z]: [^|]+\|([^|,]+)/.exec(log[i]);
					if (match) {
						p1Participants.add(toID(match[1]));
					}
				}

				const participantsStr = Array.from(p1Participants).join(',');
				room.add(`|-message|PR_EXP|${p2Species}|${p2Level}|${participantsStr}`).update();

				const moves = getLevelUpMoves(p2Species, p2Level);
				const hpPct = Math.max(1, Math.round((p2Hp / p2MaxHp) * 100));
				const natures = Dex.natures.all().map(n => n.name);
				const randomNature = natures[Math.floor(Math.random() * natures.length)];

				const caught: any = {
					species: p2Species,
					level: p2Level,
					exp: expForLevel(p2Level, getExpType(p2Species)),
					expType: getExpType(p2Species),
					moves,
					nature: randomNature,
					ppLeft: moves.map(m => Math.floor((Dex.moves.get(m).pp ?? 5) * (8 / 5))),
					currentHp: hpPct,
					evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
					ball: ballType,
				};

				if (p2Status && p2Status !== 'none') {
					caught.status = p2Status;
				}

				state.caughtPokemon = caught;
				setState(user.id, state);

				const match = activeMatches.get(room.roomid);
				if (match) {
					const botUser = Users.get(match.botUserId);
					if (botUser) {
						setTimeout(() => {
							if (room.battle && !room.battle.ended) (room.battle as any).forfeit(botUser);
						}, 300);
					}
				}
			} else {
				let escapeMsg = `|c|~|Oh no! The Pokémon broke free!`;
				if (shakes === 1) escapeMsg = `|c|~|Aww! It appeared to be caught!`;
				if (shakes === 2) escapeMsg = `|c|~|Aargh! Almost had it!`;

				room.add(escapeMsg).update();

				void room.battle.stream.write(`>p1 pass`);
			}
		},

		qaction(target, room, user) {
			const state = getState(user.id);
			if (!state || state.gameOver || state.battleRoomId) return this.errorReply("Cannot use quick actions right now.");

			const [type, slotStr] = target.trim().split(' ');
			const slot = parseInt(slotStr) - 1;
			if (isNaN(slot) || slot < 0 || slot >= state.team.length) return this.errorReply("Invalid team slot.");

			const mon = state.team[slot];
			const hp = mon.currentHp ?? 100;
			const bp = state.battlePoints ?? 0;

			if (type === 'heal') {
				if (hp <= 0 || hp >= 100) return this.errorReply("Pokémon cannot be Q Healed.");

				const hyperItem = Object.values(SHOP_ITEMS).find(i => i.name === 'Hyper Potion');
				const superItem = Object.values(SHOP_ITEMS).find(i => i.name === 'Super Potion');

				let usedItem = null;
				let healAmt = 0;

				if (hp < 40) {
					if (hyperItem && bp >= hyperItem.cost) {
						usedItem = hyperItem;
						healAmt = 120;
					} else if (superItem && bp >= superItem.cost) {
						usedItem = superItem;
						healAmt = 60;
					}
				} else {
					if (superItem && bp >= superItem.cost) {
						usedItem = superItem;
						healAmt = 60;
					}
				}

				if (!usedItem) return this.errorReply("Not enough BP for Q Heal.");

				state.battlePoints -= usedItem.cost;
				mon.currentHp = Math.min(100, hp + healAmt);
				state.notification = `<b>${Dex.species.get(toID(mon.species)).name}</b> was Q-Healed using a ${usedItem.name}! (${hp}% → ${mon.currentHp}%)`;
			} else if (type === 'cure') {
				if (hp <= 0 || !mon.status) return this.errorReply("Pokémon cannot be Q Cured.");

				const cureItem = Object.values(SHOP_ITEMS).find(i => i.type === 'cureStatus');
				if (!cureItem) return this.errorReply("No cure item found in shop.");
				if (bp < cureItem.cost) return this.errorReply("Not enough BP for Q Cure.");

				state.battlePoints -= cureItem.cost;
				const oldStatus = mon.status;
				delete mon.status;
				state.notification = `<b>${Dex.species.get(toID(mon.species)).name}</b>'s ${oldStatus.toUpperCase()} was Q-Cured!`;
			} else {
				return this.errorReply("Unknown quick action type.");
			}

			setState(user.id, state);
			refreshGamePage(user);
		},

		unequip(target, room, user) {
			const state = getState(user.id);
			if (!state) return;
			if (state.battleRoomId) return this.errorReply("Can't manage items during a battle.");
			const slot = parseInt(target.trim()) - 1;
			if (isNaN(slot) || slot < 0 || slot >= state.team.length) return this.errorReply("Invalid team slot.");
			const mon = state.team[slot];
			if (!mon.heldItem) return this.errorReply("That Pokémon isn't holding an item.");
			const dexItem = Dex.items.get(mon.heldItem);
			state.notification = `Took <b>${Utils.escapeHTML(dexItem.name || mon.heldItem)}</b> from ${Dex.species.get(toID(mon.species)).name}. (Item removed — no bag storage.)`;
			delete mon.heldItem;
			setState(user.id, state);
			refreshGamePage(user);
		},

		dismissnotif(target, room, user) {
			const s = getState(user.id);
			if (s?.notification) { delete s.notification; setState(user.id, s); }
			refreshGamePage(user);
		},

		status(target, room, user) {
			if (!this.runBroadcast()) return;
			const tId = toID(target) || user.id;
			const s = getState(tId);
			if (!s) return this.errorReply(`No run found for ${tId}.`);
			const buf = `<b>PokéRogue Status: ${tId}</b><br>Floor ${s.floor} | BP: ${s.battlePoints ?? 0}<br>${s.team.map(m => `Lv.${m.level} ${m.species}`).join(', ')}`;
			this.sendReplyBox(buf);
		},

		quit(target, room, user) {
			const s = getState(user.id);
			if (s?.battleRoomId) {
				const match = activeMatches.get(s.battleRoomId as RoomID);
				if (match) {
					const bot = Users.get(match.botUserId);
					if (bot) destroyBotUser(bot);
					activeMatches.delete(s.battleRoomId as RoomID);
				}
				Rooms.get(s.battleRoomId)?.battle?.forfeit(user);
			}
			if (s) {
				s.gameOver = true;
				s.lastRunFloor = s.floor;
				s.team = [];
				delete s.pendingMoves;
				delete s.pendingSwap;
				delete s.pendingChoice;
				delete s.moveToLearn;
				delete s.pendingItemName;
				delete s.itemOptions;
				delete s.purchasedItem;
				delete s.pendingConsumableType;
				setState(user.id, s);
			}
			refreshGamePage(user);
		},

		...devCommands,

		help(target, room, user) {
			if (!this.runBroadcast()) return;
			const isStaff = user.can('lock');
			let html = `<b>PokéRogue - Player Commands:</b><br>` +
				`<code>/pokerogue start</code> - Open the game page.<br>` +
				`<code>/pokerogue battle</code> - Start floor battle.<br>` +
				`<code>/pokerogue view shop</code> - Item shop.<br>` +
				`<code>/pokerogue status</code> - View run info.<br>` +
				`<code>/pokerogue view top</code> - Leaderboard.<br>` +
				`<code>/pokerogue quit</code> - Abandon run.<br>`;
			if (isStaff) {
				html += `<br><b>Staff Commands (Requires: Admin Only):</b><br>` +
					`<code>/pokerogue givebp [user], [amount]</code> - Gives Battle Points to a user.<br>` +
					`<code>/pokerogue removebp [user], [amount]</code> - Removes Battle Points from a user.<br>` +
					`<code>/pokerogue setfloor [user], [floor]</code> - Sets the floor for a user's run.<br>` +
					`<code>/pokerogue healteam [user]</code> - Fully heals a user's team.<br>` +
					`<code>/pokerogue addmon [user], [pokemon], [level]</code> - Adds a Pokemon to a user's team.<br>` +
					`<code>/pokerogue removemon [user]</code> - Wipes a user's run data.<br>` +
					`<code>/pokerogue resetladder [user]</code> - resets only that user's highestFloor and best team.<br>` +
					`<code>/pokerogue resetladder all</code> - resets ladder fields for all users (confirmation required).`;
			}
			this.sendReplyBox(html);
		},

		'': 'help',
	},
};

export const pages: Chat.PageTable = {
	pokerogue(args, user) {
		if (!user.named) return this.errorReply('Login required.');
		const state = getState(user.id);
		if (!state) return `<div class="pr-popup"><div class="pr-popup-header"><h2>PokéRogue</h2></div><div style="text-align:center;padding:16px"><button name="send" value="/pokerogue start" class="button">Start New Run</button></div></div>`;
		const v = (state as any).view || 'main';
		this.title = `PokéRogue - ${v.toUpperCase()}`;
		return renderGamePage(state, user);
	},
};

export const handlers: Chat.Handlers = {
	onBattleEnd(battle, winner, players) {
		const match = activeMatches.get(battle.roomid);
		if (!match) return;
		activeMatches.delete(battle.roomid);
		const botUser = Users.get(match.botUserId);
		if (botUser) destroyBotUser(botUser);
		const state = getState(match.userId);
		if (!state) return;

		const isBossFloor = match.floor % 10 === 0;
		const room = Rooms.get(battle.roomid);
		const logLines: string[] = room?.log?.log ?? [];

		const { consumedItems } = syncBattleOutcome(logLines, state);
		if (consumedItems.length) {
			state.notification = (state.notification ?? '') +
				`<br><b style="color:#ffb84d">Consumed items:</b> ${consumedItems.join(', ')}`;
		}

		delete state.battleRoomId;

		if (toID(winner) === match.userId) {
			const { expMap: rawExpMap, baseShareExpMap } = parseKillExp(logLines, state, match.floor, isBossFloor);
			const expMap = applyExpShare(rawExpMap, baseShareExpMap, state);

			const totalExpEarned = [...rawExpMap.values()].reduce((sum, v) => sum + v, 0);
			const expShareActive = (state.keyItems ?? []).includes(EXP_SHARE_NAME);
			const detailMsgs: string[] = [];

			if (expMap.size > 0) {
				for (const [teamIdx, expGained] of expMap) {
					const mon = state.team[teamIdx];
					if (!mon || (mon.currentHp ?? 100) === 0) continue;
					const oldSpecies = mon.species;
					const { evolved, oldLevel } = applyExpAndLevelUp(mon, expGained, match.floor);
					detailMsgs.push(...processLevelUp(mon, oldLevel, oldSpecies, evolved, teamIdx, state));
				}

				if (expShareActive && totalExpEarned > 0) {
					const benchedCount = [...expMap.entries()].filter(
						([idx]) => !rawExpMap.has(idx)
					).length;
					if (benchedCount > 0) {
						const sharedAmt = Math.floor((totalExpEarned / Math.max(1, [...rawExpMap.keys()].length)) * (0.20 * Math.min(5, (state.keyItems ?? []).filter(k => k === EXP_SHARE_NAME).length)));
						detailMsgs.push(
							`<span style="color:#8ab4f8">Exp. All: ${benchedCount} benched Pokémon each received <b>${sharedAmt}</b> EXP.</span>`
						);
					}
				}
			}

			const prevFloor = state.floor;
			state.floor++;
			const bpPerWin = prevFloor >= 100 ? 10 : BP_PER_WIN;
			const bpPerBoss = prevFloor >= 100 ? 10 : BP_PER_BOSS;
			let bpGained = bpPerWin;

			if (prevFloor % 50 === 0) {
				state.inventory = state.inventory || {};
				state.inventory.masterball = (state.inventory.masterball || 0) + 1;
				state.notification = (state.notification ?? '') + `<br><b style="color:#aa55ff">Milestone Reward: Received 1x Master Ball for clearing Floor ${prevFloor}!</b>`;
			}

			if (prevFloor === 10) {
				state.keyItems = state.keyItems ?? [];
				state.keyItems.push('Exp. Charm');
				state.notification = (state.notification ?? '') + `<br><b style="color:#f4c842">Milestone Reward: Received 1x Exp. Charm for clearing Floor 10!</b>`;
			}

			if (prevFloor > (state.highestFloor ?? 0)) {
				state.highestFloor = prevFloor;
				state.recordTeam = state.team.map(m => ({ ...m }));
			}

			if (isBossFloorBoundary(prevFloor)) {
				bpGained += bpPerBoss;
				for (const mon of state.team) {
					mon.currentHp = 100;
					delete mon.status;
					fullHealPP(mon);
				}
				state.notification = (state.notification ?? '') + `<br><b style="color:#4caf50">Zone Boss Defeated! Full heal!</b>`;
			}

			if (state.caughtPokemon) {
				const caughtMon = state.caughtPokemon;
				const spName = Dex.species.get(toID(caughtMon.species)).name;
				if (state.team.length < 6) {
					state.team.push(caughtMon);
					detailMsgs.push(`<b style="color:#4caf50">Added ${spName} to your team!</b>`);
				} else {
					state.pendingSwap = caughtMon;
					detailMsgs.push(`<b style="color:#ffb84d">${spName} wants to join, but your team is full!</b>`);
				}
				delete state.caughtPokemon;
			}

			state.battlePoints = (state.battlePoints ?? 0) + bpGained;

			state.displayName = Users.get(match.userId)?.name || match.userId;

			state.notification = (state.notification ?? '') +
				`<br><b>Floor ${prevFloor} Cleared!</b> +${bpGained} BP.<br>` +
				detailMsgs.join('<br>');

			state.timesRerolled = 0;
		} else {
			delete state.pendingMoves;
			delete state.pendingSwap;
			delete state.moveToLearn;
			delete state.pendingItemName;
			delete state.itemOptions;
			delete state.purchasedItem;
			delete state.caughtPokemon;

			if ((state.keyItems ?? []).includes('Revive')) {
				state.keyItems = state.keyItems.filter(k => k !== 'Revive');
				state.notification = (state.notification ?? '') +
					'<br><b>Revive used!</b> Retrying Floor ' + String(match.floor);
			} else {
				if (match.floor > (state.highestFloor ?? 0)) {
					state.highestFloor = match.floor;
					state.recordTeam = state.team.map(m => ({ ...m }));
				}
				state.gameOver = true;
				state.lastRunFloor = match.floor;
				state.team = [];
			}
		}

		setState(match.userId, state);
		const hUser = Users.get(match.userId);
		if (hUser) refreshGamePage(hUser);
	},
};
