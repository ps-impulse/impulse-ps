import { FS, SQL } from '../../../lib';
import { type PokeRogueState, type UserSaveData, type GlobalStatEntry, type GameMode } from './types';

export const pokerogueDB = new SQL.SQLDatabaseManager('pokerogue', module, {
	file: FS('impulse/db/pokerogue.db').path,
	extension: 'impulse/chat-plugins/pokerogue/database-extension',
});

export const PM = pokerogueDB;
export const destroy = async () => {
	clearInterval(cleanupInterval);
	await saveAllData();
	await PM.destroy();
};

PM.spawn(1);
export const initPromise = pokerogueDB.exec(`
	CREATE TABLE IF NOT EXISTS user_profiles (
		userid TEXT PRIMARY KEY,
		displayName TEXT NOT NULL,
		activeMode TEXT NOT NULL,
		vouchers TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS runs (
		userid TEXT NOT NULL,
		gameMode TEXT NOT NULL,
		state TEXT NOT NULL,
		PRIMARY KEY (userid, gameMode)
	);

	CREATE TABLE IF NOT EXISTS save_slots (
		userid TEXT NOT NULL,
		slot INTEGER NOT NULL,
		state TEXT NOT NULL,
		PRIMARY KEY (userid, slot)
	);

	CREATE TABLE IF NOT EXISTS stats (
		userid TEXT NOT NULL,
		gameMode TEXT NOT NULL,
		highestFloor INTEGER NOT NULL,
		activeFloor INTEGER NOT NULL,
		wins INTEGER NOT NULL,
		recordTeam TEXT NOT NULL,
		PRIMARY KEY (userid, gameMode)
	);

	CREATE TABLE IF NOT EXISTS starters (
		userid TEXT NOT NULL,
		species TEXT NOT NULL,
		unlockedNatures TEXT NOT NULL,
		unlockedAbilities TEXT NOT NULL,
		unlockedTeraTypes TEXT NOT NULL,
		unlockedEggMoves TEXT NOT NULL,
		selectedNature TEXT NOT NULL,
		selectedAbility TEXT NOT NULL,
		selectedTeraType TEXT NOT NULL,
		shiny INTEGER NOT NULL,
		eggTier TEXT NOT NULL,
		PRIMARY KEY (userid, species)
	);

	CREATE TABLE IF NOT EXISTS eggs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		userid TEXT NOT NULL,
		species TEXT NOT NULL,
		wavesRemaining INTEGER NOT NULL,
		bannerType TEXT NOT NULL,
		tier TEXT NOT NULL,
		shiny INTEGER NOT NULL,
		hiddenAbility INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS global_stats (
		id TEXT PRIMARY KEY,
		data TEXT NOT NULL
	);
`);

export let globalStats: Record<string, GlobalStatEntry> = {};
export const userCache: Record<string, UserSaveData> = {};

const userActivity = new Map<string, number>();
const cleanupInterval = setInterval(() => {
	const now = Date.now();
	for (const [userid, lastActive] of userActivity.entries()) {
		if (now - lastActive > 30 * 60 * 1000) {
			if (userCache[userid]) {
				saveUserData(userid);
			}
			delete userCache[userid];
			userActivity.delete(userid);
			lastSavedState.delete(userid);
		}
	}
}, 5 * 60 * 1000);

let globalDataLoaded = false;

export function loadGlobalData() {
	if (globalDataLoaded) return Promise.resolve();
	return (async () => {
		await initPromise;
		const globalRow = await pokerogueDB.get('SELECT data FROM global_stats WHERE id = ?', ['stats']);
		if (globalRow) {
			globalStats = JSON.parse(globalRow.data);
		} else {
			globalStats = {};
		}
		globalDataLoaded = true;
	})();
}

