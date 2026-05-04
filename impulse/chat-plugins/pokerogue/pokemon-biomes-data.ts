export const BIOME_POOL = [
	'Plains', 'Grass', 'Tall Grass', 'Metropolis', 'Forest', 'Sea', 'Swamp', 'Beach', 'Lake',
	'Seabed', 'Mountain', 'Badlands', 'Cave', 'Desert', 'Ice Cave', 'Meadow', 'Power Plant',
	'Volcano', 'Graveyard', 'Dojo', 'Factory', 'Ancient Ruins', 'Wasteland', 'Abyss', 'Space',
	'Construction Site', 'Jungle', 'Fairy Cave', 'Temple', 'Slum', 'Snowy Forest', 'Island', 'Laboratory',
];

export const BIOMES = {
	'Town': {
		'Common': [
			{ species: 'caterpie', weight: 100 }, { species: 'weedle', weight: 100 },
			{ species: 'pidgey', weight: 100 }, { species: 'rattata', weight: 100 },
			{ species: 'spearow', weight: 100 }, { species: 'sentret', weight: 100 },
			{ species: 'hoothoot', weight: 100 }, { species: 'ledyba', weight: 100 },
			{ species: 'spinarak', weight: 100 }, { species: 'hoppip', weight: 100 },
			{ species: 'sunkern', weight: 100 }, { species: 'poochyena', weight: 100 },
			{ species: 'zigzagoon', weight: 100 }, { species: 'wurmple', weight: 100 },
			{ species: 'silcoon', weight: 100 }, { species: 'cascoon', weight: 100 },
			{ species: 'taillow', weight: 100 }, { species: 'starly', weight: 100 },
			{ species: 'bidoof', weight: 100 }, { species: 'patrat', weight: 100 },
			{ species: 'lillipup', weight: 100 }, { species: 'purrloin', weight: 100 },
			{ species: 'pidove', weight: 100 }, { species: 'cottonee', weight: 100 },
			{ species: 'fletchling', weight: 100 }, { species: 'scatterbug', weight: 100 },
			{ species: 'yungoos', weight: 100 }, { species: 'skwovet', weight: 100 },
			{ species: 'blipbug', weight: 100 }, { species: 'wooloo', weight: 100 },
			{ species: 'lechonk', weight: 100 },
		],
		'Uncommon': [
			{ species: 'ekans', weight: 60 }, { species: 'nidoranf', weight: 60 },
			{ species: 'nidoranm', weight: 60 }, { species: 'oddish', weight: 60 },
			{ species: 'paras', weight: 60 }, { species: 'venonat', weight: 60 },
			{ species: 'meowth', weight: 60 }, { species: 'bellsprout', weight: 60 },
			{ species: 'lotad', weight: 60 }, { species: 'seedot', weight: 60 },
			{ species: 'shroomish', weight: 60 }, { species: 'whismur', weight: 60 },
			{ species: 'skitty', weight: 60 }, { species: 'kricketot', weight: 60 },
			{ species: 'combee', weight: 60 }, { species: 'cherubi', weight: 60 },
			{ species: 'venipede', weight: 60 }, { species: 'minccino', weight: 60 },
			{ species: 'pawmi', weight: 60 }, { species: 'fidough', weight: 60 },
		],
		'Rare': [
			{ species: 'abra', weight: 25 }, { species: 'cleffa', weight: 25 },
			{ species: 'igglybuff', weight: 25 }, { species: 'surskit', weight: 25 },
			{ species: 'happiny', weight: 25 }, { species: 'rookidee', weight: 25 },
			{ species: 'tandemaus', weight: 25 },
		],
		'Super Rare': [
			{ species: 'eevee', weight: 10 }, { species: 'pichu', weight: 10 },
			{ species: 'togepi', weight: 10 }, { species: 'ralts', weight: 10 },
			{ species: 'nincada', weight: 10 }, { species: 'riolu', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'ditto', weight: 5 }, { species: 'munchlax', weight: 5 },
			{ species: 'zorua', weight: 5 },
		],
		'Boss': [],
		'Boss Rare': [],
		'Boss Super Rare': [],
		'Boss Ultra Rare': [],
	},
	'Plains': {
		'Common': [
			{ species: 'sentret', weight: 100 }, { species: 'yungoos', weight: 100 },
			{ species: 'skwovet', weight: 100 }, { species: 'zigzagoon', weight: 100 },
			{ species: 'bidoof', weight: 100 }, { species: 'lechonk', weight: 100 },
			{ species: 'zubat', weight: 100 }, { species: 'meowth', weight: 100 },
			{ species: 'poochyena', weight: 100 },
		],
		'Uncommon': [
			{ species: 'doduo', weight: 80 }, { species: 'starly', weight: 80 },
			{ species: 'pidove', weight: 80 }, { species: 'rockruff', weight: 80 },
			{ species: 'pawmi', weight: 80 }, { species: 'mankey', weight: 80 },
			{ species: 'nickit', weight: 80 }, { species: 'pidgey', weight: 80 },
			{ species: 'spearow', weight: 80 }, { species: 'pikachu', weight: 80 },
			{ species: 'fletchling', weight: 80 },
		],
		'Rare': [
			{ species: 'abra', weight: 25 }, { species: 'buneary', weight: 25 },
			{ species: 'rookidee', weight: 25 }, { species: 'shinx', weight: 25 },
			{ species: 'taurospaldea', weight: 25 },
		],
		'Super Rare': [
			{ species: 'farfetchd', weight: 10 }, { species: 'lickitung', weight: 10 },
			{ species: 'chansey', weight: 10 }, { species: 'eevee', weight: 10 },
			{ species: 'snorlax', weight: 10 }, { species: 'dunsparce', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'ditto', weight: 5 }, { species: 'latias', weight: 5 },
			{ species: 'latios', weight: 5 },
		],
		'Boss': [
			{ species: 'dodrio', weight: 100 }, { species: 'furret', weight: 100 },
			{ species: 'gumshoos', weight: 100 }, { species: 'greedent', weight: 100 },
			{ species: 'persian', weight: 100 }, { species: 'mightyena', weight: 100 },
			{ species: 'linoone', weight: 100 }, { species: 'bibarel', weight: 100 },
			{ species: 'lopunny', weight: 100 }, { species: 'oinkologne', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'farfetchd', weight: 50 }, { species: 'snorlax', weight: 50 },
			{ species: 'lickilicky', weight: 50 }, { species: 'dudunsparce', weight: 50 },
			{ species: 'pawmot', weight: 50 }, { species: 'taurospaldea', weight: 50 },
			{ species: 'lycanroc', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'latias', weight: 25 }, { species: 'latios', weight: 25 },
		],
		'Boss Ultra Rare': [],
	},
	'Grass': {
		'Common': [
			{ species: 'hoppip', weight: 100 }, { species: 'silcoon', weight: 100 },
			{ species: 'cascoon', weight: 100 }, { species: 'shroomish', weight: 100 },
			{ species: 'venipede', weight: 100 }, { species: 'cottonee', weight: 100 },
			{ species: 'petilil', weight: 100 },
		],
		'Uncommon': [
			{ species: 'sunkern', weight: 80 }, { species: 'combee', weight: 80 },
			{ species: 'seedot', weight: 80 }, { species: 'miltank', weight: 80 },
			{ species: 'cherubi', weight: 80 }, { species: 'foongus', weight: 80 },
		],
		'Rare': [
			{ species: 'bulbasaur', weight: 25 }, { species: 'growlithe', weight: 25 },
			{ species: 'turtwig', weight: 25 }, { species: 'bonsly', weight: 25 },
			{ species: 'noibat', weight: 25 },
		],
		'Super Rare': [],
		'Ultra Rare': [{ species: 'virizion', weight: 5 }],
		'Boss': [
			{ species: 'jumpluff', weight: 100 }, { species: 'vespiquen', weight: 100 },
			{ species: 'noivern', weight: 100 }, { species: 'miltank', weight: 100 },
			{ species: 'scolipede', weight: 100 }, { species: 'whimsicott', weight: 100 },
			{ species: 'lilligant', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'venusaur', weight: 50 }, { species: 'arcanine', weight: 50 },
			{ species: 'sudowoodo', weight: 50 }, { species: 'torterra', weight: 50 },
		],
		'Boss Super Rare': [{ species: 'virizion', weight: 25 }],
		'Boss Ultra Rare': [],
	},
	'Tall Grass': {
		'Common': [
			{ species: 'nidoranf', weight: 100 }, { species: 'nidoranm', weight: 100 },
			{ species: 'bounsweet', weight: 100 }, { species: 'oddish', weight: 100 },
			{ species: 'spinarak', weight: 100 }, { species: 'kricketot', weight: 100 },
			{ species: 'paras', weight: 100 }, { species: 'fomantis', weight: 100 },
			{ species: 'nymble', weight: 100 }, { species: 'scatterbug', weight: 100 },
		],
		'Uncommon': [
			{ species: 'vulpix', weight: 80 }, { species: 'venonat', weight: 80 },
			{ species: 'nincada', weight: 80 }, { species: 'zangoose', weight: 80 },
			{ species: 'seviper', weight: 80 },
		],
		'Rare': [
			{ species: 'pinsir', weight: 25 }, { species: 'chikorita', weight: 25 },
			{ species: 'girafarig', weight: 25 }, { species: 'kecleon', weight: 25 },
			{ species: 'tropius', weight: 25 }, { species: 'audino', weight: 25 },
			{ species: 'pawniard', weight: 25 },
		],
		'Super Rare': [
			{ species: 'scyther', weight: 10 }, { species: 'shedinja', weight: 10 },
		],
		'Ultra Rare': [],
		'Boss': [
			{ species: 'nidoqueen', weight: 100 }, { species: 'nidoking', weight: 100 },
			{ species: 'tsareena', weight: 100 }, { species: 'vileplume', weight: 100 },
			{ species: 'ariados', weight: 100 }, { species: 'kricketune', weight: 100 },
			{ species: 'ninjask', weight: 100 }, { species: 'zangoose', weight: 100 },
			{ species: 'seviper', weight: 100 }, { species: 'kecleon', weight: 100 },
			{ species: 'lurantis', weight: 100 }, { species: 'lokix', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'bellossom', weight: 50 }, { species: 'scyther', weight: 50 },
			{ species: 'pinsir', weight: 50 }, { species: 'meganium', weight: 50 },
			{ species: 'farigiraf', weight: 50 }, { species: 'kingambit', weight: 50 },
		],
		'Boss Super Rare': [],
		'Boss Ultra Rare': [],
	},
	'Metropolis': {
		'Common': [
			{ species: 'rattata', weight: 100 }, { species: 'zigzagoon', weight: 100 },
			{ species: 'patrat', weight: 100 }, { species: 'lillipup', weight: 100 },
			{ species: 'yamper', weight: 100 }, { species: 'houndour', weight: 100 },
		],
		'Uncommon': [
			{ species: 'pikachu', weight: 80 }, { species: 'glameow', weight: 80 },
			{ species: 'furfrou', weight: 80 }, { species: 'fidough', weight: 80 },
			{ species: 'squawkabilly', weight: 80 }, { species: 'indeedee', weight: 80 },
			{ species: 'espurr', weight: 80 },
		],
		'Rare': [
			{ species: 'smeargle', weight: 25 }, { species: 'castform', weight: 25 },
			{ species: 'varoom', weight: 25 }, { species: 'tandemaus', weight: 25 },
			{ species: 'morpeko', weight: 25 },
		],
		'Super Rare': [
			{ species: 'ditto', weight: 10 }, { species: 'eevee', weight: 10 },
		],
		'Ultra Rare': [],
		'Boss': [
			{ species: 'boltund', weight: 100 }, { species: 'meowstic', weight: 100 },
			{ species: 'castform', weight: 100 }, { species: 'stoutland', weight: 100 },
			{ species: 'furfrou', weight: 100 }, { species: 'dachsbun', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'maushold', weight: 50 }, { species: 'revavroom', weight: 50 },
		],
		'Boss Super Rare': [],
		'Boss Ultra Rare': [],
	},
	'Forest': {
		'Common': [
			{ species: 'butterfree', weight: 100 }, { species: 'beedrill', weight: 100 },
			{ species: 'bellsprout', weight: 100 }, { species: 'combee', weight: 100 },
			{ species: 'petilil', weight: 100 }, { species: 'deerling', weight: 100 },
			{ species: 'vivillon', weight: 100 }, { species: 'venonat', weight: 100 },
			{ species: 'spinarak', weight: 100 }, { species: 'pineco', weight: 100 },
			{ species: 'seedot', weight: 100 }, { species: 'shroomish', weight: 100 },
			{ species: 'venipede', weight: 100 }, { species: 'tarountula', weight: 100 },
			{ species: 'nymble', weight: 100 }, { species: 'shroodle', weight: 100 },
			{ species: 'beautifly', weight: 100 }, { species: 'dustox', weight: 100 },
		],
		'Uncommon': [
			{ species: 'roselia', weight: 80 }, { species: 'mothim', weight: 80 },
			{ species: 'sewaddle', weight: 80 }, { species: 'dottler', weight: 80 },
			{ species: 'hoothoot', weight: 80 }, { species: 'rockruff', weight: 80 },
			{ species: 'ekans', weight: 80 }, { species: 'teddiursa', weight: 80 },
			{ species: 'burmy', weight: 80 }, { species: 'pansage', weight: 80 },
		],
		'Rare': [
			{ species: 'exeggcute', weight: 25 }, { species: 'stantler', weight: 25 },
			{ species: 'scyther', weight: 25 }, { species: 'heracross', weight: 25 },
			{ species: 'treecko', weight: 25 }, { species: 'tropius', weight: 25 },
			{ species: 'karrablast', weight: 25 }, { species: 'shelmet', weight: 25 },
			{ species: 'chespin', weight: 25 }, { species: 'rowlet', weight: 25 },
			{ species: 'squawkabilly', weight: 25 }, { species: 'toedscool', weight: 25 },
		],
		'Super Rare': [
			{ species: 'durant', weight: 10 }, { species: 'bloodmoonursaluna', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'kartana', weight: 5 }, { species: 'wochien', weight: 5 },
		],
		'Boss': [
			{ species: 'victreebel', weight: 100 }, { species: 'mothim', weight: 100 },
			{ species: 'vespiquen', weight: 100 }, { species: 'lilligant', weight: 100 },
			{ species: 'sawsbuck', weight: 100 }, { species: 'beautifly', weight: 100 },
			{ species: 'ariados', weight: 100 }, { species: 'forretress', weight: 100 },
			{ species: 'shiftry', weight: 100 }, { species: 'breloom', weight: 100 },
			{ species: 'scolipede', weight: 100 }, { species: 'orbeetle', weight: 100 },
			{ species: 'venomoth', weight: 100 }, { species: 'noctowl', weight: 100 },
			{ species: 'dustox', weight: 100 }, { species: 'wormadam', weight: 100 },
			{ species: 'simisage', weight: 100 }, { species: 'spidops', weight: 100 },
			{ species: 'lokix', weight: 100 }, { species: 'grafaiai', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'stantler', weight: 50 }, { species: 'heracross', weight: 50 },
			{ species: 'sceptile', weight: 50 }, { species: 'escavalier', weight: 50 },
			{ species: 'accelgor', weight: 50 }, { species: 'durant', weight: 50 },
			{ species: 'chesnaught', weight: 50 }, { species: 'decidueye', weight: 50 },
			{ species: 'toedscruel', weight: 50 }, { species: 'lycanroc', weight: 50 },
			{ species: 'bloodmoonursaluna', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'kartana', weight: 25 }, { species: 'wochien', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'calyrex', weight: 10 }],
	},
	'Sea': {
		'Common': [
			{ species: 'tentacool', weight: 100 }, { species: 'wailmer', weight: 100 },
			{ species: 'slowpoke', weight: 100 }, { species: 'wingull', weight: 100 },
			{ species: 'cramorant', weight: 100 }, { species: 'finizen', weight: 100 },
			{ species: 'finneon', weight: 100 }, { species: 'inkay', weight: 100 },
		],
		'Uncommon': [
			{ species: 'poliwag', weight: 80 }, { species: 'horsea', weight: 80 },
			{ species: 'goldeen', weight: 80 }, { species: 'magikarp', weight: 80 },
			{ species: 'buizel', weight: 80 }, { species: 'panpour', weight: 80 },
			{ species: 'wattrel', weight: 80 }, { species: 'staryu', weight: 80 },
			{ species: 'shellder', weight: 80 }, { species: 'chinchou', weight: 80 },
			{ species: 'carvanha', weight: 80 },
		],
		'Rare': [
			{ species: 'lapras', weight: 25 }, { species: 'piplup', weight: 25 },
			{ species: 'popplio', weight: 25 },
		],
		'Super Rare': [
			{ species: 'kingdra', weight: 10 }, { species: 'tirtouga', weight: 10 },
		],
		'Ultra Rare': [],
		'Boss': [
			{ species: 'pelipper', weight: 100 }, { species: 'cramorant', weight: 100 },
			{ species: 'palafin', weight: 100 }, { species: 'sharpedo', weight: 100 },
			{ species: 'malamar', weight: 100 }, { species: 'lumineon', weight: 100 },
			{ species: 'tentacruel', weight: 100 }, { species: 'floatzel', weight: 100 },
			{ species: 'simipour', weight: 100 }, { species: 'kilowattrel', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'gyarados', weight: 50 }, { species: 'kingdra', weight: 50 },
			{ species: 'empoleon', weight: 50 }, { species: 'primarina', weight: 50 },
		],
		'Boss Super Rare': [],
		'Boss Ultra Rare': [{ species: 'lugia', weight: 10 }],
	},
	'Swamp': {
		'Common': [
			{ species: 'poliwag', weight: 100 }, { species: 'gulpin', weight: 100 },
			{ species: 'shellos', weight: 100 }, { species: 'tympole', weight: 100 },
			{ species: 'wooper', weight: 100 }, { species: 'lotad', weight: 100 },
			{ species: 'ekans', weight: 100 }, { species: 'wooperpaldea', weight: 100 },
		],
		'Uncommon': [
			{ species: 'psyduck', weight: 80 }, { species: 'barboach', weight: 80 },
			{ species: 'skorupi', weight: 80 }, { species: 'stunfisk', weight: 80 },
			{ species: 'mareanie', weight: 80 }, { species: 'croagunk', weight: 80 },
		],
		'Rare': [
			{ species: 'totodile', weight: 25 }, { species: 'mudkip', weight: 25 },
		],
		'Super Rare': [
			{ species: 'slowpokegalar', weight: 10 }, { species: 'sliggoohisui', weight: 10 },
			{ species: 'politoed', weight: 10 }, { species: 'stunfiskgalar', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'azelf', weight: 5 }, { species: 'poipole', weight: 5 },
		],
		'Boss': [
			{ species: 'quagsire', weight: 100 }, { species: 'ludicolo', weight: 100 },
			{ species: 'arbok', weight: 100 }, { species: 'clodsire', weight: 100 },
			{ species: 'poliwrath', weight: 100 }, { species: 'swalot', weight: 100 },
			{ species: 'whiscash', weight: 100 }, { species: 'gastrodon', weight: 100 },
			{ species: 'seismitoad', weight: 100 }, { species: 'stunfisk', weight: 100 },
			{ species: 'toxapex', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'slowbrogalar', weight: 50 }, { species: 'slowkinggalar', weight: 50 },
			{ species: 'goodrahisui', weight: 50 }, { species: 'feraligatr', weight: 50 },
			{ species: 'politoed', weight: 50 }, { species: 'swampert', weight: 50 },
			{ species: 'stunfiskgalar', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'azelf', weight: 25 }, { species: 'poipole', weight: 25 },
		],
		'Boss Ultra Rare': [],
	},
	'Beach': {
		'Common': [
			{ species: 'krabby', weight: 100 }, { species: 'corphish', weight: 100 },
			{ species: 'dwebble', weight: 100 }, { species: 'binacle', weight: 100 },
			{ species: 'mareanie', weight: 100 }, { species: 'wiglett', weight: 100 },
			{ species: 'staryu', weight: 100 }, { species: 'shellder', weight: 100 },
		],
		'Uncommon': [
			{ species: 'burmy', weight: 80 }, { species: 'clauncher', weight: 80 },
			{ species: 'sandygast', weight: 80 },
		],
		'Rare': [
			{ species: 'quaxly', weight: 25 }, { species: 'tatsugiri', weight: 25 },
		],
		'Super Rare': [{ species: 'tirtouga', weight: 10 }],
		'Ultra Rare': [
			{ species: 'cresselia', weight: 5 }, { species: 'keldeo', weight: 5 },
			{ species: 'tapufini', weight: 5 },
		],
		'Boss': [
			{ species: 'starmie', weight: 100 }, { species: 'cloyster', weight: 100 },
			{ species: 'kingler', weight: 100 }, { species: 'crawdaunt', weight: 100 },
			{ species: 'wormadam', weight: 100 }, { species: 'crustle', weight: 100 },
			{ species: 'barbaracle', weight: 100 }, { species: 'clawitzer', weight: 100 },
			{ species: 'toxapex', weight: 100 }, { species: 'palossand', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'carracosta', weight: 50 }, { species: 'quaquaval', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'cresselia', weight: 25 }, { species: 'keldeo', weight: 25 },
			{ species: 'tapufini', weight: 25 },
		],
		'Boss Ultra Rare': [],
	},
	'Lake': {
		'Common': [
			{ species: 'psyduck', weight: 100 }, { species: 'goldeen', weight: 100 },
			{ species: 'wooper', weight: 100 }, { species: 'surskit', weight: 100 },
			{ species: 'chewtle', weight: 100 }, { species: 'lotad', weight: 100 },
			{ species: 'ducklett', weight: 100 }, { species: 'marill', weight: 100 },
		],
		'Uncommon': [
			{ species: 'slowpoke', weight: 80 }, { species: 'magikarp', weight: 80 },
			{ species: 'wishiwashi', weight: 80 }, { species: 'dewpider', weight: 80 },
		],
		'Rare': [
			{ species: 'squirtle', weight: 25 }, { species: 'oshawott', weight: 25 },
			{ species: 'froakie', weight: 25 }, { species: 'sobble', weight: 25 },
			{ species: 'flamigo', weight: 25 },
		],
		'Super Rare': [
			{ species: 'vaporeon', weight: 10 }, { species: 'slowking', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'suicune', weight: 5 }, { species: 'mesprit', weight: 5 },
		],
		'Boss': [
			{ species: 'swanna', weight: 100 }, { species: 'araquanid', weight: 100 },
			{ species: 'azumarill', weight: 100 }, { species: 'golduck', weight: 100 },
			{ species: 'slowbro', weight: 100 }, { species: 'seaking', weight: 100 },
			{ species: 'masquerain', weight: 100 }, { species: 'wishiwashi', weight: 100 },
			{ species: 'drednaw', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'blastoise', weight: 50 }, { species: 'gyarados', weight: 50 },
			{ species: 'vaporeon', weight: 50 }, { species: 'slowking', weight: 50 },
			{ species: 'samurott', weight: 50 }, { species: 'greninja', weight: 50 },
			{ species: 'inteleon', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'suicune', weight: 25 }, { species: 'mesprit', weight: 25 },
		],
		'Boss Ultra Rare': [],
	},
	'Seabed': {
		'Common': [
			{ species: 'chinchou', weight: 100 }, { species: 'remoraid', weight: 100 },
			{ species: 'clamperl', weight: 100 }, { species: 'basculin', weight: 100 },
			{ species: 'frillish', weight: 100 }, { species: 'arrokuda', weight: 100 },
			{ species: 'veluza', weight: 100 },
		],
		'Uncommon': [
			{ species: 'tentacool', weight: 80 }, { species: 'shellder', weight: 80 },
			{ species: 'wailmer', weight: 80 }, { species: 'luvdisc', weight: 80 },
			{ species: 'shellos', weight: 80 }, { species: 'skrelp', weight: 80 },
			{ species: 'pincurchin', weight: 80 }, { species: 'dondozo', weight: 80 },
		],
		'Rare': [
			{ species: 'qwilfish', weight: 25 }, { species: 'corsola', weight: 25 },
			{ species: 'octillery', weight: 25 }, { species: 'feebas', weight: 25 },
			{ species: 'mantyke', weight: 25 }, { species: 'alomomola', weight: 25 },
			{ species: 'tynamo', weight: 25 }, { species: 'dhelmise', weight: 25 },
		],
		'Super Rare': [
			{ species: 'omanyte', weight: 10 }, { species: 'kabuto', weight: 10 },
			{ species: 'relicanth', weight: 10 }, { species: 'pyukumuku', weight: 10 },
			{ species: 'corsolagalar', weight: 10 }, { species: 'arctovish', weight: 10 },
			{ species: 'qwilfishhisui', weight: 10 },
		],
		'Ultra Rare': [{ species: 'nihilego', weight: 5 }],
		'Boss': [
			{ species: 'lanturn', weight: 100 }, { species: 'qwilfish', weight: 100 },
			{ species: 'corsola', weight: 100 }, { species: 'octillery', weight: 100 },
			{ species: 'mantine', weight: 100 }, { species: 'wailord', weight: 100 },
			{ species: 'huntail', weight: 100 }, { species: 'gorebyss', weight: 100 },
			{ species: 'luvdisc', weight: 100 }, { species: 'jellicent', weight: 100 },
			{ species: 'alomomola', weight: 100 }, { species: 'dragalge', weight: 100 },
			{ species: 'barraskewda', weight: 100 }, { species: 'dondozo', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'omastar', weight: 50 }, { species: 'kabutops', weight: 50 },
			{ species: 'milotic', weight: 50 }, { species: 'relicanth', weight: 50 },
			{ species: 'eelektross', weight: 50 }, { species: 'pyukumuku', weight: 50 },
			{ species: 'dhelmise', weight: 50 }, { species: 'cursola', weight: 50 },
			{ species: 'arctovish', weight: 50 }, { species: 'basculegion', weight: 50 },
			{ species: 'overqwil', weight: 50 },
		],
		'Boss Super Rare': [{ species: 'nihilego', weight: 25 }],
		'Boss Ultra Rare': [{ species: 'kyogre', weight: 10 }],
	},
	'Mountain': {
		'Common': [
			{ species: 'pidgey', weight: 100 }, { species: 'spearow', weight: 100 },
			{ species: 'skiddo', weight: 100 }, { species: 'taillow', weight: 100 },
			{ species: 'swablu', weight: 100 }, { species: 'starly', weight: 100 },
			{ species: 'pidove', weight: 100 }, { species: 'fletchling', weight: 100 },
			{ species: 'rhyhorn', weight: 100 }, { species: 'aron', weight: 100 },
			{ species: 'roggenrola', weight: 100 },
		],
		'Uncommon': [
			{ species: 'machop', weight: 80 }, { species: 'geodude', weight: 80 },
			{ species: 'natu', weight: 80 }, { species: 'slugma', weight: 80 },
			{ species: 'rufflet', weight: 80 }, { species: 'rookidee', weight: 80 },
			{ species: 'flittle', weight: 80 }, { species: 'bombirdier', weight: 80 },
			{ species: 'vullaby', weight: 80 }, { species: 'murkrow', weight: 80 },
		],
		'Rare': [
			{ species: 'skarmory', weight: 25 }, { species: 'torchic', weight: 25 },
			{ species: 'spoink', weight: 25 }, { species: 'hawlucha', weight: 25 },
			{ species: 'nacli', weight: 25 },
		],
		'Super Rare': [
			{ species: 'larvitar', weight: 10 }, { species: 'cranidos', weight: 10 },
			{ species: 'shieldon', weight: 10 }, { species: 'gible', weight: 10 },
			{ species: 'archeops', weight: 10 }, { species: 'axew', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'tornadus', weight: 5 }, { species: 'tinglu', weight: 5 },
			{ species: 'ogerpon', weight: 5 },
		],
		'Boss': [
			{ species: 'swellow', weight: 100 }, { species: 'altaria', weight: 100 },
			{ species: 'staraptor', weight: 100 }, { species: 'unfezant', weight: 100 },
			{ species: 'braviary', weight: 100 }, { species: 'talonflame', weight: 100 },
			{ species: 'corviknight', weight: 100 }, { species: 'espathra', weight: 100 },
			{ species: 'mandibuzz', weight: 100 }, { species: 'pidgeot', weight: 100 },
			{ species: 'fearow', weight: 100 }, { species: 'skarmory', weight: 100 },
			{ species: 'aggron', weight: 100 }, { species: 'gogoat', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'braviaryhisui', weight: 50 }, { species: 'blaziken', weight: 50 },
			{ species: 'rampardos', weight: 50 }, { species: 'bastiodon', weight: 50 },
			{ species: 'hawlucha', weight: 50 }, { species: 'garganacl', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'tornadus', weight: 25 }, { species: 'tinglu', weight: 25 },
			{ species: 'ogerpon', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'hooh', weight: 10 }],
	},
	'Badlands': {
		'Common': [
			{ species: 'diglett', weight: 100 }, { species: 'geodude', weight: 100 },
			{ species: 'rhyhorn', weight: 100 }, { species: 'drilbur', weight: 100 },
			{ species: 'mudbray', weight: 100 }, { species: 'phanpy', weight: 100 },
			{ species: 'cubone', weight: 100 },
		],
		'Uncommon': [
			{ species: 'sandshrew', weight: 80 }, { species: 'numel', weight: 80 },
			{ species: 'roggenrola', weight: 80 }, { species: 'cufant', weight: 80 },
			{ species: 'sizzlipede', weight: 80 }, { species: 'capsakid', weight: 80 },
		],
		'Rare': [
			{ species: 'onix', weight: 25 }, { species: 'gligar', weight: 25 },
			{ species: 'klawf', weight: 25 }, { species: 'poltchageist', weight: 25 },
		],
		'Super Rare': [],
		'Ultra Rare': [
			{ species: 'landorus', weight: 5 }, { species: 'okidogi', weight: 5 },
		],
		'Boss': [
			{ species: 'donphan', weight: 100 }, { species: 'centiskorch', weight: 100 },
			{ species: 'scovillain', weight: 100 }, { species: 'marowak', weight: 100 },
			{ species: 'dugtrio', weight: 100 }, { species: 'golem', weight: 100 },
			{ species: 'rhyperior', weight: 100 }, { species: 'gliscor', weight: 100 },
			{ species: 'excadrill', weight: 100 }, { species: 'mudsdale', weight: 100 },
			{ species: 'copperajah', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'steelix', weight: 50 }, { species: 'sinistcha', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'landorus', weight: 25 }, { species: 'okidogi', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'groudon', weight: 10 }],
	},
	'Cave': {
		'Common': [
			{ species: 'zubat', weight: 100 }, { species: 'paras', weight: 100 },
			{ species: 'teddiursa', weight: 100 }, { species: 'whismur', weight: 100 },
			{ species: 'roggenrola', weight: 100 }, { species: 'woobat', weight: 100 },
			{ species: 'bunnelby', weight: 100 },
		],
		'Uncommon': [
			{ species: 'geodude', weight: 80 }, { species: 'makuhita', weight: 80 },
			{ species: 'nosepass', weight: 80 }, { species: 'noibat', weight: 80 },
			{ species: 'wimpod', weight: 80 }, { species: 'rockruff', weight: 80 },
		],
		'Rare': [
			{ species: 'onix', weight: 25 }, { species: 'ferroseed', weight: 25 },
			{ species: 'carbink', weight: 25 }, { species: 'nacli', weight: 25 },
			{ species: 'glimmet', weight: 25 },
		],
		'Super Rare': [{ species: 'shuckle', weight: 10 }],
		'Ultra Rare': [{ species: 'uxie', weight: 5 }],
		'Boss': [
			{ species: 'parasect', weight: 100 }, { species: 'onix', weight: 100 },
			{ species: 'crobat', weight: 100 }, { species: 'ursaring', weight: 100 },
			{ species: 'exploud', weight: 100 }, { species: 'probopass', weight: 100 },
			{ species: 'gigalith', weight: 100 }, { species: 'swoobat', weight: 100 },
			{ species: 'diggersby', weight: 100 }, { species: 'noivern', weight: 100 },
			{ species: 'golisopod', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'shuckle', weight: 50 }, { species: 'ferrothorn', weight: 50 },
			{ species: 'garganacl', weight: 50 }, { species: 'glimmora', weight: 50 },
			{ species: 'lycanroc', weight: 50 },
		],
		'Boss Super Rare': [{ species: 'uxie', weight: 25 }],
		'Boss Ultra Rare': [{ species: 'terapagos', weight: 10 }],
	},
	'Desert': {
		'Common': [
			{ species: 'sandshrew', weight: 100 }, { species: 'skorupi', weight: 100 },
			{ species: 'silicobra', weight: 100 }, { species: 'bramblin', weight: 100 },
			{ species: 'rellor', weight: 100 }, { species: 'trapinch', weight: 100 },
			{ species: 'helioptile', weight: 100 }, { species: 'cacnea', weight: 100 },
		],
		'Uncommon': [
			{ species: 'numel', weight: 80 }, { species: 'hippopotas', weight: 80 },
			{ species: 'sandile', weight: 80 }, { species: 'orthworm', weight: 80 },
			{ species: 'maractus', weight: 80 }, { species: 'gligar', weight: 80 },
			{ species: 'yamask', weight: 80 },
		],
		'Rare': [
			{ species: 'doduo', weight: 25 }, { species: 'darumaka', weight: 25 },
			{ species: 'sigilyph', weight: 25 }, { species: 'stonjourner', weight: 25 },
		],
		'Super Rare': [
			{ species: 'lileep', weight: 10 }, { species: 'anorith', weight: 10 },
			{ species: 'gible', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'regirock', weight: 5 }, { species: 'tapubulu', weight: 5 },
			{ species: 'pheromosa', weight: 5 },
		],
		'Boss': [
			{ species: 'maractus', weight: 100 }, { species: 'heliolisk', weight: 100 },
			{ species: 'flygon', weight: 100 }, { species: 'gliscor', weight: 100 },
			{ species: 'cacturne', weight: 100 }, { species: 'cofagrigus', weight: 100 },
			{ species: 'sandslash', weight: 100 }, { species: 'hippowdon', weight: 100 },
			{ species: 'drapion', weight: 100 }, { species: 'krookodile', weight: 100 },
			{ species: 'darmanitan', weight: 100 }, { species: 'sandaconda', weight: 100 },
			{ species: 'brambleghast', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'dodrio', weight: 50 }, { species: 'cradily', weight: 50 },
			{ species: 'armaldo', weight: 50 }, { species: 'garchomp', weight: 50 },
			{ species: 'sigilyph', weight: 50 }, { species: 'stonjourner', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'regirock', weight: 25 }, { species: 'tapubulu', weight: 25 },
			{ species: 'pheromosa', weight: 25 },
		],
		'Boss Ultra Rare': [],
	},
	'Ice Cave': {
		'Common': [
			{ species: 'seel', weight: 100 }, { species: 'swinub', weight: 100 },
			{ species: 'snorunt', weight: 100 }, { species: 'vanillite', weight: 100 },
			{ species: 'cubchoo', weight: 100 }, { species: 'bergmite', weight: 100 },
			{ species: 'crabrawler', weight: 100 }, { species: 'snom', weight: 100 },
		],
		'Uncommon': [
			{ species: 'slowking', weight: 80 }, { species: 'sneasel', weight: 80 },
			{ species: 'smoochum', weight: 80 }, { species: 'spheal', weight: 80 },
			{ species: 'eiscue', weight: 80 }, { species: 'cetoddle', weight: 80 },
		],
		'Rare': [
			{ species: 'lapras', weight: 25 }, { species: 'delibird', weight: 25 },
			{ species: 'cryogonal', weight: 25 },
		],
		'Super Rare': [{ species: 'amaura', weight: 10 }],
		'Ultra Rare': [
			{ species: 'articuno', weight: 5 }, { species: 'regice', weight: 5 },
		],
		'Boss': [
			{ species: 'dewgong', weight: 100 }, { species: 'glalie', weight: 100 },
			{ species: 'walrein', weight: 100 }, { species: 'weavile', weight: 100 },
			{ species: 'mamoswine', weight: 100 }, { species: 'froslass', weight: 100 },
			{ species: 'vanilluxe', weight: 100 }, { species: 'beartic', weight: 100 },
			{ species: 'cryogonal', weight: 100 }, { species: 'avalugg', weight: 100 },
			{ species: 'crabominable', weight: 100 }, { species: 'cetitan', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'jynx', weight: 50 }, { species: 'lapras', weight: 50 },
			{ species: 'glaceon', weight: 50 }, { species: 'aurorus', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'articuno', weight: 25 }, { species: 'regice', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'kyurem', weight: 10 }],
	},
	'Meadow': {
		'Common': [
			{ species: 'blitzle', weight: 100 }, { species: 'flabebe', weight: 100 },
			{ species: 'cutiefly', weight: 100 }, { species: 'gossifleur', weight: 100 },
			{ species: 'wooloo', weight: 100 }, { species: 'ledyba', weight: 100 },
			{ species: 'roselia', weight: 100 }, { species: 'cottonee', weight: 100 },
			{ species: 'minccino', weight: 100 },
		],
		'Uncommon': [
			{ species: 'ponyta', weight: 80 }, { species: 'snubbull', weight: 80 },
			{ species: 'skitty', weight: 80 }, { species: 'bouffalant', weight: 80 },
			{ species: 'smoliv', weight: 80 }, { species: 'jigglypuff', weight: 80 },
			{ species: 'mareep', weight: 80 }, { species: 'ralts', weight: 80 },
			{ species: 'glameow', weight: 80 }, { species: 'oricorio', weight: 80 },
		],
		'Rare': [
			{ species: 'tauros', weight: 25 }, { species: 'eevee', weight: 25 },
			{ species: 'miltank', weight: 25 }, { species: 'spinda', weight: 25 },
			{ species: 'applin', weight: 25 }, { species: 'sprigatito', weight: 25 },
			{ species: 'volbeat', weight: 25 }, { species: 'illumise', weight: 25 },
		],
		'Super Rare': [
			{ species: 'chansey', weight: 10 }, { species: 'sylveon', weight: 10 },
		],
		'Ultra Rare': [{ species: 'meloetta', weight: 5 }],
		'Boss': [
			{ species: 'ledian', weight: 100 }, { species: 'granbull', weight: 100 },
			{ species: 'delcatty', weight: 100 }, { species: 'roserade', weight: 100 },
			{ species: 'cinccino', weight: 100 }, { species: 'bouffalant', weight: 100 },
			{ species: 'arboliva', weight: 100 }, { species: 'tauros', weight: 100 },
			{ species: 'miltank', weight: 100 }, { species: 'gardevoir', weight: 100 },
			{ species: 'purugly', weight: 100 }, { species: 'zebstrika', weight: 100 },
			{ species: 'florges', weight: 100 }, { species: 'ribombee', weight: 100 },
			{ species: 'dubwool', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'lilliganthisui', weight: 50 }, { species: 'blissey', weight: 50 },
			{ species: 'sylveon', weight: 50 }, { species: 'flapple', weight: 50 },
			{ species: 'appletun', weight: 50 }, { species: 'meowscarada', weight: 50 },
			{ species: 'hydrapple', weight: 50 },
		],
		'Boss Super Rare': [{ species: 'meloetta', weight: 25 }],
		'Boss Ultra Rare': [{ species: 'shaymin', weight: 10 }],
	},
	'Power Plant': {
		'Common': [
			{ species: 'pikachu', weight: 100 }, { species: 'voltorb', weight: 100 },
			{ species: 'electrike', weight: 100 }, { species: 'shinx', weight: 100 },
			{ species: 'dedenne', weight: 100 }, { species: 'grubbin', weight: 100 },
			{ species: 'pawmi', weight: 100 }, { species: 'tadbulb', weight: 100 },
		],
		'Uncommon': [
			{ species: 'magnemite', weight: 80 }, { species: 'electabuzz', weight: 80 },
			{ species: 'plusle', weight: 80 }, { species: 'minun', weight: 80 },
			{ species: 'pachirisu', weight: 80 }, { species: 'emolga', weight: 80 },
			{ species: 'togedemaru', weight: 80 },
		],
		'Rare': [
			{ species: 'mareep', weight: 25 }, { species: 'rotom', weight: 25 },
		],
		'Super Rare': [
			{ species: 'jolteon', weight: 10 }, { species: 'voltorbhisui', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'raikou', weight: 5 }, { species: 'thundurus', weight: 5 },
			{ species: 'xurkitree', weight: 5 }, { species: 'zeraora', weight: 5 },
			{ species: 'regieleki', weight: 5 },
		],
		'Boss': [
			{ species: 'raichu', weight: 100 }, { species: 'manectric', weight: 100 },
			{ species: 'luxray', weight: 100 }, { species: 'magnezone', weight: 100 },
			{ species: 'electivire', weight: 100 }, { species: 'dedenne', weight: 100 },
			{ species: 'vikavolt', weight: 100 }, { species: 'togedemaru', weight: 100 },
			{ species: 'pawmot', weight: 100 }, { species: 'bellibolt', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'jolteon', weight: 50 }, { species: 'ampharos', weight: 50 },
			{ species: 'electrodehisui', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'zapdos', weight: 25 }, { species: 'raikou', weight: 25 },
			{ species: 'thundurus', weight: 25 }, { species: 'xurkitree', weight: 25 },
			{ species: 'zeraora', weight: 25 }, { species: 'regieleki', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'zekrom', weight: 10 }],
	},
	'Volcano': {
		'Common': [
			{ species: 'vulpix', weight: 100 }, { species: 'growlithe', weight: 100 },
			{ species: 'ponyta', weight: 100 }, { species: 'slugma', weight: 100 },
			{ species: 'numel', weight: 100 }, { species: 'spoink', weight: 100 },
			{ species: 'swablu', weight: 100 }, { species: 'rolycoly', weight: 100 },
			{ species: 'poochyena', weight: 100 },
		],
		'Uncommon': [
			{ species: 'magmar', weight: 80 }, { species: 'meditite', weight: 80 },
			{ species: 'torkoal', weight: 80 }, { species: 'pansear', weight: 80 },
			{ species: 'heatmor', weight: 80 }, { species: 'salandit', weight: 80 },
			{ species: 'turtonator', weight: 80 }, { species: 'diglettalola', weight: 80 },
		],
		'Rare': [
			{ species: 'charmander', weight: 25 }, { species: 'cyndaquil', weight: 25 },
			{ species: 'chimchar', weight: 25 }, { species: 'tepig', weight: 25 },
			{ species: 'fennekin', weight: 25 }, { species: 'litten', weight: 25 },
			{ species: 'scorbunny', weight: 25 }, { species: 'charcadet', weight: 25 },
		],
		'Super Rare': [
			{ species: 'flareon', weight: 10 }, { species: 'larvesta', weight: 10 },
			{ species: 'growlithehisui', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'entei', weight: 5 }, { species: 'heatran', weight: 5 },
			{ species: 'volcanion', weight: 5 }, { species: 'chiyu', weight: 5 },
		],
		'Boss': [
			{ species: 'ninetales', weight: 100 }, { species: 'arcanine', weight: 100 },
			{ species: 'rapidash', weight: 100 }, { species: 'magcargo', weight: 100 },
			{ species: 'camerupt', weight: 100 }, { species: 'torkoal', weight: 100 },
			{ species: 'magmortar', weight: 100 }, { species: 'simisear', weight: 100 },
			{ species: 'heatmor', weight: 100 }, { species: 'salazzle', weight: 100 },
			{ species: 'turtonator', weight: 100 }, { species: 'coalossal', weight: 100 },
			{ species: 'dugtrioalola', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'charizard', weight: 50 }, { species: 'flareon', weight: 50 },
			{ species: 'typhlosion', weight: 50 }, { species: 'infernape', weight: 50 },
			{ species: 'emboar', weight: 50 }, { species: 'volcarona', weight: 50 },
			{ species: 'delphox', weight: 50 }, { species: 'incineroar', weight: 50 },
			{ species: 'cinderace', weight: 50 }, { species: 'armarouge', weight: 50 },
			{ species: 'arcaninehisui', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'moltres', weight: 25 }, { species: 'entei', weight: 25 },
			{ species: 'heatran', weight: 25 }, { species: 'volcanion', weight: 25 },
			{ species: 'chiyu', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'reshiram', weight: 10 }],
	},
	'Graveyard': {
		'Common': [
			{ species: 'gastly', weight: 100 }, { species: 'shuppet', weight: 100 },
			{ species: 'duskull', weight: 100 }, { species: 'drifloon', weight: 100 },
			{ species: 'litwick', weight: 100 }, { species: 'phantump', weight: 100 },
			{ species: 'pumpkaboo', weight: 100 }, { species: 'greavard', weight: 100 },
		],
		'Uncommon': [
			{ species: 'misdreavus', weight: 80 }, { species: 'sableye', weight: 80 },
			{ species: 'yamask', weight: 80 }, { species: 'sinistea', weight: 80 },
			{ species: 'indeedee', weight: 80 }, { species: 'fluttermane', weight: 80 },
		],
		'Rare': [
			{ species: 'spiritomb', weight: 25 }, { species: 'golett', weight: 25 },
			{ species: 'honedge', weight: 25 }, { species: 'mimikyu', weight: 25 },
		],
		'Super Rare': [
			{ species: 'runerigus', weight: 10 }, { species: 'ceruledge', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'marshadow', weight: 5 }, { species: 'spectrier', weight: 5 },
		],
		'Boss': [
			{ species: 'gengar', weight: 100 }, { species: 'banette', weight: 100 },
			{ species: 'dusknoir', weight: 100 }, { species: 'drifblim', weight: 100 },
			{ species: 'chandelure', weight: 100 }, { species: 'trevenant', weight: 100 },
			{ species: 'gourgeist', weight: 100 }, { species: 'houndstone', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'mismagius', weight: 50 }, { species: 'golurk', weight: 50 },
			{ species: 'aegislash', weight: 50 }, { species: 'mimikyu', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'marshadow', weight: 25 }, { species: 'spectrier', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'giratina', weight: 10 }],
	},
	'Dojo': {
		'Common': [
			{ species: 'mankey', weight: 100 }, { species: 'machop', weight: 100 },
			{ species: 'makuhita', weight: 100 }, { species: 'meditite', weight: 100 },
			{ species: 'croagunk', weight: 100 }, { species: 'mienfoo', weight: 100 },
			{ species: 'crabrawler', weight: 100 }, { species: 'passimian', weight: 100 },
		],
		'Uncommon': [
			{ species: 'tyrogue', weight: 80 }, { species: 'riolu', weight: 80 },
			{ species: 'stufful', weight: 80 }, { species: 'falinks', weight: 80 },
		],
		'Rare': [
			{ species: 'scraggy', weight: 25 }, { species: 'hawlucha', weight: 25 },
			{ species: 'pancham', weight: 25 },
		],
		'Super Rare': [
			{ species: 'gallade', weight: 10 }, { species: 'pangoro', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'terrakion', weight: 5 }, { species: 'buzzwole', weight: 5 },
		],
		'Boss': [
			{ species: 'primeape', weight: 100 }, { species: 'machamp', weight: 100 },
			{ species: 'hariyama', weight: 100 }, { species: 'medicham', weight: 100 },
			{ species: 'toxicroak', weight: 100 }, { species: 'mienshao', weight: 100 },
			{ species: 'crabominable', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'lucario', weight: 50 }, { species: 'bewear', weight: 50 },
			{ species: 'pangoro', weight: 50 }, { species: 'annihilape', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'terrakion', weight: 25 }, { species: 'buzzwole', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'kubfu', weight: 10 }],
	},
	'Factory': {
		'Common': [
			{ species: 'klink', weight: 100 }, { species: 'bronzor', weight: 100 },
			{ species: 'magnemite', weight: 100 }, { species: 'voltorb', weight: 100 },
			{ species: 'grimer', weight: 100 }, { species: 'koffing', weight: 100 },
			{ species: 'varoom', weight: 100 },
		],
		'Uncommon': [
			{ species: 'geodude', weight: 80 }, { species: 'porygon', weight: 80 },
			{ species: 'trubbish', weight: 80 }, { species: 'pawniard', weight: 80 },
		],
		'Rare': [
			{ species: 'solrock', weight: 25 }, { species: 'lunatone', weight: 25 },
			{ species: 'golett', weight: 25 }, { species: 'duraludon', weight: 25 },
		],
		'Super Rare': [
			{ species: 'porygon2', weight: 10 }, { species: 'rotom', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'genesect', weight: 5 }, { species: 'magearna', weight: 5 },
		],
		'Boss': [
			{ species: 'klinklang', weight: 100 }, { species: 'bronzong', weight: 100 },
			{ species: 'magnezone', weight: 100 }, { species: 'electrode', weight: 100 },
			{ species: 'muk', weight: 100 }, { species: 'weezing', weight: 100 },
			{ species: 'garbodor', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'porygonz', weight: 50 }, { species: 'bisharp', weight: 50 },
			{ species: 'golurk', weight: 50 }, { species: 'revavroom', weight: 50 },
			{ species: 'archaludon', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'genesect', weight: 25 }, { species: 'magearna', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'mewtwo', weight: 10 }],
	},
	'Ancient Ruins': {
		'Common': [
			{ species: 'natu', weight: 100 }, { species: 'sigilyph', weight: 100 },
			{ species: 'yamask', weight: 100 }, { species: 'elgyem', weight: 100 },
			{ species: 'inkay', weight: 100 }, { species: 'carbink', weight: 100 },
			{ species: 'tinkatink', weight: 100 },
		],
		'Uncommon': [
			{ species: 'spoink', weight: 80 }, { species: 'mimejr', weight: 80 },
			{ species: 'baltoy', weight: 80 }, { species: 'archen', weight: 80 },
			{ species: 'golett', weight: 80 },
		],
		'Rare': [
			{ species: 'unown', weight: 25 }, { species: 'solrock', weight: 25 },
			{ species: 'lunatone', weight: 25 }, { species: 'gimmighoul', weight: 25 },
		],
		'Super Rare': [
			{ species: 'claydol', weight: 10 }, { species: 'cofagrigus', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'registeel', weight: 5 }, { species: 'jirachi', weight: 5 },
			{ species: 'palkia', weight: 5 },
		],
		'Boss': [
			{ species: 'xatu', weight: 100 }, { species: 'cofagrigus', weight: 100 },
			{ species: 'beheeyem', weight: 100 }, { species: 'malamar', weight: 100 },
			{ species: 'diancie', weight: 100 }, { species: 'tinkaton', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'claydol', weight: 50 }, { species: 'archeops', weight: 50 },
			{ species: 'golurk', weight: 50 }, { species: 'gholdengo', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'registeel', weight: 25 }, { species: 'jirachi', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'regigigas', weight: 10 }],
	},
	'Wasteland': {
		'Common': [
			{ species: 'vibrava', weight: 100 }, { species: 'flygon', weight: 100 },
			{ species: 'swablu', weight: 100 }, { species: 'altaria', weight: 100 },
			{ species: 'axew', weight: 100 }, { species: 'fraxure', weight: 100 },
			{ species: 'haxorus', weight: 100 }, { species: 'deino', weight: 100 },
		],
		'Uncommon': [
			{ species: 'goomy', weight: 80 }, { species: 'sliggoo', weight: 80 },
			{ species: 'goodra', weight: 80 }, { species: 'jangmoo', weight: 80 },
			{ species: 'hakamoo', weight: 80 }, { species: 'kommoo', weight: 80 },
		],
		'Rare': [
			{ species: 'larvitar', weight: 25 }, { species: 'pupitar', weight: 25 },
			{ species: 'tyranitar', weight: 25 }, { species: 'bagon', weight: 25 },
			{ species: 'shelgon', weight: 25 }, { species: 'salamence', weight: 25 },
			{ species: 'gible', weight: 25 }, { species: 'gabite', weight: 25 },
			{ species: 'garchomp', weight: 25 },
		],
		'Super Rare': [
			{ species: 'zweilous', weight: 10 }, { species: 'hydreigon', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'zygarde', weight: 5 }, { species: 'rayquaza', weight: 5 },
		],
		'Boss': [
			{ species: 'flygon', weight: 100 }, { species: 'altaria', weight: 100 },
			{ species: 'haxorus', weight: 100 }, { species: 'goodra', weight: 100 },
			{ species: 'kommoo', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'tyranitar', weight: 50 }, { species: 'salamence', weight: 50 },
			{ species: 'garchomp', weight: 50 }, { species: 'hydreigon', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'zygarde', weight: 25 }, { species: 'rayquaza', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'eternatus', weight: 10 }],
	},
	'Abyss': {
		'Common': [
			{ species: 'murkrow', weight: 100 }, { species: 'houndour', weight: 100 },
			{ species: 'houndoom', weight: 100 }, { species: 'sableye', weight: 100 },
			{ species: 'purrloin', weight: 100 }, { species: 'liepard', weight: 100 },
			{ species: 'pawniard', weight: 100 }, { species: 'bisharp', weight: 100 },
			{ species: 'nickit', weight: 100 }, { species: 'thievul', weight: 100 },
			{ species: 'impidimp', weight: 100 }, { species: 'morgrem', weight: 100 },
			{ species: 'grimmsnarl', weight: 100 }, { species: 'maschiff', weight: 100 },
			{ species: 'mabosstiff', weight: 100 },
		],
		'Uncommon': [
			{ species: 'absol', weight: 80 }, { species: 'zorua', weight: 80 },
			{ species: 'deino', weight: 80 }, { species: 'zweilous', weight: 80 },
			{ species: 'kingambit', weight: 80 },
		],
		'Rare': [
			{ species: 'spiritomb', weight: 25 }, { species: 'umbreon', weight: 25 },
		],
		'Super Rare': [
			{ species: 'zoroark', weight: 10 }, { species: 'hydreigon', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'darkrai', weight: 5 }, { species: 'moltresgalar', weight: 5 },
		],
		'Boss': [
			{ species: 'houndoom', weight: 100 }, { species: 'sableye', weight: 100 },
			{ species: 'absol', weight: 100 }, { species: 'grimmsnarl', weight: 100 },
			{ species: 'mabosstiff', weight: 100 }, { species: 'kingambit', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'moltres', weight: 50 }, { species: 'zoroark', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'darkrai', weight: 25 }, { species: 'moltresgalar', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'yveltal', weight: 10 }],
	},
	'Space': {
		'Common': [
			{ species: 'clefairy', weight: 100 }, { species: 'jigglypuff', weight: 100 },
			{ species: 'lunatone', weight: 100 }, { species: 'solrock', weight: 100 },
			{ species: 'bronzor', weight: 100 }, { species: 'elgyem', weight: 100 },
			{ species: 'minior', weight: 100 },
		],
		'Uncommon': [
			{ species: 'staryu', weight: 80 }, { species: 'baltoy', weight: 80 },
			{ species: 'chingling', weight: 80 }, { species: 'munna', weight: 80 },
			{ species: 'dedenne', weight: 80 },
		],
		'Rare': [
			{ species: 'clefable', weight: 25 }, { species: 'natu', weight: 25 },
			{ species: 'snorunt', weight: 25 }, { species: 'froslass', weight: 25 },
		],
		'Super Rare': [
			{ species: 'jirachi', weight: 10 }, { species: 'beheeyem', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'deoxys', weight: 5 }, { species: 'celesteela', weight: 5 },
		],
		'Boss': [
			{ species: 'clefable', weight: 100 }, { species: 'claydol', weight: 100 },
			{ species: 'beheeyem', weight: 100 }, { species: 'bronzong', weight: 100 },
			{ species: 'minior', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'jirachi', weight: 50 }, { species: 'togekiss', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'deoxys', weight: 25 }, { species: 'celesteela', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'rayquaza', weight: 10 }],
	},
	'Construction Site': {
		'Common': [
			{ species: 'machop', weight: 100 }, { species: 'machoke', weight: 100 },
			{ species: 'magnemite', weight: 100 }, { species: 'magneton', weight: 100 },
			{ species: 'drilbur', weight: 100 }, { species: 'excadrill', weight: 100 },
			{ species: 'timburr', weight: 100 }, { species: 'gurdurr', weight: 100 },
		],
		'Uncommon': [
			{ species: 'grimer', weight: 80 }, { species: 'muk', weight: 80 },
			{ species: 'koffing', weight: 80 }, { species: 'weezing', weight: 80 },
			{ species: 'rhyhorn', weight: 80 }, { species: 'rhydon', weight: 80 },
			{ species: 'scraggy', weight: 80 }, { species: 'scrafty', weight: 80 },
		],
		'Rare': [
			{ species: 'onix', weight: 25 }, { species: 'hitmonlee', weight: 25 },
			{ species: 'hitmonchan', weight: 25 }, { species: 'duraludon', weight: 25 },
			{ species: 'meowthgalar', weight: 25 }, { species: 'perrserker', weight: 25 },
		],
		'Super Rare': [
			{ species: 'ditto', weight: 10 }, { species: 'hitmontop', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'cobalion', weight: 5 }, { species: 'stakataka', weight: 5 },
		],
		'Boss': [
			{ species: 'machamp', weight: 100 }, { species: 'conkeldurr', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'perrserker', weight: 50 }, { species: 'archaludon', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'cobalion', weight: 25 }, { species: 'stakataka', weight: 25 },
		],
		'Boss Ultra Rare': [],
	},
	'Jungle': {
		'Common': [
			{ species: 'paras', weight: 100 }, { species: 'exeggcute', weight: 100 },
			{ species: 'tropius', weight: 100 }, { species: 'aipom', weight: 100 },
			{ species: 'mankey', weight: 100 }, { species: 'pansage', weight: 100 },
			{ species: 'sewaddle', weight: 100 }, { species: 'bounsweet', weight: 100 },
			{ species: 'fomantis', weight: 100 }, { species: 'toedscool', weight: 100 },
		],
		'Uncommon': [
			{ species: 'scyther', weight: 80 }, { species: 'heracross', weight: 80 },
			{ species: 'tangela', weight: 80 }, { species: 'pinsir', weight: 80 },
			{ species: 'shroomish', weight: 80 }, { species: 'breloom', weight: 80 },
		],
		'Rare': [
			{ species: 'chikorita', weight: 25 }, { species: 'treecko', weight: 25 },
			{ species: 'turtwig', weight: 25 }, { species: 'rowlet', weight: 25 },
			{ species: 'grookey', weight: 25 }, { species: 'sprigatito', weight: 25 },
		],
		'Super Rare': [
			{ species: 'durant', weight: 10 }, { species: 'komala', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'wochien', weight: 5 }, { species: 'tapukoko', weight: 5 },
		],
		'Boss': [
			{ species: 'exeggutor', weight: 100 }, { species: 'breloom', weight: 100 },
			{ species: 'vespiquen', weight: 100 }, { species: 'lurantis', weight: 100 },
			{ species: 'tsareena', weight: 100 }, { species: 'toedscruel', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'scizor', weight: 50 }, { species: 'heracross', weight: 50 },
			{ species: 'meganium', weight: 50 }, { species: 'sceptile', weight: 50 },
			{ species: 'torterra', weight: 50 }, { species: 'rillaboom', weight: 50 },
			{ species: 'meowscarada', weight: 50 }, { species: 'kleavor', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'wochien', weight: 25 }, { species: 'tapukoko', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'mew', weight: 10 }],
	},
	'Fairy Cave': {
		'Common': [
			{ species: 'clefairy', weight: 100 }, { species: 'togepi', weight: 100 },
			{ species: 'snubbull', weight: 100 }, { species: 'ralts', weight: 100 },
			{ species: 'marill', weight: 100 }, { species: 'mawile', weight: 100 },
			{ species: 'cottonee', weight: 100 }, { species: 'flabebe', weight: 100 },
			{ species: 'sylveon', weight: 100 }, { species: 'carbink', weight: 100 },
		],
		'Uncommon': [
			{ species: 'mimejr', weight: 80 }, { species: 'togekiss', weight: 80 },
			{ species: 'morganite', weight: 80 }, { species: 'ribombee', weight: 80 },
			{ species: 'comfey', weight: 80 }, { species: 'hatenna', weight: 80 },
		],
		'Rare': [
			{ species: 'igglybuff', weight: 25 }, { species: 'snubbull', weight: 25 },
			{ species: 'azumarill', weight: 25 }, { species: 'gardevoir', weight: 25 },
		],
		'Super Rare': [
			{ species: 'togekiss', weight: 10 }, { species: 'florges', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'xerneas', weight: 5 }, { species: 'terapagos', weight: 5 },
		],
		'Boss': [
			{ species: 'clefable', weight: 100 }, { species: 'wigglytuff', weight: 100 },
			{ species: 'granbull', weight: 100 }, { species: 'gardevoir', weight: 100 },
			{ species: 'togekiss', weight: 100 }, { species: 'diancie', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'sylveon', weight: 50 }, { species: 'florges', weight: 50 },
			{ species: 'grimmsnarl', weight: 50 }, { species: 'hatterene', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'xerneas', weight: 25 }, { species: 'terapagos', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'zacian', weight: 10 }],
	},
	'Temple': {
		'Common': [
			{ species: 'gastly', weight: 100 }, { species: 'natu', weight: 100 },
			{ species: 'baltoy', weight: 100 }, { species: 'yamask', weight: 100 },
			{ species: 'elgyem', weight: 100 }, { species: 'litwick', weight: 100 },
			{ species: 'inkay', weight: 100 }, { species: 'sinistea', weight: 100 },
		],
		'Uncommon': [
			{ species: 'slowpoke', weight: 80 }, { species: 'sigilyph', weight: 80 },
			{ species: 'woobat', weight: 80 }, { species: 'golett', weight: 80 },
			{ species: 'pumpkaboo', weight: 80 },
		],
		'Rare': [
			{ species: 'xatu', weight: 25 }, { species: 'claydol', weight: 25 },
			{ species: 'cofagrigus', weight: 25 }, { species: 'runerigus', weight: 25 },
		],
		'Super Rare': [
			{ species: 'beheeyem', weight: 10 }, { species: 'golurk', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'hoopa', weight: 5 }, { species: 'tapulele', weight: 5 },
		],
		'Boss': [
			{ species: 'gengar', weight: 100 }, { species: 'xatu', weight: 100 },
			{ species: 'claydol', weight: 100 }, { species: 'cofagrigus', weight: 100 },
			{ species: 'beheeyem', weight: 100 }, { species: 'chandelure', weight: 100 },
			{ species: 'malamar', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'golurk', weight: 50 }, { species: 'aegislash', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'hoopa', weight: 25 }, { species: 'tapulele', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'necrozma', weight: 10 }],
	},
	'Slum': {
		'Common': [
			{ species: 'rattata', weight: 100 }, { species: 'grimer', weight: 100 },
			{ species: 'koffing', weight: 100 }, { species: 'trubbish', weight: 100 },
			{ species: 'zigzagoon', weight: 100 }, { species: 'nickit', weight: 100 },
			{ species: 'impidimp', weight: 100 }, { species: 'maschiff', weight: 100 },
		],
		'Uncommon': [
			{ species: 'meowth', weight: 80 }, { species: 'corphish', weight: 80 },
			{ species: 'pawniard', weight: 80 }, { species: 'morpeko', weight: 80 },
			{ species: 'zigzagoongalar', weight: 80 },
		],
		'Rare': [
			{ species: 'scrafty', weight: 25 }, { species: 'incineroar', weight: 25 },
			{ species: 'obstagoon', weight: 25 },
		],
		'Super Rare': [
			{ species: 'toxicroak', weight: 10 }, { species: 'ditto', weight: 10 },
		],
		'Ultra Rare': [],
		'Boss': [
			{ species: 'raticate', weight: 100 }, { species: 'muk', weight: 100 },
			{ species: 'weezing', weight: 100 }, { species: 'garbodor', weight: 100 },
			{ species: 'liepard', weight: 100 }, { species: 'thievul', weight: 100 },
			{ species: 'grimmsnarl', weight: 100 }, { species: 'mabosstiff', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'persian', weight: 50 }, { species: 'obstagoon', weight: 50 },
		],
		'Boss Super Rare': [],
		'Boss Ultra Rare': [],
	},
	'Snowy Forest': {
		'Common': [
			{ species: 'snover', weight: 100 }, { species: 'swinub', weight: 100 },
			{ species: 'cubchoo', weight: 100 }, { species: 'bergmite', weight: 100 },
			{ species: 'delibird', weight: 100 }, { species: 'snom', weight: 100 },
			{ species: 'cetoddle', weight: 100 },
		],
		'Uncommon': [
			{ species: 'sneasel', weight: 80 }, { species: 'stantler', weight: 80 },
			{ species: 'piloswine', weight: 80 }, { species: 'froslass', weight: 80 },
			{ species: 'zoruahisui', weight: 80 },
		],
		'Rare': [
			{ species: 'lapras', weight: 25 }, { species: 'absol', weight: 25 },
			{ species: 'cryogonal', weight: 25 }, { species: 'frosmoth', weight: 25 },
		],
		'Super Rare': [
			{ species: 'glaceon', weight: 10 }, { species: 'zoroarkhisui', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'calyrex', weight: 5 }, { species: 'enamorus', weight: 5 },
		],
		'Boss': [
			{ species: 'abomasnow', weight: 100 }, { species: 'mamoswine', weight: 100 },
			{ species: 'beartic', weight: 100 }, { species: 'frosmoth', weight: 100 },
			{ species: 'cetitan', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'wyrdeer', weight: 50 }, { species: 'weavile', weight: 50 },
			{ species: 'lapras', weight: 50 }, { species: 'glaceon', weight: 50 },
			{ species: 'zoroarkhisui', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'calyrex', weight: 25 }, { species: 'enamorus', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'articuno', weight: 10 }],
	},
	'Island': {
		'Common': [
			{ species: 'exeggcute', weight: 100 }, { species: 'rattataalola', weight: 100 },
			{ species: 'sandshrewalola', weight: 100 }, { species: 'vulpixalola', weight: 100 },
			{ species: 'cutiefly', weight: 100 }, { species: 'comfey', weight: 100 },
			{ species: 'crabrawler', weight: 100 }, { species: 'bruxish', weight: 100 },
		],
		'Uncommon': [
			{ species: 'meowthalola', weight: 80 }, { species: 'oricorio', weight: 80 },
			{ species: 'wishiwashi', weight: 80 }, { species: 'turtonator', weight: 80 },
			{ species: 'togedemaru', weight: 80 },
		],
		'Rare': [
			{ species: 'diglettalola', weight: 25 }, { species: 'geodudealola', weight: 25 },
			{ species: 'grimeralola', weight: 25 }, { species: 'stufful', weight: 25 },
		],
		'Super Rare': [
			{ species: 'exeggutoralola', weight: 10 }, { species: 'komala', weight: 10 },
		],
		'Ultra Rare': [
			{ species: 'solgaleo', weight: 5 }, { species: 'victini', weight: 5 },
		],
		'Boss': [
			{ species: 'exeggutoralola', weight: 100 }, { species: 'ribombee', weight: 100 },
			{ species: 'comfey', weight: 100 }, { species: 'crabominable', weight: 100 },
			{ species: 'bruxish', weight: 100 },
		],
		'Boss Rare': [
			{ species: 'bewear', weight: 50 }, { species: 'ninetalesalola', weight: 50 },
			{ species: 'mukalola', weight: 50 }, { species: 'golemalola', weight: 50 },
		],
		'Boss Super Rare': [
			{ species: 'solgaleo', weight: 25 }, { species: 'victini', weight: 25 },
		],
		'Boss Ultra Rare': [{ species: 'tapubulu', weight: 10 }],
	},
	'Laboratory': {
		'Common': [
			{ species: 'magnemite', weight: 100 }, { species: 'magneton', weight: 100 },
			{ species: 'grimer', weight: 100 }, { species: 'muk', weight: 100 },
			{ species: 'voltorb', weight: 100 }, { species: 'electrode', weight: 100 },
			{ species: 'bronzor', weight: 100 }, { species: 'bronzong', weight: 100 },
			{ species: 'klink', weight: 100 }, { species: 'klang', weight: 100 },
			{ species: 'klinklang', weight: 100 },
		],
		'Uncommon': [
			{ species: 'solosis', weight: 80 }, { species: 'duosion', weight: 80 },
			{ species: 'reuniclus', weight: 80 },
		],
		'Rare': [
			{ species: 'ditto', weight: 25 }, { species: 'porygon', weight: 25 },
			{ species: 'porygon2', weight: 25 }, { species: 'rotom', weight: 25 },
			{ species: 'typenull', weight: 25 }, { species: 'castform', weight: 25 },
		],
		'Super Rare': [],
		'Ultra Rare': [{ species: 'mewtwo', weight: 5 }],
		'Boss': [
			{ species: 'muk', weight: 100 }, { species: 'electrode', weight: 100 },
			{ species: 'bronzong', weight: 100 }, { species: 'magnezone', weight: 100 },
			{ species: 'porygonz', weight: 100 }, { species: 'reuniclus', weight: 100 },
			{ species: 'klinklang', weight: 100 }, { species: 'rotom', weight: 100 },
		],
		'Boss Rare': [{ species: 'silvally', weight: 50 }],
		'Boss Super Rare': [{ species: 'zygarde', weight: 25 }],
		'Boss Ultra Rare': [{ species: 'mewtwo', weight: 10 }],
	},
};
