import { FS } from '../../../lib';

const ROGUELIKE_DATA_PATH = 'impulse/chat-plugins/pokerogue';

export type ItemType =
	| 'pokeball' |
	'healHP' |
	'TM' |
	'key' |
	'revive' |
	'cureStatus' |
	'itemPack' |
	'item' |
	'evolveItem';

export interface ShopItem {
	name: string;
	icon: string;
	type: ItemType;
	desc: string;
	cost: number;
	minFloor: number;
}

export const SHOP_ITEMS: Record<string, ShopItem> =
        JSON.parse(FS(`${ROGUELIKE_DATA_PATH}/shopdb.json`).readSync());

export function genItem(quantity: number, extraArg?: PokemonSet[] | string): string[] {
	let all = Dex.items.all().filter(s => (s.isGem || s.itemUser || s.zMove) || !s.isNonstandard);
	all = all.filter(i => {
		if (i.itemUser) {
			if (typeof extraArg === 'string') {
				const dexSpecies = Dex.species.get(extraArg);
				let validSpecies = [dexSpecies.name];
				if (dexSpecies.otherFormes) validSpecies = validSpecies.concat(dexSpecies.otherFormes);
				return i.itemUser.some(v => validSpecies.includes(v));
			} else if (extraArg?.length) {
				return extraArg.some(poke => {
					const dexSpecies = Dex.species.get(poke.species);
					let validSpecies = [dexSpecies.name];
					if (dexSpecies.otherFormes) validSpecies = validSpecies.concat(dexSpecies.otherFormes);
					return i.itemUser?.some(v => validSpecies.includes(v));
				});
			}
		} else {
			if (i.zMove) return true;
			return Object.keys(i).some(k => typeof (i as any)[k] === 'function');
		}
		return false;
	});

	// Fisher-Yates Shuffle
	for (let i = all.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[all[i], all[j]] = [all[j], all[i]];
	}

	const items: string[] = [];
	while (items.length < quantity) {
		const plausibleItem = all.shift();
		if (plausibleItem) {
			items.push(plausibleItem.name);
		} else {
			break;
		}
	}
	return items;
}
