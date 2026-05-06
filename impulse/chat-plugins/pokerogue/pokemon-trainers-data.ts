export interface TrainerMon {
	species: string;
	moves?: string[];
	ivs?: { hp: number, atk: number, def: number, spa: number, spd: number, spe: number };
	evs?: { hp: number, atk: number, def: number, spa: number, spd: number, spe: number };
	ability?: string;
	teraType?: string;
	item?: string;
}

export interface TrainerData {
	teamSize: number;
	pool?: (string | TrainerMon)[];
	random?: boolean;
}

export const TRAINERS: Record<string, Record<string, TrainerData>> = {
	// wave 165: evil team boss 2
	'165': {
		'Giovanni (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'persian', ability: 'technician' },
				{ species: 'nidoqueen', teraType: 'Ground' },
				{ species: 'nidoking', teraType: 'Ground' },
				{ species: 'dugtrio' },
				{ species: 'marowak', teraType: 'Ground' },
				{ species: 'rhyperior', teraType: 'Ground', item: 'groundgem' },
			],
		},
		'Maxie (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'mightyena' },
				{ species: 'crobat' },
				{ species: 'rhydon', teraType: 'Ground' },
				{ species: 'weezing', teraType: 'Fire' },
				{ species: 'camerupt', teraType: 'Fire', item: 'cameruptite' },
				{ species: 'solrock' },
			],
		},
		'Archie (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'mightyena' },
				{ species: 'crobat' },
				{ species: 'tentacruel', teraType: 'Water' },
				{ species: 'walrein' },
				{ species: 'sharpedo', teraType: 'Water', item: 'sharpedonite' },
				{ species: 'crawdaunt' },
			],
		},
		'Cyrus (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'honchkrow', teraType: 'Dark' },
				{ species: 'gyarados', teraType: 'Dark' },
				{ species: 'crobat' },
				{ species: 'weavile' },
				{ species: 'electivire', item: 'lifeorb' },
				{ species: 'magmortar', item: 'lifeorb' },
			],
		},
		'Ghetsis (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'cofagrigus' },
				{ species: 'bouffalant', teraType: 'Normal' },
				{ species: 'seismitoad', teraType: 'Poison' },
				{ species: 'bisharp' },
				{ species: 'eelektross', item: 'lifeorb' },
				{ species: 'hydreigon', teraType: 'Dragon', item: 'choicespecs' },
			],
		},
		'Lysandre (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'mienshao' },
				{ species: 'gyarados', teraType: 'Fire' },
				{ species: 'honchkrow', teraType: 'Dark' },
				{ species: 'dragalge', teraType: 'Dragon' },
				{ species: 'pyroar', teraType: 'Fire' },
				{ species: 'clawitzer' },
			],
		},
		'Lusamine (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'clefable', teraType: 'Fairy' },
				{ species: 'milotic', teraType: 'Water' },
				{ species: 'bewear' },
				{ species: 'salazzle', teraType: 'Poison' },
				{ species: 'lilligant' },
				{ species: 'mismagius' },
			],
		},
		'Guzma (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'golisopod', teraType: 'Bug' },
				{ species: 'vikavolt' },
				{ species: 'pinsir', item: 'pinsirite' },
				{ species: 'scizor', item: 'scizorite' },
				{ species: 'masquerain' },
				{ species: 'heracross', item: 'heracronite' },
			],
		},
		'Rose (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'escavalier', teraType: 'Steel' },
				{ species: 'ferrothorn', teraType: 'Steel' },
				{ species: 'klinklang' },
				{ species: 'excadrill', teraType: 'Steel' },
				{ species: 'copperajah', teraType: 'Steel' },
				{ species: 'toedscruel', teraType: 'Poison' },
			],
		},
		'Penny (Final)': {
			teamSize: 6,
			pool: [
				{ species: 'annihilape', teraType: 'Fighting' },
				{ species: 'revavroom', teraType: 'Steel' },
				{ species: 'gengar', teraType: 'Ghost' },
				{ species: 'vaporeon', teraType: 'Water' },
				{ species: 'ceruledge', teraType: 'Fire' },
				{ species: 'cyclizar', teraType: 'Electric' },
			],
		},
	},

	// wave 170: sinnoh gym leaders (gardenia / candice)
	'170': {
		'Gym Leader Gardenia': {
			teamSize: 6,
			pool: ['budew', 'roselia', 'roserade', 'cherubi', 'cherrim', 'turtwig', 'grotle', 'torterra', 'leafeon', 'breloom', 'vileplume', 'tropius', 'tangrowth', 'ludicolo'],
		},
		'Gym Leader Candice': {
			teamSize: 6,
			pool: ['froslass', 'snorunt', 'snover', 'abomasnow', 'sneasel', 'weavile', 'glaceon', 'piloswine', 'mamoswine', 'jynx', 'smoochum', 'cloyster', 'lapras', 'dewgong'],
		},
	},

	// wave 180: gym leader (final pre-e4)
	'180': {
		'Gym Leader Piers': {
			teamSize: 6,
			pool: ['zigzagoongalar', 'obstagoon', 'scraggy', 'scrafty', 'toxel', 'toxtricity', 'inkay', 'malamar', 'skuntank', 'liepard', 'morpeko', 'pangoro', 'shiftry', 'absol'],
		},
		'Gym Leader Marnie': {
			teamSize: 6,
			pool: ['impidimp', 'morgrem', 'grimmsnarl', 'morpeko', 'purrloin', 'liepard', 'croagunk', 'toxicroak', 'scrafty', 'obstagoon', 'weavile', 'umbreon', 'bisharp', 'sandaconda'],
		},
	},

	// wave 182: elite four 1
	'182': {
		'Elite Four Lorelei': {
			teamSize: 5,
			pool: ['dewgong', 'slowbro', 'jynx', 'lapras', 'cloyster'],
		},
		'Elite Four Will': {
			teamSize: 5,
			pool: ['exeggutor', 'slowking', 'mrrime', 'wyrdeer', 'xatu'],
		},
		'Elite Four Sidney': {
			teamSize: 5,
			pool: ['mightyena', 'obstagoon', 'shiftry', 'sharpedo', 'absol'],
		},
		'Elite Four Aaron': {
			teamSize: 5,
			pool: ['yanmega', 'heracross', 'pinsir', 'scizor', 'vespiquen'],
		},
		'Elite Four Shauntal': {
			teamSize: 5,
			pool: ['cofagrigus', 'golurk', 'drifblim', 'chandelure', 'jellicent'],
		},
		'Elite Four Malva': {
			teamSize: 5,
			pool: ['pyroar', 'talonflame', 'torkoal', 'chandelure', 'houndoom'],
		},
		'Elite Four Hala': {
			teamSize: 5,
			pool: ['hariyama', 'poliwrath', 'bewear', 'crabominable', 'primeape'],
		},
		'Elite Four Rika': {
			teamSize: 5,
			pool: ['whiscash', 'donphan', 'dugtrio', 'camerupt', 'garchomp'],
		},
	},

	// wave 184: elite four 2
	'184': {
		'Elite Four Bruno': {
			teamSize: 5,
			pool: ['hitmonlee', 'hitmonchan', 'hitmontop', 'steelix', 'machamp'],
		},
		'Elite Four Koga': {
			teamSize: 5,
			pool: ['venomoth', 'muk', 'tentacruel', 'sneasler', 'crobat'],
		},
		'Elite Four Phoebe': {
			teamSize: 5,
			pool: ['sableye', 'banette', 'drifblim', 'dusknoir', 'mismagius'],
		},
		'Elite Four Bertha': {
			teamSize: 5,
			pool: ['whiscash', 'gliscor', 'golem', 'hippowdon', 'rhyperior'],
		},
		'Elite Four Marshal': {
			teamSize: 5,
			pool: ['conkeldurr', 'sawk', 'throh', 'mienshao', 'breloom'],
		},
		'Elite Four Siebold': {
			teamSize: 5,
			pool: ['clawitzer', 'gyarados', 'starmie', 'barbaracle', 'blastoise'],
		},
		'Elite Four Olivia': {
			teamSize: 5,
			pool: ['lycanroc', 'probopass', 'carbink', 'golem', 'gigalith'],
		},
		'Elite Four Poppy': {
			teamSize: 5,
			pool: ['tinkaton', 'corviknight', 'bronzong', 'copperajah', 'magearna'],
		},
	},

	// wave 186: elite four 3
	'186': {
		'Elite Four Agatha': {
			teamSize: 5,
			pool: ['mismagius', 'arbok', 'marowakalola', 'cursola', 'gengar'],
		},
		'Elite Four Karen': {
			teamSize: 5,
			pool: ['umbreon', 'gengar', 'honchkrow', 'weavile', 'houndoom'],
		},
		'Elite Four Glacia': {
			teamSize: 5,
			pool: ['abomasnow', 'glalie', 'froslass', 'ninetalesalola', 'walrein'],
		},
		'Elite Four Flint': {
			teamSize: 5,
			pool: ['houndoom', 'magmortar', 'rapidash', 'infernape', 'flareon'],
		},
		'Elite Four Grimsley': {
			teamSize: 5,
			pool: ['scrafty', 'bisharp', 'krookodile', 'liepard', 'sharpedo'],
		},
		'Elite Four Wikstrom': {
			teamSize: 5,
			pool: ['skarmory', 'probopass', 'klefki', 'aegislash', 'scizor'],
		},
		'Elite Four Acerola': {
			teamSize: 5,
			pool: ['palossand', 'drifblim', 'mimikyu', 'froslass', 'sableye'],
		},
		'Elite Four Larry': {
			teamSize: 5,
			pool: ['staraptor', 'flamigo', 'altaria', 'tropius', 'dodrio'],
		},
	},

	// wave 188: elite four 4
	'188': {
		'Elite Four Lance': {
			teamSize: 5,
			pool: ['kingdra', 'gyarados', 'exeggutoralola', 'salamence', 'dragonite'],
		},
		'Elite Four Drake': {
			teamSize: 5,
			pool: ['shelgon', 'altaria', 'flygon', 'salamence', 'kingdra'],
		},
		'Elite Four Lucian': {
			teamSize: 5,
			pool: ['alakazam', 'espeon', 'gallade', 'bronzong', 'mrmime'],
		},
		'Elite Four Iris': {
			teamSize: 5,
			pool: ['druddigon', 'aggron', 'lapras', 'archeops', 'haxorus'],
		},
		'Elite Four Drasna': {
			teamSize: 5,
			pool: ['dragalge', 'druddigon', 'altaria', 'noivern', 'dragapult'],
		},
		'Elite Four Kahili': {
			teamSize: 5,
			pool: ['crobat', 'skarmory', 'toucannon', 'mandibuzz', 'oricorio'],
		},
		'Elite Four Hassel': {
			teamSize: 5,
			pool: ['noivern', 'flapple', 'appletun', 'dragapult', 'baxcalibur'],
		},
		'Elite Four Marnie': {
			teamSize: 5,
			pool: ['morpeko', 'grimmsnarl', 'liepard', 'toxicroak', 'scrafty'],
		},
	},

	// wave 190: champion
	'190': {
		'Champion Blue': {
			teamSize: 6,
			pool: [
				{ species: 'pidgeot' },
				{ species: 'alakazam' },
				{ species: 'rhydon' },
				{ species: 'gyarados' },
				{ species: 'exeggutor' },
				{ species: 'charizard', teraType: 'Dragon' },
			],
		},
		'Champion Lance': {
			teamSize: 6,
			pool: [
				{ species: 'gyarados' },
				{ species: 'aerodactyl' },
				{ species: 'exeggutoralola', teraType: 'Dragon' },
				{ species: 'salamence' },
				{ species: 'dragonite' },
				{ species: 'kingdra', teraType: 'Dragon' },
			],
		},
		'Champion Steven': {
			teamSize: 6,
			pool: [
				{ species: 'skarmory' },
				{ species: 'claydol' },
				{ species: 'cradily' },
				{ species: 'armaldo' },
				{ species: 'aggron' },
				{ species: 'metagross', teraType: 'Steel', item: 'metagrossite' },
			],
		},
		'Champion Wallace': {
			teamSize: 6,
			pool: [
				{ species: 'wailord' },
				{ species: 'tentacruel' },
				{ species: 'ludicolo', teraType: 'Water' },
				{ species: 'whiscash' },
				{ species: 'gyarados' },
				{ species: 'milotic', teraType: 'Water', item: 'lifeorb' },
			],
		},
		'Champion Cynthia': {
			teamSize: 6,
			pool: [
				{ species: 'spiritomb' },
				{ species: 'roserade' },
				{ species: 'gastrodon' },
				{ species: 'lucario', teraType: 'Fighting' },
				{ species: 'milotic' },
				{ species: 'garchomp', teraType: 'Dragon', item: 'garchompite' },
			],
		},
		'Champion Alder': {
			teamSize: 6,
			pool: [
				{ species: 'accelgor' },
				{ species: 'bouffalant', teraType: 'Normal' },
				{ species: 'druddigon' },
				{ species: 'escavalier' },
				{ species: 'vanilluxe' },
				{ species: 'volcarona', teraType: 'Fire' },
			],
		},
		'Champion Iris': {
			teamSize: 6,
			pool: [
				{ species: 'fraxure' },
				{ species: 'druddigon' },
				{ species: 'lapras', teraType: 'Ice' },
				{ species: 'archeops' },
				{ species: 'beartic' },
				{ species: 'haxorus', teraType: 'Dragon', item: 'lifeorb' },
			],
		},
		'Champion Diantha': {
			teamSize: 6,
			pool: [
				{ species: 'hawlucha' },
				{ species: 'trevenant' },
				{ species: 'aurorus' },
				{ species: 'gourgeist' },
				{ species: 'goodra', teraType: 'Dragon' },
				{ species: 'gardevoir', teraType: 'Fairy', item: 'gardevoirite' },
			],
		},
		'Champion Leon': {
			teamSize: 6,
			pool: [
				{ species: 'aegislash', teraType: 'Steel' },
				{ species: 'haxorus', teraType: 'Dragon' },
				{ species: 'seismitoad' },
				{ species: 'rhyperior' },
				{ species: 'dragapult', teraType: 'Dragon' },
				{ species: 'charizard', teraType: 'Fire', item: 'charizarditex' },
			],
		},
		'Champion Geeta': {
			teamSize: 6,
			pool: [
				{ species: 'espathra', teraType: 'Psychic' },
				{ species: 'gogoat' },
				{ species: 'avalugg' },
				{ species: 'veluza' },
				{ species: 'kingambit', teraType: 'Dark' },
				{ species: 'glimmora', teraType: 'Rock', item: 'lifeorb' },
			],
		},
	},

	// wave 195: rival fight 6 (final)
	'195': {
		'Rival (Final)': {
			teamSize: 6,
			pool: [
				'venusaur', 'charizard', 'blastoise',
				'meganium', 'typhlosion', 'feraligatr',
				'sceptile', 'blaziken', 'swampert',
				'torterra', 'infernape', 'empoleon',
				'serperior', 'emboar', 'samurott',
				'chesnaught', 'delphox', 'greninja',
				'decidueye', 'incineroar', 'primarina',
				'rillaboom', 'cinderace', 'inteleon',
				'meowscarada', 'skeledirge', 'quaquaval',
				'pidgeot', 'noctowl', 'swellow',
				'staraptor', 'unfezant', 'talonflame',
				'toucannon', 'corviknight', 'kilowattrel',
				'nidoqueen', 'nidoking', 'annihilape', 'arcanine',
				'alakazam', 'machamp', 'gengar', 'magnezone',
				'rhyperior', 'tangrowth', 'electivire', 'magmortar',
				'azumarill', 'ursaluna', 'mamoswine', 'gigalith',
				'conkeldurr', 'seismitoad', 'krookodile', 'reuniclus',
				'eelektross', 'chandelure', 'hatterene', 'grimmsnarl',
				'garganacl', 'tinkaton', 'glimmora', 'arboliva',
			],
		},
	},

	// wave 205: post-game elite four rematch 1
	'205': {
		'Elite Four Lorelei': {
			teamSize: 6,
			pool: [
				{ species: 'jynx', teraType: 'Ice' },
				{ species: 'cloyster', teraType: 'Ice' },
				{ species: 'slowbro', teraType: 'Psychic' },
				{ species: 'lapras', teraType: 'Ice', item: 'lifeorb' },
				{ species: 'dewgong' },
				{ species: 'clodsire' },
			],
		},
		'Elite Four Will': {
			teamSize: 6,
			pool: [
				{ species: 'xatu', teraType: 'Psychic' },
				{ species: 'jynx', teraType: 'Ice' },
				{ species: 'slowbro', teraType: 'Psychic', item: 'lifeorb' },
				{ species: 'exeggutor', teraType: 'Grass' },
				{ species: 'gardevoir', teraType: 'Fairy' },
				{ species: 'mrrime' },
			],
		},
		'Elite Four Sidney': {
			teamSize: 6,
			pool: [
				{ species: 'absol', teraType: 'Dark', item: 'lifeorb' },
				{ species: 'mightyena' },
				{ species: 'sharpedo', teraType: 'Dark', item: 'sharpedonite' },
				{ species: 'shiftry', teraType: 'Dark' },
				{ species: 'obstagoon', teraType: 'Dark' },
				{ species: 'crawdaunt' },
			],
		},
		'Elite Four Aaron': {
			teamSize: 6,
			pool: [
				{ species: 'vespiquen', teraType: 'Bug' },
				{ species: 'heracross', teraType: 'Bug', item: 'heracronite' },
				{ species: 'pinsir', teraType: 'Bug', item: 'pinsirite' },
				{ species: 'yanmega' },
				{ species: 'scizor', teraType: 'Steel' },
				{ species: 'vikavolt', teraType: 'Electric' },
			],
		},
		'Elite Four Shauntal': {
			teamSize: 6,
			pool: [
				{ species: 'chandelure', teraType: 'Fire', item: 'choicespecs' },
				{ species: 'cofagrigus', teraType: 'Ghost' },
				{ species: 'drifblim', teraType: 'Ghost' },
				{ species: 'golurk', teraType: 'Ghost' },
				{ species: 'jellicent', teraType: 'Water' },
				{ species: 'dragapult', teraType: 'Dragon' },
			],
		},
		'Elite Four Malva': {
			teamSize: 6,
			pool: [
				{ species: 'pyroar', teraType: 'Fire' },
				{ species: 'talonflame', teraType: 'Fire' },
				{ species: 'chandelure', teraType: 'Fire', item: 'lifeorb' },
				{ species: 'houndoom', teraType: 'Dark', item: 'houndoominite' },
				{ species: 'torkoal' },
				{ species: 'arcanine', teraType: 'Fire' },
			],
		},
		'Elite Four Hala': {
			teamSize: 6,
			pool: [
				{ species: 'hariyama', teraType: 'Fighting' },
				{ species: 'conkeldurr', teraType: 'Fighting' },
				{ species: 'bewear', teraType: 'Normal' },
				{ species: 'annihilape', teraType: 'Ghost' },
				{ species: 'crabominable', teraType: 'Ice' },
				{ species: 'medicham', teraType: 'Fighting', item: 'medichamite' },
			],
		},
		'Elite Four Rika': {
			teamSize: 6,
			pool: [
				{ species: 'garchomp', teraType: 'Ground', item: 'garchompite' },
				{ species: 'camerupt', teraType: 'Fire' },
				{ species: 'donphan', teraType: 'Ground' },
				{ species: 'dugtrio', teraType: 'Ground' },
				{ species: 'whiscash', teraType: 'Water' },
				{ species: 'hippowdon', teraType: 'Ground' },
			],
		},
	},

	// wave 210: post-game gym leader rematch circuit 1
	'210': {
		'Gym Leader Brock (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'golem', teraType: 'Rock' },
				{ species: 'omastar', teraType: 'Rock' },
				{ species: 'aerodactyl', teraType: 'Rock', item: 'aerodactylite' },
				{ species: 'rhyperior', teraType: 'Ground' },
				{ species: 'steelix', teraType: 'Steel', item: 'steelixite' },
				{ species: 'tyranitar', teraType: 'Rock', item: 'tyranitarite' },
			],
		},
		'Gym Leader Misty (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'starmie', teraType: 'Psychic' },
				{ species: 'azumarill', teraType: 'Fairy' },
				{ species: 'lapras', teraType: 'Ice' },
				{ species: 'politoed', teraType: 'Water', ability: 'drizzle' },
				{ species: 'milotic', teraType: 'Water', item: 'lifeorb' },
				{ species: 'vaporeon', teraType: 'Water' },
			],
		},
		'Gym Leader Surge (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'raichu', teraType: 'Electric' },
				{ species: 'electrode', teraType: 'Electric' },
				{ species: 'electivire', teraType: 'Electric', item: 'lifeorb' },
				{ species: 'jolteon', teraType: 'Electric' },
				{ species: 'magnezone', teraType: 'Steel' },
				{ species: 'xurkitree', teraType: 'Electric' },
			],
		},
		'Gym Leader Erika (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'vileplume', teraType: 'Grass' },
				{ species: 'bellossom', teraType: 'Grass' },
				{ species: 'jumpluff', teraType: 'Grass' },
				{ species: 'tangrowth', teraType: 'Grass', item: 'lifeorb' },
				{ species: 'tsareena', teraType: 'Grass' },
				{ species: 'lurantis', teraType: 'Grass' },
			],
		},
	},

	// wave 215: post-game champion rematch 1
	'215': {
		'Champion Blue (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'pidgeot', teraType: 'Normal' },
				{ species: 'alakazam', teraType: 'Psychic', item: 'alakazite' },
				{ species: 'gyarados', teraType: 'Water' },
				{ species: 'exeggutor', teraType: 'Grass' },
				{ species: 'arcanine', teraType: 'Fire' },
				{ species: 'charizard', teraType: 'Dragon', item: 'charizarditey' },
			],
		},
		'Champion Lance (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'dragonite', teraType: 'Dragon', item: 'lifeorb' },
				{ species: 'kingdra', teraType: 'Dragon' },
				{ species: 'gyarados', teraType: 'Flying' },
				{ species: 'salamence', teraType: 'Dragon' },
				{ species: 'aerodactyl', teraType: 'Rock', item: 'aerodactylite' },
				{ species: 'dragonite', teraType: 'Ice' },
			],
		},
		'Champion Steven (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'skarmory', teraType: 'Steel' },
				{ species: 'metagross', teraType: 'Psychic', item: 'metagrossite' },
				{ species: 'aggron', teraType: 'Steel', item: 'aggronite' },
				{ species: 'armaldo', teraType: 'Rock' },
				{ species: 'claydol', teraType: 'Ground' },
				{ species: 'steelix', teraType: 'Steel', item: 'steelixite' },
			],
		},
		'Champion Wallace (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'milotic', teraType: 'Water', item: 'lifeorb' },
				{ species: 'gyarados', teraType: 'Flying' },
				{ species: 'tentacruel', teraType: 'Poison' },
				{ species: 'whiscash', teraType: 'Ground' },
				{ species: 'ludicolo', teraType: 'Water' },
				{ species: 'kingdra', teraType: 'Dragon' },
			],
		},
		'Champion Cynthia (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'garchomp', teraType: 'Dragon', item: 'garchompite' },
				{ species: 'spiritomb', teraType: 'Dark' },
				{ species: 'lucario', teraType: 'Fighting', item: 'lucarionite' },
				{ species: 'milotic', teraType: 'Water' },
				{ species: 'roserade', teraType: 'Grass' },
				{ species: 'togekiss', teraType: 'Fairy', item: 'lifeorb' },
			],
		},
		'Champion Alder (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'volcarona', teraType: 'Fire', item: 'lifeorb' },
				{ species: 'bouffalant', teraType: 'Normal' },
				{ species: 'escavalier', teraType: 'Steel' },
				{ species: 'conkeldurr', teraType: 'Fighting' },
				{ species: 'accelgor', teraType: 'Bug' },
				{ species: 'druddigon', teraType: 'Dragon' },
			],
		},
		'Champion Iris (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'haxorus', teraType: 'Dragon', item: 'lifeorb' },
				{ species: 'lapras', teraType: 'Ice' },
				{ species: 'archeops', teraType: 'Rock' },
				{ species: 'beartic', teraType: 'Ice' },
				{ species: 'druddigon', teraType: 'Dragon' },
				{ species: 'hydreigon', teraType: 'Dragon', item: 'choicespecs' },
			],
		},
		'Champion Diantha (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'gardevoir', teraType: 'Fairy', item: 'gardevoirite' },
				{ species: 'goodra', teraType: 'Dragon' },
				{ species: 'trevenant', teraType: 'Ghost' },
				{ species: 'aurorus', teraType: 'Ice' },
				{ species: 'hawlucha', teraType: 'Fighting' },
				{ species: 'gourgeist', teraType: 'Ghost' },
			],
		},
		'Champion Leon (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'charizard', teraType: 'Fire', item: 'charizarditex' },
				{ species: 'dragapult', teraType: 'Ghost' },
				{ species: 'aegislash', teraType: 'Steel' },
				{ species: 'haxorus', teraType: 'Dragon' },
				{ species: 'rhyperior', teraType: 'Rock' },
				{ species: 'seismitoad', teraType: 'Water' },
			],
		},
		'Champion Geeta (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'glimmora', teraType: 'Rock', item: 'lifeorb' },
				{ species: 'kingambit', teraType: 'Dark' },
				{ species: 'espathra', teraType: 'Psychic' },
				{ species: 'veluza', teraType: 'Water' },
				{ species: 'avalugg', teraType: 'Ice' },
				{ species: 'gogoat', teraType: 'Grass' },
			],
		},
	},

	// wave 220: post-game elite four rematch 2
	'220': {
		'Elite Four Bruno (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'machamp', teraType: 'Fighting', item: 'lifeorb' },
				{ species: 'hitmonchan', teraType: 'Fighting' },
				{ species: 'hitmonlee', teraType: 'Fighting' },
				{ species: 'conkeldurr', teraType: 'Fighting' },
				{ species: 'steelix', teraType: 'Steel' },
				{ species: 'annihilape', teraType: 'Ghost' },
			],
		},
		'Elite Four Koga (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'crobat', teraType: 'Poison' },
				{ species: 'muk', teraType: 'Poison' },
				{ species: 'tentacruel', teraType: 'Water' },
				{ species: 'venomoth', teraType: 'Bug' },
				{ species: 'sneasler', teraType: 'Poison' },
				{ species: 'toxapex', teraType: 'Poison', item: 'blacksludge' },
			],
		},
		'Elite Four Phoebe (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'banette', teraType: 'Ghost', item: 'banettite' },
				{ species: 'mismagius', teraType: 'Ghost' },
				{ species: 'dusknoir', teraType: 'Ghost' },
				{ species: 'chandelure', teraType: 'Fire', item: 'lifeorb' },
				{ species: 'sableye', teraType: 'Dark', item: 'lifeorb' },
				{ species: 'mimikyu', teraType: 'Fairy' },
			],
		},
		'Elite Four Bertha (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'rhyperior', teraType: 'Ground' },
				{ species: 'hippowdon', teraType: 'Ground', ability: 'sandstream' },
				{ species: 'gliscor', teraType: 'Ground' },
				{ species: 'golem', teraType: 'Rock' },
				{ species: 'whiscash', teraType: 'Water' },
				{ species: 'garchomp', teraType: 'Dragon', item: 'garchompite' },
			],
		},
		'Elite Four Marshal (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'conkeldurr', teraType: 'Fighting', item: 'lifeorb' },
				{ species: 'mienshao', teraType: 'Fighting' },
				{ species: 'sawk', teraType: 'Fighting' },
				{ species: 'throh', teraType: 'Fighting' },
				{ species: 'breloom', teraType: 'Grass' },
				{ species: 'hawlucha', teraType: 'Fighting' },
			],
		},
		'Elite Four Siebold (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'blastoise', teraType: 'Water', item: 'blastoisinite' },
				{ species: 'gyarados', teraType: 'Flying' },
				{ species: 'clawitzer', teraType: 'Water', item: 'choicespecs' },
				{ species: 'starmie', teraType: 'Psychic' },
				{ species: 'barbaracle', teraType: 'Rock' },
				{ species: 'kingdra', teraType: 'Dragon' },
			],
		},
		'Elite Four Olivia (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'lycanrocmidnight', teraType: 'Rock', item: 'lifeorb' },
				{ species: 'gigalith', teraType: 'Rock' },
				{ species: 'tyranitar', teraType: 'Rock', item: 'tyranitarite' },
				{ species: 'carbink', teraType: 'Rock' },
				{ species: 'golem', teraType: 'Rock' },
				{ species: 'probopass', teraType: 'Steel' },
			],
		},
		'Elite Four Poppy (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'tinkaton', teraType: 'Fairy', item: 'lifeorb' },
				{ species: 'magearna', teraType: 'Steel' },
				{ species: 'corviknight', teraType: 'Steel' },
				{ species: 'copperajah', teraType: 'Steel' },
				{ species: 'bronzong', teraType: 'Steel' },
				{ species: 'scizor', teraType: 'Steel', item: 'scizorite' },
			],
		},
	},

	// wave 225: rival post-game rematch 2
	'225': {
		'Rival (Post-Game 2)': {
			teamSize: 6,
			pool: [
				{ species: 'venusaur', teraType: 'Poison', item: 'venusaurite' },
				{ species: 'charizard', teraType: 'Dragon', item: 'charizarditey' },
				{ species: 'blastoise', teraType: 'Steel', item: 'blastoisinite' },
				{ species: 'typhlosion', teraType: 'Ghost' },
				{ species: 'feraligatr', teraType: 'Dragon' },
				{ species: 'blaziken', teraType: 'Fighting', item: 'blazikenite' },
				{ species: 'swampert', teraType: 'Ground', item: 'swampertite' },
				{ species: 'infernape', teraType: 'Fighting', item: 'lifeorb' },
				{ species: 'empoleon', teraType: 'Steel' },
				{ species: 'greninja', teraType: 'Dark', item: 'choicespecs' },
				{ species: 'incineroar', teraType: 'Dark' },
				{ species: 'primarina', teraType: 'Water', item: 'lifeorb' },
				{ species: 'cinderace', teraType: 'Fire' },
				{ species: 'rillaboom', teraType: 'Grass' },
				{ species: 'inteleon', teraType: 'Ice' },
				{ species: 'meowscarada', teraType: 'Grass', item: 'lifeorb' },
				{ species: 'skeledirge', teraType: 'Ghost' },
				{ species: 'quaquaval', teraType: 'Fighting' },
				{ species: 'annihilape', teraType: 'Ghost', item: 'lifeorb' },
				{ species: 'corviknight', teraType: 'Flying' },
				{ species: 'dragapult', teraType: 'Dragon' },
				{ species: 'togekiss', teraType: 'Fairy' },
				{ species: 'garchomp', teraType: 'Dragon', item: 'garchompite' },
				{ species: 'lucario', teraType: 'Steel', item: 'lucarionite' },
			],
		},
	},

	// wave 230: special trainers – N, Colress, Zinnia, Trace
	'230': {
		'N': {
			teamSize: 6,
			pool: [
				{ species: 'zekrom', teraType: 'Dragon' },
				{ species: 'reshiram', teraType: 'Fire' },
				{ species: 'zoroark', teraType: 'Dark' },
				{ species: 'carracosta', teraType: 'Water' },
				{ species: 'archeops', teraType: 'Rock' },
				{ species: 'vanilluxe', teraType: 'Ice' },
				{ species: 'klinklang', teraType: 'Steel' },
				{ species: 'seismitoad', teraType: 'Water' },
				{ species: 'chandelure', teraType: 'Ghost', item: 'choicespecs' },
				{ species: 'hydreigon', teraType: 'Dragon', item: 'choicespecs' },
			],
		},
		'Colress': {
			teamSize: 6,
			pool: [
				{ species: 'klinklang', teraType: 'Steel' },
				{ species: 'magnezone', teraType: 'Steel' },
				{ species: 'beheeyem', teraType: 'Psychic' },
				{ species: 'metang', teraType: 'Steel' },
				{ species: 'golurk', teraType: 'Ground' },
				{ species: 'rotomwash', teraType: 'Electric' },
				{ species: 'genesect', teraType: 'Bug', item: 'lifeorb' },
			],
		},
		'Zinnia': {
			teamSize: 6,
			pool: [
				{ species: 'rayquaza', teraType: 'Dragon' },
				{ species: 'salamence', teraType: 'Dragon', item: 'salamencite' },
				{ species: 'altaria', teraType: 'Fairy', item: 'altarianite' },
				{ species: 'flygon', teraType: 'Dragon' },
				{ species: 'whiscash', teraType: 'Water' },
				{ species: 'goodra', teraType: 'Dragon' },
				{ species: 'noivern', teraType: 'Dragon' },
			],
		},
		'Trace': {
			teamSize: 6,
			pool: [
				{ species: 'eevee' },
				{ species: 'jolteon', teraType: 'Electric' },
				{ species: 'vaporeon', teraType: 'Water' },
				{ species: 'flareon', teraType: 'Fire' },
				{ species: 'espeon', teraType: 'Psychic' },
				{ species: 'umbreon', teraType: 'Dark' },
				{ species: 'leafeon', teraType: 'Grass' },
				{ species: 'glaceon', teraType: 'Ice' },
				{ species: 'sylveon', teraType: 'Fairy', item: 'lifeorb' },
			],
		},
	},

	// wave 235: post-game gym leader rematch circuit 2
	'235': {
		'Gym Leader Sabrina (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'alakazam', teraType: 'Psychic', item: 'alakazite' },
				{ species: 'jynx', teraType: 'Ice' },
				{ species: 'espeon', teraType: 'Psychic' },
				{ species: 'gothitelle', teraType: 'Psychic' },
				{ species: 'gardevoir', teraType: 'Fairy', item: 'gardevoirite' },
				{ species: 'hatterene', teraType: 'Psychic', item: 'lifeorb' },
			],
		},
		'Gym Leader Blaine (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'rapidash', teraType: 'Fire' },
				{ species: 'magmortar', teraType: 'Fire', item: 'lifeorb' },
				{ species: 'houndoom', teraType: 'Dark', item: 'houndoominite' },
				{ species: 'arcanine', teraType: 'Fire' },
				{ species: 'ninetales', teraType: 'Fire' },
				{ species: 'volcarona', teraType: 'Fire', item: 'lifeorb' },
			],
		},
		'Gym Leader Giovanni (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'rhyperior', teraType: 'Ground', item: 'lifeorb' },
				{ species: 'nidoking', teraType: 'Poison' },
				{ species: 'nidoqueen', teraType: 'Poison' },
				{ species: 'dugtrio', teraType: 'Ground' },
				{ species: 'persian', teraType: 'Normal' },
				{ species: 'marowak', teraType: 'Ground' },
			],
		},
		'Gym Leader Jasmine (Rematch)': {
			teamSize: 6,
			pool: [
				{ species: 'steelix', teraType: 'Steel', item: 'steelixite' },
				{ species: 'magnezone', teraType: 'Electric' },
				{ species: 'skarmory', teraType: 'Steel' },
				{ species: 'empoleon', teraType: 'Water' },
				{ species: 'mawile', teraType: 'Steel', item: 'mawilite' },
				{ species: 'scizor', teraType: 'Steel', item: 'scizorite' },
			],
		},
	},

	// wave 240: evil team boss final rematch
	'240': {
		'Giovanni (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'persian', teraType: 'Normal', ability: 'technician', item: 'lifeorb' },
				{ species: 'nidoqueen', teraType: 'Ground', item: 'lifeorb' },
				{ species: 'nidoking', teraType: 'Ground', item: 'lifeorb' },
				{ species: 'dugtrio', teraType: 'Ground' },
				{ species: 'rhyperior', teraType: 'Ground', item: 'assaultvest' },
				{ species: 'mewtwo', teraType: 'Psychic', item: 'mewtwonitex' },
			],
		},
		'Maxie (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'mightyena', teraType: 'Dark' },
				{ species: 'crobat', teraType: 'Poison' },
				{ species: 'camerupt', teraType: 'Fire', item: 'cameruptite' },
				{ species: 'heatran', teraType: 'Fire' },
				{ species: 'solrock', teraType: 'Rock' },
				{ species: 'groudon', teraType: 'Ground' },
			],
		},
		'Archie (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'mightyena', teraType: 'Dark' },
				{ species: 'crobat', teraType: 'Poison' },
				{ species: 'sharpedo', teraType: 'Water', item: 'sharpedonite' },
				{ species: 'kyogre', teraType: 'Water' },
				{ species: 'lunatone', teraType: 'Rock' },
				{ species: 'crawdaunt', teraType: 'Dark' },
			],
		},
		'Cyrus (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'honchkrow', teraType: 'Dark' },
				{ species: 'weavile', teraType: 'Ice' },
				{ species: 'crobat', teraType: 'Poison' },
				{ species: 'gyarados', teraType: 'Dark' },
				{ species: 'dialga', teraType: 'Steel' },
				{ species: 'palkia', teraType: 'Water' },
			],
		},
		'Ghetsis (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'cofagrigus', teraType: 'Ghost' },
				{ species: 'seismitoad', teraType: 'Poison' },
				{ species: 'bisharp', teraType: 'Dark' },
				{ species: 'eelektross', teraType: 'Electric', item: 'lifeorb' },
				{ species: 'hydreigon', teraType: 'Dragon', item: 'choicespecs' },
				{ species: 'kyurem', teraType: 'Dragon' },
			],
		},
		'Lysandre (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'mienshao', teraType: 'Fighting' },
				{ species: 'gyarados', teraType: 'Fire' },
				{ species: 'honchkrow', teraType: 'Dark' },
				{ species: 'dragalge', teraType: 'Dragon' },
				{ species: 'pyroar', teraType: 'Fire' },
				{ species: 'yveltal', teraType: 'Dark' },
			],
		},
		'Lusamine (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'clefable', teraType: 'Fairy' },
				{ species: 'milotic', teraType: 'Water', item: 'lifeorb' },
				{ species: 'salazzle', teraType: 'Poison' },
				{ species: 'nihilego', teraType: 'Rock' },
				{ species: 'pheromosa', teraType: 'Bug' },
				{ species: 'xurkitree', teraType: 'Electric' },
			],
		},
		'Rose (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'ferrothorn', teraType: 'Steel', item: 'leftovers' },
				{ species: 'klinklang', teraType: 'Steel' },
				{ species: 'excadrill', teraType: 'Steel' },
				{ species: 'copperajah', teraType: 'Steel' },
				{ species: 'toedscruel', teraType: 'Poison' },
				{ species: 'eternatus', teraType: 'Poison' },
			],
		},
	},

	// wave 245: mythical / special trainers
	'245': {
		'Red': {
			teamSize: 6,
			pool: [
				{ species: 'pikachu', teraType: 'Electric', item: 'lightball' },
				{ species: 'venusaur', teraType: 'Grass', item: 'venusaurite' },
				{ species: 'charizard', teraType: 'Fire', item: 'charizarditex' },
				{ species: 'blastoise', teraType: 'Water', item: 'blastoisinite' },
				{ species: 'snorlax', teraType: 'Normal', item: 'leftovers' },
				{ species: 'espeon', teraType: 'Psychic' },
				{ species: 'lapras', teraType: 'Water' },
			],
		},
		'Gold': {
			teamSize: 6,
			pool: [
				{ species: 'pichu', teraType: 'Electric' },
				{ species: 'meganium', teraType: 'Grass' },
				{ species: 'typhlosion', teraType: 'Ghost' },
				{ species: 'feraligatr', teraType: 'Water', item: 'lifeorb' },
				{ species: 'ampharos', teraType: 'Electric', item: 'ampharosite' },
				{ species: 'togekiss', teraType: 'Fairy' },
				{ species: 'umbreon', teraType: 'Dark' },
			],
		},
		'Brendan': {
			teamSize: 6,
			pool: [
				{ species: 'sceptile', teraType: 'Grass', item: 'sceptilite' },
				{ species: 'blaziken', teraType: 'Fire', item: 'blazikenite' },
				{ species: 'swampert', teraType: 'Water', item: 'swampertite' },
				{ species: 'manectric', teraType: 'Electric', item: 'manectite' },
				{ species: 'flygon', teraType: 'Dragon' },
				{ species: 'latios', teraType: 'Psychic', item: 'souldew' },
			],
		},
		'Lucas': {
			teamSize: 6,
			pool: [
				{ species: 'torterra', teraType: 'Grass' },
				{ species: 'infernape', teraType: 'Fire', item: 'lifeorb' },
				{ species: 'empoleon', teraType: 'Water' },
				{ species: 'garchomp', teraType: 'Dragon', item: 'garchompite' },
				{ species: 'lucario', teraType: 'Fighting', item: 'lucarionite' },
				{ species: 'togekiss', teraType: 'Fairy' },
			],
		},
		'Hilbert': {
			teamSize: 6,
			pool: [
				{ species: 'serperior', teraType: 'Grass' },
				{ species: 'emboar', teraType: 'Fire' },
				{ species: 'samurott', teraType: 'Water' },
				{ species: 'reshiram', teraType: 'Fire' },
				{ species: 'krookodile', teraType: 'Dark' },
				{ species: 'hydreigon', teraType: 'Dragon', item: 'choicespecs' },
			],
		},
		'Calem': {
			teamSize: 6,
			pool: [
				{ species: 'chesnaught', teraType: 'Grass' },
				{ species: 'delphox', teraType: 'Fire' },
				{ species: 'greninja', teraType: 'Dark', item: 'choicespecs' },
				{ species: 'xerneas', teraType: 'Fairy' },
				{ species: 'goodra', teraType: 'Dragon' },
				{ species: 'clawitzer', teraType: 'Water' },
			],
		},
		'Elio': {
			teamSize: 6,
			pool: [
				{ species: 'decidueye', teraType: 'Grass' },
				{ species: 'incineroar', teraType: 'Dark' },
				{ species: 'primarina', teraType: 'Fairy', item: 'lifeorb' },
				{ species: 'solgaleo', teraType: 'Psychic' },
				{ species: 'kommoo', teraType: 'Dragon' },
				{ species: 'tapukoko', teraType: 'Electric' },
			],
		},
		'Victor': {
			teamSize: 6,
			pool: [
				{ species: 'rillaboom', teraType: 'Grass' },
				{ species: 'cinderace', teraType: 'Fire' },
				{ species: 'inteleon', teraType: 'Ice' },
				{ species: 'zamazenta', teraType: 'Fighting' },
				{ species: 'dragapult', teraType: 'Dragon', item: 'choiceband' },
				{ species: 'corviknight', teraType: 'Steel' },
			],
		},
	},

	// wave 250: final post-game – champion ultra rematches
	'250': {
		'Champion Cynthia (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'garchomp', teraType: 'Dragon', item: 'garchompite' },
				{ species: 'spiritomb', teraType: 'Ghost' },
				{ species: 'lucario', teraType: 'Steel', item: 'lucarionite' },
				{ species: 'roserade', teraType: 'Grass', item: 'lifeorb' },
				{ species: 'milotic', teraType: 'Water', item: 'lifeorb' },
				{ species: 'togekiss', teraType: 'Fairy', item: 'lifeorb' },
			],
		},
		'Champion Leon (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'charizard', teraType: 'Fire', item: 'charizarditex' },
				{ species: 'dragapult', teraType: 'Dragon', item: 'choicespecs' },
				{ species: 'aegislash', teraType: 'Steel', item: 'lifeorb' },
				{ species: 'seismitoad', teraType: 'Ground' },
				{ species: 'haxorus', teraType: 'Dragon' },
				{ species: 'inteleon', teraType: 'Ice', item: 'lifeorb' },
			],
		},
		'Champion Steven (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'metagross', teraType: 'Steel', item: 'metagrossite' },
				{ species: 'skarmory', teraType: 'Steel' },
				{ species: 'excadrill', teraType: 'Ground', item: 'lifeorb' },
				{ species: 'aggron', teraType: 'Steel', item: 'aggronite' },
				{ species: 'armaldo', teraType: 'Rock' },
				{ species: 'scizor', teraType: 'Bug', item: 'scizorite' },
			],
		},
		'Champion Blue (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'pidgeot', teraType: 'Normal' },
				{ species: 'alakazam', teraType: 'Psychic', item: 'alakazite' },
				{ species: 'gyarados', teraType: 'Flying', item: 'lifeorb' },
				{ species: 'arcanine', teraType: 'Fire' },
				{ species: 'exeggutor', teraType: 'Grass' },
				{ species: 'charizard', teraType: 'Dragon', item: 'charizarditey' },
			],
		},
		'Red (Ultra)': {
			teamSize: 6,
			pool: [
				{ species: 'pikachu', teraType: 'Electric', item: 'lightball' },
				{ species: 'charizard', teraType: 'Fire', item: 'charizarditex' },
				{ species: 'blastoise', teraType: 'Steel', item: 'blastoisinite' },
				{ species: 'venusaur', teraType: 'Poison', item: 'venusaurite' },
				{ species: 'snorlax', teraType: 'Normal', item: 'leftovers' },
				{ species: 'mewtwo', teraType: 'Psychic', item: 'mewtwonitey' },
			],
		},
	},
};
