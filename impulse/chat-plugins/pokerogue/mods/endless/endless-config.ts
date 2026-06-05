import { type ModeConfig, type ModeData, type PokeRogueState, type TrainerMon } from '../../types';
import { BIOMES as ClassicBiomes, BIOME_TRANSITIONS as ClassicTransitions } from '../classic/biomes';

export const ENDLESS_STARTERS = [
	'bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee',
	'chikorita', 'cyndaquil', 'totodile',
	'treecko', 'torchic', 'mudkip',
	'turtwig', 'chimchar', 'piplup',
	'snivy', 'tepig', 'oshawott',
	'chespin', 'fennekin', 'froakie',
	'rowlet', 'litten', 'popplio',
	'grookey', 'scorbunny', 'sobble',
	'sprigatito', 'fuecoco', 'quaxly',
];

const PARADOX_POOL: string[] = [
	'greatttusk', 'screamtail', 'brutebonnet', 'fluttermane', 'slitherwing',
	'sandyshocks', 'irontreads', 'ironbundle', 'ironhands', 'ironjugulis',
	'ironmoth', 'ironthorns', 'roaringmoon', 'ironvaliant', 'walkingwake',
	'ironleaves', 'gogoat', 'ragingbolt', 'ironboulder', 'ironcrown',
];

function endlessLevelScaling(floor: number): { cap: number, min: number, max: number, bossLevel?: number } {
	const bossInterval = 10;
	const cap = 10000;

	const CLASSIC_BOSS_LEVELS: Record<number, number> = {
		0: 3,
		10: 10, 20: 16, 30: 24, 40: 32,
		50: 38, 60: 48, 70: 56, 80: 64, 90: 74,
		100: 84, 110: 94, 120: 104, 130: 114, 140: 126, 150: 138,
		160: 150, 170: 162, 180: 174, 190: 188, 200: 200,
	};

	function levelAtFloor(f: number): number {
		if (f <= 0) return 3;
		if (f <= 200) {
			const prevBoss = Math.floor(f / bossInterval) * bossInterval;
			const nextBoss = prevBoss + bossInterval;
			const prevLvl = CLASSIC_BOSS_LEVELS[prevBoss] ?? (3 + prevBoss / 2);
			const nextLvl = CLASSIC_BOSS_LEVELS[nextBoss] ?? (3 + nextBoss / 2);
			const progress = (f % bossInterval) / bossInterval;
			return prevLvl + (nextLvl - prevLvl) * progress;
		}
		const excess = f - 200;
		return 200 + excess * 0.5 + Math.pow(excess / 50, 2);
	}

	if (floor % bossInterval === 0) {
		let bossLevel: number;
		if (floor <= 200 && CLASSIC_BOSS_LEVELS[floor] !== undefined) {
			bossLevel = CLASSIC_BOSS_LEVELS[floor];
		} else {
			bossLevel = Math.max(1, Math.round(levelAtFloor(floor) * 1.2));
		}
		return { cap, min: bossLevel, max: bossLevel, bossLevel };
	}

	const base = Math.max(1, Math.round(levelAtFloor(floor)));
	const min = Math.max(1, base - 1);
	const max = base + 1;
	return { cap, min, max };
}

function resolveParadoxBoss(floor: number): TrainerMon[] {
	const idx = Math.floor(Math.random() * PARADOX_POOL.length);
	return [{ species: PARADOX_POOL[idx] }];
}

function resolveEternatusBoss(_floor: number): TrainerMon[] {
	return [{ species: 'eternatus' }];
}

function resolveEternamaxBoss(_floor: number): TrainerMon[] {
	return [{ species: 'eternatuseternamax' }];
}

export const endlessConfig: ModeConfig = {
	progression: true,
	biomeRotationInterval: 3,
	bossInterval: 10,
	startingBiome: 'Town',
	starterLevel: 5,
	maxStarterCost: 15,

	generation: 9,
	baseFormat: '[Gen 9] PokeRogue Endless',
	doublesFormat: '[Gen 9] PokeRogue Endless Doubles',

	hasTrainers: false,
	randomizeMoves: false,
	randomizeAbilities: false,

	economy: {
		startingMoney: 10000,
		startingKeyItems: { 'Exp. All': 2, 'Exp. Charm': 1 },
		startingInventory: { pokeball: 5, greatball: 0, ultraball: 0, masterball: 0 },
		moneyMultiplier: 2.0,
	},

	mechanicUnlocks: {
		terastallize: 40,
	},

	milestoneRewards: [
		{ floor: 50, interval: true, itemType: 'voucher', itemName: 'plus', amount: 1 },
		{ floor: 250, interval: true, itemType: 'voucher', itemName: 'premium', amount: 1 },
		{ floor: 1000, interval: true, itemType: 'voucher', itemName: 'gold', amount: 1 },
	],

	maxFloor: 4000,

	lastBiome: {
		biome: 'End',
		floor: '1991-2000',
	},

	victoryConfig: {
		name: 'Endless Champion',
		dialog: 'You have conquered all 2000 floors of the Endless run! You are a true PokéRogue Endless Legend!',
	},

	levelScalingFn: endlessLevelScaling,
	expMultiplierFn: (floor: number) => {
		// Provide an early-mid game boost (starting at 1.5x) to prevent early softlocks, but plateau quickly
		// so that by wave 1500+, Battle EXP falls off entirely due to cubic EXP requirements.
		// Players will then correctly depend on Rare Candies + Candy Jars to bypass the level cap.
		return 1.5 + Math.pow(Math.min(1, floor / 500), 0.5) * 2.0;
	},
};

export const endlessData: ModeData = {
	biomes: ClassicBiomes,
	transitions: ClassicTransitions,
	trainers: {},
	starters: ENDLESS_STARTERS,
	excludedBiomes: ['End'],
	useNewStarterSelectionUI: true,

	resolveTrainer: (_floor, _state, _config) => null,

	resolveBoss: (floor: number, _currentBiome: string, _config: ModeConfig): TrainerMon[] | null => {
		if (floor === 2000) {
			return resolveEternamaxBoss(floor);
		}

		if (floor % 1000 === 0) {
			return resolveEternamaxBoss(floor);
		}

		if (floor % 250 === 0) {
			return resolveEternatusBoss(floor);
		}

		if (floor % 50 === 0) {
			return resolveParadoxBoss(floor);
		}

		return null;
	},

	resolveBiome: (floor: number, currentBiome: string, config: ModeConfig): string => {
		const excluded = new Set(['End']);
		const options = (ClassicTransitions[currentBiome] ?? []).filter(t => !excluded.has(t.biome));

		if (options.length === 0) {
			const fallback = Object.keys(ClassicBiomes).filter(b => !excluded.has(b) && b !== currentBiome);
			return fallback[Math.floor(Math.random() * fallback.length)] || currentBiome;
		}

		const totalWeight = options.reduce((sum, t) => sum + t.weight, 0);
		let roll = Math.random() * totalWeight;
		for (const t of options) {
			roll -= t.weight;
			if (roll <= 0) return t.biome;
		}
		return options[options.length - 1].biome;
	},
};