export function loadUser(userid: string): Promise<void> {
	userActivity.set(userid, Date.now());
	if (userCache[userid]) return Promise.resolve();

	return (async () => {
		if (userSaveQueue.has(userid)) {
			await userSaveQueue.get(userid);
			if (userCache[userid]) return;
		}

		await initPromise;

		let userData: UserSaveData | undefined;

		const profileRow = await pokerogueDB.get('SELECT * FROM user_profiles WHERE userid = ?', [userid]);
		if (profileRow) {
			userData = {
				displayName: profileRow.displayName,
				activeMode: profileRow.activeMode,
				vouchers: JSON.parse(profileRow.vouchers || '{}'),
				starters: {}, runs: {}, saveSlots: {}, eggs: [], stats: {},
			};

			const statRows = await pokerogueDB.all('SELECT * FROM stats WHERE userid = ?', [userid]);
			for (const row of statRows) {
				userData.stats![row.gameMode] = {
					highestFloor: row.highestFloor,
					activeFloor: row.activeFloor,
					wins: row.wins,
					recordTeam: JSON.parse(row.recordTeam),
				};
			}

			const runRows = await pokerogueDB.all('SELECT * FROM runs WHERE userid = ?', [userid]);
			for (const row of runRows) {
				userData.runs[row.gameMode] = JSON.parse(row.state);
			}

			const slotRows = await pokerogueDB.all('SELECT * FROM save_slots WHERE userid = ?', [userid]);
			for (const row of slotRows) {
				userData.saveSlots[row.slot] = JSON.parse(row.state);
			}

			const starterRows = await pokerogueDB.all('SELECT * FROM starters WHERE userid = ?', [userid]);
			for (const row of starterRows) {
				userData.starters[row.species] = {
					species: row.species, level: 5, exp: 0, moves: [],
					unlockedNatures: JSON.parse(row.unlockedNatures),
					unlockedAbilities: JSON.parse(row.unlockedAbilities),
					unlockedTeraTypes: JSON.parse(row.unlockedTeraTypes),
					unlockedEggMoves: JSON.parse(row.unlockedEggMoves),
					selectedNature: row.selectedNature,
					selectedAbility: row.selectedAbility,
					selectedTeraType: row.selectedTeraType,
					shiny: !!row.shiny,
					eggTier: row.eggTier,
				};
			}

			const eggRows = await pokerogueDB.all('SELECT * FROM eggs WHERE userid = ?', [userid]);
			for (const row of eggRows) {
				userData.eggs!.push({
					species: row.species,
					wavesRemaining: row.wavesRemaining,
					bannerType: row.bannerType,
					tier: row.tier,
					shiny: !!row.shiny,
					hiddenAbility: !!row.hiddenAbility,
				});
			}
		} else {
			let oldRow;
			try {
				oldRow = await pokerogueDB.get('SELECT data FROM users WHERE userid = ?', [userid]);
			} catch {}

			if (oldRow?.data) {
				userData = JSON.parse(oldRow.data);
			} else {
				userData = {
					displayName: userid, activeMode: 'classic',
					starters: {}, runs: {}, saveSlots: {},
					vouchers: { regular: 0, plus: 0, premium: 0, gold: 0 },
					eggs: [], stats: {},
				};
			}
		}

		Object.assign(userCache, { [userid]: userData! });
	})();
}

export function saveGlobalStats(): Promise<void> | void {
	if (!globalDataLoaded) return;
	return pokerogueDB.run('REPLACE INTO global_stats (id, data) VALUES (?, ?)', ['stats', JSON.stringify(globalStats)]);
}

export function getUserData(userid: string): UserSaveData {
	userActivity.set(userid, Date.now());
	if (!userCache[userid]) {
		throw new Error("Your data is not loaded. Please use a command first.");
	}
	if (userCache[userid]) {
		if (!userCache[userid].vouchers) userCache[userid].vouchers = { regular: 0, plus: 0, premium: 0, gold: 0 };
		if (!userCache[userid].eggs) userCache[userid].eggs = [];
		if (!userCache[userid].stats) userCache[userid].stats = {};
		return userCache[userid];
	}
	return userCache[userid];
}

