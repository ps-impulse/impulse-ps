import { getState, setState, deleteState, savedData, saveAllData } from './state';
import { getLevelUpEvo, getExpType, getLevelUpMoves, expForLevel } from './pokemon';
import { type PokeRogueState, type PokemonEntry } from './types';
import { nameColor } from '../customization/custom-colors';

const STARTING_BP = 20;
const LADDER_RESET_CONFIRM_WINDOW = 2 * 60 * 1000;
const pendingLadderResetConfirmations = new Map<ID, number>();

const notifyUser = (userId: string, message: string): void => {
	const targetSocket = Users.get(userId);
	if (targetSocket) {
		targetSocket.popup(`|html|${message}`);
	}
};

function fullHealPP(mon: PokemonEntry): void {
	mon.ppLeft = mon.moves.map(m => {
		const dexMove = Dex.moves.get(m);
		return Math.floor((dexMove.pp ?? 5) * (8 / 5));
	});
}

export const devCommands: Chat.ChatCommands = {
	givebp(target, room, user) {
		this.checkCan("bypassall");
		let [name, amt] = target.split(',').map(s => s?.trim());
		if (!amt && !isNaN(parseInt(name))) { amt = name; name = user.id; }
		const tId = toID(name) || user.id;
		const s = getState(tId);
		if (s) {
			const bpAmount = parseInt(amt || '5');
			if (isNaN(bpAmount) || bpAmount <= 0) {
				return this.errorReply(`Amount must be a positive number.`);
			}
			s.battlePoints = (s.battlePoints ?? 0) + bpAmount;
			setState(tId, s);
			this.sendReply(`Gave ${bpAmount} BP to ${tId}.`);
			const staffName = nameColor(user.name, false, true);
			notifyUser(tId, `You have been given ${bpAmount} BP by ${staffName}.`);
		}
	},

	removebp(target, room, user) {
		this.checkCan("bypassall");
		let [name, amt] = target.split(',').map(s => s?.trim());
		if (!amt && !isNaN(parseInt(name))) { amt = name; name = user.id; }
		const tId = toID(name) || user.id;
		const s = getState(tId);
		if (s) {
			const bpAmount = parseInt(amt || '5');
			if (isNaN(bpAmount) || bpAmount <= 0) {
				return this.errorReply(`Amount must be a positive number.`);
			}
			s.battlePoints = Math.max(0, (s.battlePoints ?? 0) - bpAmount);
			setState(tId, s);
			this.sendReply(`Removed ${bpAmount} BP from ${tId}.`);
			const staffName = nameColor(user.name, false, true);
			notifyUser(tId, `${staffName} has removed ${bpAmount} BP from you.`);
		}
	},

	addmon(target, room, user) {
		this.checkCan("bypassall");
		const [name, mon, lvl] = target.split(',').map(s => s.trim());
		const tId = toID(name) || user.id;
		let s = getState(tId);
		if (!s || s.gameOver) {
			const highestFloor = s?.highestFloor || 0;
			const displayName = s?.displayName || name;
			const recordTeam = s?.recordTeam || [];
			s = {
				floor: 1,
				team: [],
				battlePoints: STARTING_BP,
				timesRerolled: 0,
				rotationalShop: [],
				keyItems: [],
				inventory: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 },
				pendingChoice: [],
				highestFloor,
				displayName,
				recordTeam,
			} as PokeRogueState;
		}
		if (s.pendingChoiceType === 'starter') {
			delete s.pendingChoiceType;
			s.pendingChoice = [];
		}
		if (s.team.length >= 6) return this.errorReply(`${tId}'s team is full.`);
		const species = Dex.species.get(toID(mon));
		if (!species.exists) return this.errorReply("Invalid Pokémon.");
		const level = parseInt(lvl) || 1;
		let finalSpecies = species.id;
		while (true) {
			const evo = getLevelUpEvo(finalSpecies);
			if (!evo || level < evo.evoLevel) break;
			finalSpecies = evo.evoTo;
		}
		const finalExpType = getExpType(finalSpecies);
		const moves = getLevelUpMoves(finalSpecies, level);

		const natures = Dex.natures.all().map(n => n.name);
		const displayNature = natures[Math.floor(Math.random() * natures.length)] ?? 'Hardy';

		s.team.push({
			species: finalSpecies,
			level,
			exp: expForLevel(level, finalExpType),
			expType: finalExpType,
			moves,
			ppLeft: moves.map(m => Math.floor((Dex.moves.get(m).pp ?? 5) * (8 / 5))),
			nature: displayNature,
		} as PokemonEntry);
		setState(tId, s);
		this.sendReply(`Added ${finalSpecies} to ${tId}'s team.`);
		const staffName = nameColor(user.name, false, true);
		const speciesName = Dex.species.get(toID(finalSpecies)).name;
		notifyUser(tId, `${staffName} added <b>${speciesName}</b> to your PokéRogue team.`);
	},

	setfloor(target, room, user) {
		this.checkCan("bypassall");
		let [name, fl] = target.split(',').map(s => s?.trim());
		if (!fl && !isNaN(parseInt(name))) { fl = name; name = user.id; }
		const tId = toID(name) || user.id;
		const s = getState(tId);
		if (s) {
			const floor = parseInt(fl || '1');
			if (isNaN(floor) || floor < 1) {
				return this.errorReply(`Floor must be a positive number.`);
			}
			s.floor = floor;
			setState(tId, s);
			this.sendReply(`Set floor for ${tId} to ${floor}.`);
			const staffName = nameColor(user.name, false, true);
			notifyUser(tId, `Your PokéRogue floor has been set to <b>${floor}</b> by ${staffName}.`);
		}
	},

	healteam(target, room, user) {
		this.checkCan("bypassall");
		const tId = toID(target) || user.id;
		const s = getState(tId);
		if (s) {
			for (const m of s.team) {
				m.currentHp = 100;
				delete m.status;
				fullHealPP(m);
			}
			setState(tId, s);
			this.sendReply(`Healed team for ${tId}.`);
			const staffName = nameColor(user.name, false, true);
			notifyUser(tId, `Your PokéRogue team has been healed by ${staffName}.`);
		}
	},

	removemon(target, room, user) {
		this.checkCan("bypassall");
		const tId = toID(target) || user.id;
		if (getState(tId)) {
			deleteState(tId);
			this.sendReply(`Wiped data for ${tId}.`);
			const staffName = nameColor(user.name, false, true);
			notifyUser(tId, `Your PokéRogue data has been wiped by ${staffName}.`);
		}
	},

	resetladder(target, room, user) {
		this.checkCan("bypassall");
		const trimmedTarget = target.trim();
		if (!trimmedTarget) {
			return this.errorReply(`Usage: /pokerogue resetladder [user|all]`);
		}

		const [scope, ...rest] = trimmedTarget.split(' ').map(t => t.trim()).filter(Boolean);
		const normalizedScope = toID(scope);
		if (normalizedScope === 'all') {
			const token = toID(rest[0] || '');
			const now = Date.now();
			const pendingAt = pendingLadderResetConfirmations.get(user.id);
			if (token !== 'confirm') {
				pendingLadderResetConfirmations.set(user.id, now);
				return this.errorReply(
					`This will reset highestFloor and recordTeam for every PokéRogue user. ` +
					`If you're sure, run /pokerogue resetladder all confirm within 2 minutes.`
				);
			}
			if (!pendingAt || now - pendingAt > LADDER_RESET_CONFIRM_WINDOW) {
				pendingLadderResetConfirmations.delete(user.id);
				return this.errorReply(
					`No pending ladder reset confirmation found. Run /pokerogue resetladder all first.`
				);
			}
			pendingLadderResetConfirmations.delete(user.id);

			const staffName = nameColor(user.name, false, true);
			let affectedUsers = 0;
			for (const userid in savedData) {
				const state = savedData[userid];
				if (!state) continue;
				state.highestFloor = 0;
				state.recordTeam = [];
				notifyUser(userid, `Your PokéRogue ladder data has been reset by ${staffName}.`);
				affectedUsers++;
			}
			saveAllData();
			this.modlog('POKEROGUE RESETLADDER ALL');
			this.privateModAction(
				`${user.name} reset PokéRogue ladder data (highestFloor and recordTeam) for ${affectedUsers} user(s).`
			);
			return this.sendReply(`Reset PokéRogue ladder data for ${affectedUsers} user(s).`);
		}

		const targetId = toID(trimmedTarget);
		if (!targetId) {
			return this.errorReply(`Usage: /pokerogue resetladder [user|all]`);
		}
		const state = getState(targetId);
		if (!state) return this.errorReply(`No ladder data found for ${targetId}.`);
		state.highestFloor = 0;
		state.recordTeam = [];
		setState(targetId, state);
		this.modlog('POKEROGUE RESETLADDER', targetId);
		this.privateModAction(`${user.name} reset PokéRogue ladder data for ${targetId}.`);
		const staffName = nameColor(user.name, false, true);
		notifyUser(targetId, `Your PokéRogue ladder data has been reset by ${staffName}.`);
		return this.sendReply(`Reset PokéRogue ladder data for ${targetId}.`);
	},
};