const userSaveQueue = new Map<string, Promise<void>>();
const lastSavedState = new Map<string, { starters: string, eggs: string, stats: string, saveSlots: string }>();

export function saveUserData(userid: string): void {
	if (!userCache[userid]) return;
	userActivity.set(userid, Date.now());

	const u = userCache[userid];

	const displayName = u.displayName || userid;
	const activeMode = u.activeMode || 'classic';
	const vouchersStr = JSON.stringify(u.vouchers || {});

	const runsStrMap: Record<string, string> = {};
	for (const mode in u.runs) runsStrMap[mode] = JSON.stringify(u.runs[mode]);

	const startersStr = JSON.stringify(u.starters || {});
	const eggsStr = JSON.stringify(u.eggs || []);
	const statsStr = JSON.stringify(u.stats || {});
	const slotsStr = JSON.stringify(u.saveSlots || {});

	const statsMap: Record<string, any> = {};
	if (u.stats) {
		for (const mode in u.stats) statsMap[mode] = { ...u.stats[mode] };
	}

	const startersMap: Record<string, any> = {};
	if (u.starters) {
		for (const species in u.starters) startersMap[species] = { ...u.starters[species] };
	}

	const saveSlotsMap: Record<string, any> = {};
	if (u.saveSlots) {
		for (const slot in u.saveSlots) saveSlotsMap[slot] = u.saveSlots[slot];
	}

	const eggsArray = [...(u.eggs || [])];

	const doSave = async () => {
		await initPromise;
		let lastSaved = lastSavedState.get(userid);
		if (!lastSaved) lastSaved = { starters: '', eggs: '', stats: '', saveSlots: '' };

		await pokerogueDB.run(
			'REPLACE INTO user_profiles (userid, displayName, activeMode, vouchers) VALUES (?, ?, ?, ?)',
			[userid, displayName, activeMode, vouchersStr]
		);

		for (const mode in runsStrMap) {
			await pokerogueDB.run(
				'REPLACE INTO runs (userid, gameMode, state) VALUES (?, ?, ?)',
				[userid, mode, runsStrMap[mode]]
			);
		}

		const activeModes = Object.keys(runsStrMap);
		if (activeModes.length > 0) {
			const placeholders = activeModes.map(() => '?').join(',');
			await pokerogueDB.run(
				`DELETE FROM runs WHERE userid = ? AND gameMode NOT IN (${placeholders})`,
				[userid, ...activeModes]
			);
		} else {
			await pokerogueDB.run('DELETE FROM runs WHERE userid = ?', [userid]);
		}

		if (statsStr !== lastSaved.stats) {
			const stats = [];
			for (const mode in statsMap) {
				const s = statsMap[mode];
				stats.push({ gameMode: mode, highestFloor: s.highestFloor || 0, activeFloor: s.activeFloor || 0, wins: s.wins || 0, recordTeam: JSON.stringify(s.recordTeam || []) });
			}
			await pokerogueDB.transaction('saveStats', { userid, stats });
			lastSaved.stats = statsStr;
		}

		if (startersStr !== lastSaved.starters) {
			for (const species in startersMap) {
				const s = startersMap[species];
				await pokerogueDB.run(
					'REPLACE INTO starters (userid, species, unlockedNatures, unlockedAbilities, unlockedTeraTypes, unlockedEggMoves, selectedNature, selectedAbility, selectedTeraType, shiny, eggTier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
					[
						userid, species,
						JSON.stringify(s.unlockedNatures || []),
						JSON.stringify(s.unlockedAbilities || []),
						JSON.stringify(s.unlockedTeraTypes || []),
						JSON.stringify(s.unlockedEggMoves || []),
						s.selectedNature || 'Hardy',
						s.selectedAbility || '',
						s.selectedTeraType || 'Normal',
						s.shiny ? 1 : 0,
						s.eggTier || 'Common',
					]
				);
			}
			lastSaved.starters = startersStr;
		}

		if (slotsStr !== lastSaved.saveSlots) {
			const slots = [];
			for (const slot in saveSlotsMap) {
				slots.push({ slot: parseInt(slot), state: JSON.stringify(saveSlotsMap[slot]) });
			}
			await pokerogueDB.transaction('saveSlots', { userid, slots });
			lastSaved.saveSlots = slotsStr;
		}

		if (eggsStr !== lastSaved.eggs) {
			const eggs = eggsArray.map(e => ({
				...e,
				bannerType: e.bannerType || 'generic',
				tier: e.tier || 'Common',
				shiny: e.shiny ? 1 : 0,
				hiddenAbility: e.hiddenAbility ? 1 : 0,
			}));
			await pokerogueDB.transaction('saveEggs', { userid, eggs });
			lastSaved.eggs = eggsStr;
		}

		lastSavedState.set(userid, lastSaved);
	};

	const currentPromise = userSaveQueue.get(userid) || Promise.resolve();
	const nextPromise = currentPromise.then(() => doSave()).catch(e => console.error("Pokerogue save error:", e));

	userSaveQueue.set(userid, nextPromise);

	void nextPromise.finally(() => {
		if (userSaveQueue.get(userid) === nextPromise) {
			userSaveQueue.delete(userid);
		}
	});
}

export async function saveAllData(): Promise<void> {
	if (!globalDataLoaded) return;
	const promises: Promise<void>[] = [];
	const gPromise = saveGlobalStats();
	if (gPromise) promises.push(gPromise);

	for (const userid in userCache) {
		saveUserData(userid);
		if (userSaveQueue.has(userid)) {
			promises.push(userSaveQueue.get(userid)!);
		}
	}
	await Promise.all(promises);
}

export function getState(userid: string): PokeRogueState | null {
	const user = getUserData(userid);

	if (user.activeMode && user.runs[user.activeMode]) {
		return user.runs[user.activeMode]!;
	}

	const existingMode = Object.keys(user.runs)[0] as GameMode | undefined;
	if (existingMode) {
		user.activeMode = existingMode;
		return user.runs[existingMode]!;
	}
	return null;
}

export function setState(userid: string, state: PokeRogueState): void {
	const user = getUserData(userid);
	user.activeMode = state.gameMode;
	user.runs[state.gameMode] = state;
	saveUserData(userid);
}

export function deleteState(userid: string): void {
	const user = getUserData(userid);
	if (user.activeMode) {
		delete user.runs[user.activeMode];
		saveUserData(userid);
	}
}

export function setActiveMode(userid: string, mode: GameMode): void {
	const user = getUserData(userid);
	user.activeMode = mode;
	saveUserData(userid);
}

export function recordRunStats(userid: string, mode: GameMode, floor: number, team: import('./types').PokemonEntry[], isWin = false): void {
	const userData = getUserData(userid);
	if (!userData.stats) userData.stats = {};
	if (!userData.stats[mode]) userData.stats[mode] = { highestFloor: 0, activeFloor: 0, wins: 0, recordTeam: [] };

	let updated = false;

	if (floor !== userData.stats[mode].activeFloor) {
		userData.stats[mode].activeFloor = floor;
		updated = true;
	}

	if (floor > userData.stats[mode].highestFloor) {
		userData.stats[mode].highestFloor = floor;
		userData.stats[mode].recordTeam = team.map(m => ({ ...m }));
		updated = true;
	}

	if (isWin) {
		userData.stats[mode].wins++;
		updated = true;
	}

	if (updated) {
		saveUserData(userid);

		if (!globalStats[userid]) {
			globalStats[userid] = { displayName: userData.displayName, stats: {} };
		}
		if (!globalStats[userid].stats) globalStats[userid].stats = {};

		globalStats[userid].stats[mode] = { ...userData.stats[mode] };
		globalStats[userid].displayName = userData.displayName;
		void saveGlobalStats();
	}
}

void loadGlobalData();
