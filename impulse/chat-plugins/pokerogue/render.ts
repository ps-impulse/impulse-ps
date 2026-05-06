import { Utils } from '../../../lib';
import { Table } from '../../utils';
import { SHOP_ITEMS, ROTATIONAL_ITEM_POOL } from './items';
import { LEGENDARY_TAGS, type PokemonEntry, type PokeRogueState } from './types';
import { savedData } from './state';
import { expForLevel, getLevelUpMoves } from './pokemon';

export function refreshGamePage(user: User): void {
	for (const conn of user.connections) {
		if (conn.openPages?.has('pokerogue')) {
			Chat.parse(`/join view-pokerogue`, null, user, conn);
		}
	}
}

const PAGE_REFRESH_SECONDS = 20;

// ─── Sprite / Icon Helpers ────────────────────────────────────────────────────

function itemURLFormat(item: string): string {
	return item.replaceAll(/[^a-zA-Z0-9\s-]+/g, '').toLowerCase().replaceAll(' ', '-');
}

const SPRITE_ID_OVERRIDES: { [id: string]: string } = {
	floetteeternal: 'floette',
	eternatuseternamax: 'eternatus',
	bloodmoonursaluna: 'ursaluna',
	ursalunabloodmoon: 'ursaluna',
};

function getSprite(species: string, size = 80): string {
	const id = toID(species);
	const sp = Dex.species.get(id);
	const name = sp.name || species;
	const altName = Utils.escapeHTML(name);
	const rawId = (sp.exists ? (sp.spriteid || id) : id);
	const spriteId = SPRITE_ID_OVERRIDES[id] || SPRITE_ID_OVERRIDES[rawId] || rawId;
	const src = `https://play.pokemonshowdown.com/sprites/home-centered/${spriteId}.png`;
	const fallback = `https://play.pokemonshowdown.com/sprites/gen5/${spriteId}.png`;
	const onerror = ` onerror="this.onerror=function(){this.style.display='none'};this.src='${fallback}'"`;
	return `<img src="${src}"${onerror} width="${size}" height="${size}" alt="${altName} sprite" class="pr-mon-img" style="width:${size}px;height:${size}px" />`;
}

function getShopItemIcon(icon: string, size = 20): string {
	const url = `https://www.smogon.com/forums/media/minisprites/${itemURLFormat(icon)}.png`;
	return `<img src="${Utils.escapeHTML(url)}" width="${size}" height="${size}" class="pr-shop-icon" onerror="this.style.display='none'" />`;
}

function getPokeballInfo(speciesId: string, ball?: string): { src: string, alt: string } {
	const BASE = 'https://raw.githubusercontent.com/smogon/sprites/master/src/minisprites/items/';
	if (ball === 'masterball') return { src: `${BASE}i1.png`, alt: 'Master Ball' };
	if (ball === 'ultraball') return { src: `${BASE}i2.png`, alt: 'Ultra Ball' };
	if (ball === 'greatball') return { src: `${BASE}i3.png`, alt: 'Great Ball' };
	if (ball === 'pokeball') return { src: `${BASE}i4.png`, alt: 'Poké Ball' };
	const sp = Dex.species.get(toID(speciesId));
	if (sp.tags?.some(tag => LEGENDARY_TAGS.has(tag))) return { src: `${BASE}i1.png`, alt: 'Master Ball' };
	if (sp.exists) {
		const bs = sp.baseStats ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
		const bst = bs.hp + bs.atk + bs.def + bs.spa + bs.spd + bs.spe;
		if (bst >= 580) return { src: `${BASE}i2.png`, alt: 'Ultra Ball' };
		if (bst >= 480) return { src: `${BASE}i3.png`, alt: 'Great Ball' };
	}
	return { src: `${BASE}i4.png`, alt: 'Poké Ball' };
}

export function getSpriteWithBall(species: string, size = 80, ball?: string): string {
	const ballInfo = getPokeballInfo(species, ball);
	return `<div class="pr-sprite-wrap" style="width:${size}px;height:${size}px;flex-shrink:0;margin:0 auto;">` +
		getSprite(species, size) +
		`<img src="${ballInfo.src}" alt="${Utils.escapeHTML(ballInfo.alt)}" class="pr-pokeball-overlay" />` +
		`</div>`;
}

// ─── Type / Color Helpers ─────────────────────────────────────────────────────

function typeColor(type: string): string {
	const colors: Record<string, string> = {
		Normal: '9fa19f', Fire: 'e62829', Water: '2980ef', Grass: '3fa129', Electric: 'fac000',
		Ice: '3dcef3', Fighting: 'ff8000', Poison: '9141cb', Ground: '915121', Flying: '81b9ef',
		Psychic: 'ef4179', Bug: '91a119', Rock: 'afa981', Ghost: '704170', Dragon: '5060e1',
		Dark: '624d4e', Steel: '60a1b8', Fairy: 'ef70ef',
	};
	return colors[type] ?? '68a090';
}

function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	const luma = 0.299 * r + 0.587 * g + 0.114 * b;
	return luma > 130 ? '333333' : 'ffffff';
}

export function renderTypeBadge(types: string[], large = false): string {
	return types.map(t => {
		const color = typeColor(t);
		const textColor = getContrastColor(color);
		return `<span class="pr-type" style="background:#${color};color:#${textColor};font-size:${large ? '10px' : '9px'}">${t}</span>`;
	}).join(' ');
}

// ─── Primitive UI Helpers ─────────────────────────────────────────────────────

function renderBtn(cmd: string | null, label: string, className = 'pr-btn', style = '', disabled = false): string {
	let buf = `<button`;
	if (cmd) buf += ` name="send" value="${cmd}"`;
	if (className) buf += ` class="${className}"`;
	if (style) buf += ` style="${style}"`;
	if (disabled) buf += ` disabled`;
	buf += `>${label}</button>`;
	return buf;
}

function renderChoiceRow(spriteHtml: string, flexHtml: string, actionBtnHtml: string, extraStyle = ''): string {
	return `<div class="pr-choice-row" ${extraStyle ? `style="${extraStyle}"` : ''}>${spriteHtml}<div style="flex:1;min-width:0">${flexHtml}</div>${actionBtnHtml}</div>`;
}

function renderGuidePanel(content: string): string {
	return `<div style="background:rgba(0,0,0,0.15);padding:11px 13px;border-radius:8px;margin-bottom:8px;font-size:12px;line-height:1.55">${content}</div>`;
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function renderNotification(state: PokeRogueState): string {
	if (!state.notification) return '';
	return `<div class="pr-notification">` +
		`<div class="pr-notif-text">${state.notification}</div>` +
		renderBtn('/pokerogue dismissnotif', '✕', 'pr-notification-dismiss') + `</div>`;
}

function renderStatBar(state: PokeRogueState, cols2 = false): string {
	const floorStat = cols2 ? '' : `<div class="pr-stat"><div class="pr-stat-label">Floor</div><div class="pr-stat-val">${state.floor}</div></div>`;
	return `<div class="pr-statbar${cols2 ? ' cols2' : ''}">` + floorStat +
		`<div class="pr-stat"><div class="pr-stat-label">Battle Points</div><div class="pr-stat-val">${state.battlePoints ?? 0} BP</div></div>` +
		`<div class="pr-stat"><div class="pr-stat-label">Record</div><div class="pr-stat-val">Floor ${state.highestFloor ?? 1}</div></div>` +
		`</div>`;
}

function renderHeader(view: string, hasGameOver: boolean): string {
	const titles: Record<string, string> = { main: 'PokéRogue', shop: 'Shop', bag: 'Bag', top: 'Ladder', resetconfirm: 'Reset run', guide: 'PokèRogue Guide' };
	let buf = `<div class="pr-header"><h2>${titles[view] ?? 'PokéRogue'}</h2>`;
	if (view === 'main' && !hasGameOver) {
		buf += `<div style="display:flex;gap:8px;margin-left:auto">`;
		buf += `${renderBtn('/pokerogue view guide', 'Guide', 'pr-btn', 'font-size:11px;padding:5px 10px')}`;
		buf += `&nbsp;&nbsp;&nbsp;`;
		buf += `${renderBtn('/pokerogue view top', 'Ladder', 'pr-btn', 'font-size:11px;padding:5px 10px')}`;
		buf += `&nbsp;&nbsp;&nbsp;`;
		buf += `${renderBtn('/pokerogue view resetconfirm', 'Reset', 'pr-btn danger', 'font-size:11px;padding:5px 10px')}`;
		buf += `</div>`;
	} else if (view !== 'main' && !hasGameOver) {
		buf += renderBtn('/pokerogue view main', '← Back', 'pr-btn', 'font-size:11px;padding:5px 10px');
	}
	return buf + `</div>`;
}

// ─── Pokémon Card Subcomponents ───────────────────────────────────────────────

function renderMoveList(moves: string[]): string {
	if (!moves.length) return '';
	const pills = moves.map(m => {
		const dexMove = Dex.moves.get(m);
		const moveName = dexMove.name || m;
		const moveType = dexMove.type || 'Normal';
		const color = typeColor(moveType);
		const textColor = getContrastColor(color);
		return `<span class="pr-move-pill" style="background:#${color};color:#${textColor}">${Utils.escapeHTML(moveName)}</span>`;
	}).join('');
	return `<div class="pr-move-list">${pills}</div>`;
}

function renderExpBar(mon: PokemonEntry): string {
	let pct = 100;
	if (mon.level < 999) {
		const expType = mon.expType ?? 'Medium Fast';
		const expAtCurrent = expForLevel(mon.level, expType);
		const expAtNext = expForLevel(mon.level + 1, expType);
		const range = expAtNext - expAtCurrent;
		pct = range > 0 ? Math.max(0, Math.min(100, Math.round(((mon.exp - expAtCurrent) / range) * 100))) : 0;
	}
	return `<div class="pr-expbar"><div class="pr-expbar-fill" style="width:${pct}%"></div></div>`;
}

function renderHpBar(mon: PokemonEntry): string {
	const hpPct = mon.currentHp ?? 100;
	const color = hpPct > 50 ? '#4caf50' : hpPct > 25 ? '#ff9800' : '#f44336';
	return `<div class="pr-bar-row">` +
		`<div class="pr-bar-track"><div class="pr-bar-fill" style="width:${hpPct}%;background:${color}"></div></div>` +
		`<span class="pr-bar-label">${hpPct}% HP</span>` +
		`</div>`;
}

function renderTeamTableRow(mon: PokemonEntry, actionButton?: string): string {
	const spData = Dex.species.get(toID(mon.species));
	const expNeeded = mon.level < 999 ? expForLevel(mon.level + 1) - mon.exp : 0;
	const abilities = spData.abilities as Record<string, string>;
	const ability = abilities['0'] || '';

	let nature = mon.nature;
	if (!nature) {
		const natures = Dex.natures.all().map(n => n.name);
		const natIdx = spData.id.length % natures.length;
		nature = natures[natIdx] ?? 'Hardy';
	}

	const bs = spData.baseStats ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
	const moves: string[] = mon.moves?.length ? mon.moves : getLevelUpMoves(toID(mon.species), mon.level);

	let buf = `<tr class="pr-team-row">`;
	buf += `<td class="pr-td-icon" style="vertical-align:top;padding-top:10px">${getSpriteWithBall(mon.species, 44, mon.ball)}</td>`;
	buf += `<td class="pr-td-team-main">`;

	buf += `<div class="pr-td-name" style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">`;
	buf += `${spData.name} &nbsp;&nbsp;&nbsp;<span class="pr-mon-lv">Lv. ${mon.level}</span></div>`;
	buf += `<div class="pr-types">${renderTypeBadge(spData.types ?? [])}</div>`;

	if (mon.heldItem) {
		const dexHeld = Dex.items.get(mon.heldItem);
		buf += `<div class="pr-item-tag">${Utils.escapeHTML(dexHeld.name || mon.heldItem)}</div>`;
	}

	if (mon.status) {
		buf += `<div style="font-size:9px;color:#ff9800;font-weight:500;margin-top:2px">${mon.status.toUpperCase()}</div>`;
	}

	if (nature) buf += `<div class="pr-ct-ability" style="margin-top:4px">Nature: <b>${Utils.escapeHTML(nature)}</b></div>`;
	if (ability) buf += `<div class="pr-ct-ability" style="margin-top:4px">Ability: <b>${Utils.escapeHTML(ability)}</b></div>`;

	buf += `<div class="pr-ct-stats" style="margin-top:4px">`;
	for (const [stat, val] of Object.entries(bs)) {
		buf += `<span>${stat.toUpperCase()} <b>${val}</b></span>`;
	}
	buf += `</div>`;

	if (moves.length) buf += renderMoveList(moves);

	buf += `<div class="pr-bars" style="margin-top:6px">${renderHpBar(mon)}<div class="pr-bar-row">`;
	buf += `<div class="pr-bar-track">${renderExpBar(mon).replace('pr-expbar', 'pr-bar-track').replace('<div class="pr-expbar"><', '<').replace('</div></div>', '</div>')}</div>`;
	if (mon.level < 999) {
		buf += `<span class="pr-bar-label" style="min-width:36px;font-size:8px">${expNeeded} to Lv</span>`;
	}
	buf += `</div></div></td>`;

	if (actionButton !== undefined) {
		buf += `<td class="pr-td-action" style="vertical-align:top;padding-top:10px">${actionButton}</td>`;
	}

	buf += `</tr>`;
	return buf;
}

// ─── Shop Helpers ─────────────────────────────────────────────────────────────

function renderShopTable(
	items: [string, typeof SHOP_ITEMS[string] | typeof ROTATIONAL_ITEM_POOL[string]][],
	bp: number,
	keyItems: string[],
	cmd: string,
): string {
	let buf = `<div class="pr-table-container"><table class="pr-table" style="width:100%; border-collapse:collapse; font-size:11px; line-height:1.2;">`;
	buf += `<thead><tr style="border-bottom:1px solid rgba(150,150,150,0.2);">`;
	buf += `<th colspan="2" style="padding:3px 4px; text-align:left;">Name</th>`;
	buf += `<th style="padding:3px 4px; text-align:left;">Description</th>`;
	buf += `<th style="padding:3px 4px; text-align:left;">Cost</th>`;
	buf += `<th style="text-align:right; padding:3px 4px;">Action</th>`;
	buf += `</tr></thead><tbody>`;

	for (const [key, item] of items) {
		const isKey = (item as any).type === 'key';
		let alreadyHas = false;
		let disabledText = "Owned";
		let currentStacks = 0;

		if (isKey) {
			currentStacks = keyItems.filter(k => k === item.name).length;
			if (item.name === 'Exp. All') {
				alreadyHas = currentStacks >= 5;
				if (alreadyHas) disabledText = "Max (5)";
			} else if (item.name === 'Exp. Charm') {
				alreadyHas = currentStacks >= 99;
				if (alreadyHas) disabledText = "Max (99)";
			} else {
				alreadyHas = currentStacks >= 1;
			}
		}

		const canBuy = item.cost <= bp && !alreadyHas;
		buf += `<tr style="border-bottom:1px solid rgba(150,150,150,0.1);">`;
		buf += `<td class="pr-td-icon" style="padding:3px 4px; width:18px;">${getShopItemIcon(item.icon, 16)}</td>`;
		buf += `<td class="pr-td-name" style="padding:3px 4px; font-weight:500; white-space:nowrap;">${Utils.escapeHTML(item.name)}</td>`;
		buf += `<td class="pr-td-desc" style="padding:3px 4px; font-size:10px;">${Utils.escapeHTML(item.desc)}</td>`;
		buf += `<td class="pr-td-cost" style="padding:3px 4px; white-space:nowrap;">${item.cost} BP</td>`;
		buf += `<td class="pr-td-action" style="padding:3px 4px; text-align:right;">`;

		const btnStyle = `padding:2px 6px; font-size:10px; min-width:45px;`;

		if (alreadyHas) {
			buf += renderBtn(null, disabledText, 'pr-shop-buy', btnStyle, true);
		} else if (!canBuy) {
			buf += renderBtn(null, 'Need BP', 'pr-shop-buy', btnStyle, true);
		} else {
			const btnText = (isKey && currentStacks > 0) ? `Buy (${currentStacks})` : `Buy`;
			buf += renderBtn(`/${cmd} ${key}`, btnText, 'pr-shop-buy', btnStyle);
		}

		buf += `</td></tr>`;
	}

	buf += `</tbody></table></div>`;
	return buf;
}

// ─── Choice / Pending Views ───────────────────────────────────────────────────

function renderPendingChoice(state: PokeRogueState): string {
	let buf = `<h2 class="pr-choice-heading">Choose your starter!</h2><div class="pr-choice-grid">`;
	const natures = Dex.natures.all().map(n => n.name);

	for (let i = 0; i < state.pendingChoice!.length; i++) {
		const sp = Dex.species.get(toID(state.pendingChoice![i]));
		const isLeg = sp.tags?.some((t: string) => LEGENDARY_TAGS.has(t)) ?? false;
		const bs = sp.baseStats ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
		const abilities = sp.abilities ?? {};
		const ability = (abilities as unknown as Record<string, string>)['0'] || 'Unknown';
		const hash = ((state.floor ?? 1) * 37) + (i * 13) + sp.id.length;
		const nature = natures[hash % natures.length] ?? 'Hardy';
		const displayMoves = getLevelUpMoves(sp.id, 5);

		let flexHtml = `<div class="pr-ct-name" style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">${sp.name}${isLeg ? ` <span class="pr-legendary-badge">Legendary</span>` : ''}</div>`;
		flexHtml += `<div class="pr-types">${renderTypeBadge(sp.types ?? [])}</div><div class="pr-ct-stats">`;
		for (const [stat, val] of Object.entries(bs)) flexHtml += `<span>${stat.toUpperCase()} <b>${val}</b></span>`;
		flexHtml += `</div><div class="pr-ct-ability" style="margin-top:2px">Nature: <b>${Utils.escapeHTML(nature)}</b></div>`;
		flexHtml += `<div class="pr-ct-ability" style="margin-top:2px">Ability: <b>${Utils.escapeHTML(ability)}</b></div>`;
		if (displayMoves.length) flexHtml += renderMoveList(displayMoves);

		buf += renderChoiceRow(getSpriteWithBall(sp.id, 52), flexHtml, renderBtn(`/pokerogue choose ${i + 1}`, 'Pick', 'pr-pick-btn'), isLeg ? 'leg' : '');
	}

	return buf + `</div>`;
}

function renderPendingSwap(state: PokeRogueState): string {
	const sp = Dex.species.get(toID(state.pendingSwap!.species));
	let buf = `<h2 class="pr-choice-heading">Team is full!</h2><div style="text-align:center;margin-bottom:10px">`;
	buf += `${getSpriteWithBall(sp.id, 64, state.pendingSwap!.ball)}<div style="font-size:12px;color:#aaa;margin-top:6px"><b>Lv. ${state.pendingSwap!.level} ${sp.name}</b> wants to join. Replace a Pokémon:</div></div><div class="pr-choice-grid">`;

	for (let i = 0; i < state.team.length; i++) {
		const mon = state.team[i];
		const spName = Dex.species.get(toID(mon.species)).name;
		const flexHtml = `<span style="font-size:12px;font-weight:500">${spName}</span> <span style="font-size:10px;color:#888">Lv. ${mon.level}</span>`;
		buf += renderChoiceRow(getSpriteWithBall(mon.species, 40, mon.ball), flexHtml, renderBtn(`/pokerogue swapmon ${i + 1}`, 'Replace', 'pr-pick-btn'), 'cursor:pointer');
	}

	buf += renderBtn('/pokerogue swapmon skip', `Release ${sp.name}`, 'pr-btn', 'width:100%;padding:8px;margin-top:2px') + `</div>`;
	return buf;
}

function renderPendingMoves(state: PokeRogueState): string {
	const pending = state.pendingMoves![0];
	const mon = state.team[pending.pokemonIndex];
	const sp = Dex.species.get(toID(mon.species));
	const newMove = Dex.moves.get(pending.move);

	let buf = `<h2 class="pr-choice-heading">New move!</h2><div style="text-align:center;margin-bottom:10px">${getSpriteWithBall(sp.id, 60, mon.ball)}`;
	buf += `<div style="font-size:12px;color:#aaa;margin-top:6px"><b>${sp.name}</b> wants to learn <b style="color:#c4a8ff">${newMove.name}</b>.<br>Choose a move to forget:</div></div><div class="pr-choice-grid">`;

	for (let i = 0; i < mon.moves.length; i++) {
		const oldMove = Dex.moves.get(mon.moves[i]);
		const flexHtml = `<div><div style="font-size:12px;font-weight:500">${oldMove.name}</div><div style="font-size:10px;color:#888">Type: ${oldMove.type} &nbsp;|&nbsp; BP: ${oldMove.basePower || '—'}</div></div>`;
		buf += renderChoiceRow('', flexHtml, renderBtn(`/pokerogue learnmove ${i + 1}`, 'Forget', 'pr-pick-btn'), 'justify-content:space-between');
	}

	buf += renderBtn('/pokerogue learnmove skip', 'Keep old moves', 'pr-btn', 'width:100%;padding:8px;margin-top:2px') + `</div>`;
	return buf;
}

function renderTeachTM(state: PokeRogueState): string {
	const moveName = Dex.moves.get(state.moveToLearn).name;
	let buf = `<h2 class="pr-choice-heading">Teach ${Utils.escapeHTML(moveName)}?</h2>`;
	buf += `<div style="font-size:12px;color:#aaa;margin-bottom:8px">Choose a Pokémon to learn <b style="color:#c4a8ff">${Utils.escapeHTML(moveName)}</b>:</div><div class="pr-choice-grid">`;

	for (let i = 0; i < state.team.length; i++) {
		const mon = state.team[i];
		const spName = Dex.species.get(toID(mon.species)).name;
		const canLearn = Dex.species.getFullLearnset(toID(mon.species)).some(l => Object.keys(l.learnset ?? {}).includes(toID(state.moveToLearn!)));
		const alreadyKnows = mon.moves.includes(state.moveToLearn!);
		const disabled = !canLearn || alreadyKnows;
		const reason = alreadyKnows ? 'already knows' : !canLearn ? 'cannot learn' : '';

		const flexHtml = `<span style="font-size:12px;font-weight:500">${spName}</span> <span style="font-size:10px;color:#888">Lv. ${mon.level}${reason ? ` (${reason})` : ''}</span>`;
		const btnHtml = disabled ? '' : renderBtn(`/pokerogue teachtm ${i + 1}`, 'Teach', 'pr-pick-btn');
		buf += renderChoiceRow(getSpriteWithBall(mon.species, 40, mon.ball), flexHtml, btnHtml, disabled ? 'opacity:.45' : '');
	}

	buf += renderBtn('/pokerogue teachtm skip', 'Cancel <small style="color:#888">(refund)</small>', 'pr-btn', 'width:100%;padding:8px;margin-top:2px') + `</div>`;
	return buf;
}

function renderItemOptions(state: PokeRogueState): string {
	let buf = `<h2 class="pr-choice-heading">Choose an item!</h2><div class="pr-choice-grid">`;
	for (const itemName of state.itemOptions!) {
		const dexItem = Dex.items.get(itemName);
		const flexHtml = `<div style="display:flex;align-items:center;gap:8px">${getShopItemIcon(itemURLFormat(itemName), 24)}<span style="font-size:13px;font-weight:500">${Utils.escapeHTML(dexItem.name || itemName)}</span></div>`;
		buf += renderChoiceRow('', flexHtml, renderBtn(`/pokerogue pickitem ${toID(itemName)}`, 'Pick', 'pr-pick-btn'), 'justify-content:space-between');
	}
	buf += renderBtn('/pokerogue pickitem skip', 'Skip', 'pr-btn', 'width:100%;padding:8px;margin-top:2px') + `</div>`;
	return buf;
}

function renderGiveItem(state: PokeRogueState): string {
	const dexItem = Dex.items.get(state.pendingItemName);
	let buf = `<h2 class="pr-choice-heading">Give ${Utils.escapeHTML(dexItem.name || state.pendingItemName!)}?</h2>`;
	buf += `<div style="font-size:12px;color:#aaa;margin-bottom:8px">Choose a Pokémon to give it to:</div><div class="pr-choice-grid">`;

	for (let i = 0; i < state.team.length; i++) {
		const mon = state.team[i];
		const spName = Dex.species.get(toID(mon.species)).name;
		let flexHtml = `<span style="font-size:12px;font-weight:500">${spName}</span> <span style="font-size:10px;color:#888">Lv. ${mon.level}</span>`;
		if (mon.heldItem) flexHtml += `<div style="font-size:9px;color:#8ab4f8">Holds: ${Utils.escapeHTML(Dex.items.get(mon.heldItem).name || mon.heldItem)}</div>`;
		buf += renderChoiceRow(getSpriteWithBall(mon.species, 40, mon.ball), flexHtml, renderBtn(`/pokerogue giveitem ${i + 1}`, 'Give', 'pr-pick-btn'));
	}

	buf += renderBtn('/pokerogue giveitem skip', 'Cancel <small style="color:#888">(refund)</small>', 'pr-btn', 'width:100%;padding:8px;margin-top:2px') + `</div>`;
	return buf;
}

function renderConsumable(state: PokeRogueState): string {
	const consumableItem = SHOP_ITEMS[state.purchasedItem!] ?? ROTATIONAL_ITEM_POOL[state.purchasedItem!];
	const consumableType = state.pendingConsumableType!;

	let buf = `<h2 class="pr-choice-heading">Use ${Utils.escapeHTML(consumableItem?.name ?? state.purchasedItem!)}?</h2>`;
	buf += `<div style="font-size:12px;color:#aaa;margin-bottom:8px">Choose a Pokémon:</div><div class="pr-choice-grid">`;

	for (let i = 0; i < state.team.length; i++) {
		const mon = state.team[i];
		const hp = mon.currentHp ?? 100;
		let disabled = false, reason = '';

		switch (consumableType) {
		case 'healHP':
			disabled = hp >= 100 || hp <= 0;
			reason = hp <= 0 ? 'fainted' : hp >= 100 ? 'full HP' : '';
			break;
		case 'revive':
			disabled = hp > 0;
			reason = hp > 0 ? 'not fainted' : '';
			break;
		case 'cureStatus':
			disabled = !mon.status || hp <= 0;
			reason = hp <= 0 ? 'fainted' : !mon.status ? 'no status' : '';
			break;
		}

		let flexHtml = `<span style="font-size:12px;font-weight:500">${Dex.species.get(toID(mon.species)).name}</span> <span style="font-size:10px;color:#888">Lv. ${mon.level}${reason ? ` (${reason})` : ''}</span>`;
		if (mon.status) flexHtml += `<div style="font-size:9px;color:#ff9800">${mon.status.toUpperCase()}</div>`;
		if (hp < 100 && hp > 0) flexHtml += `<div style="font-size:9px;color:#aaa">${hp}% HP</div>`;

		const btnHtml = disabled ? '' : renderBtn(`/pokerogue useshopitem ${i + 1}`, 'Use', 'pr-pick-btn');
		buf += renderChoiceRow(getSpriteWithBall(mon.species, 40, mon.ball), flexHtml, btnHtml, disabled ? 'opacity:.45' : '');
	}

	buf += renderBtn('/pokerogue useshopitem skip', 'Cancel', 'pr-btn', 'width:100%;padding:8px;margin-top:2px') + `</div>`;
	return buf;
}

function renderMoveMon(state: PokeRogueState): string {
	const fromIdx = state.pendingMoveSlot!;
	const mon = state.team[fromIdx];
	const spName = Dex.species.get(toID(mon.species)).name;

	let buf = `<h2 class="pr-choice-heading">Move ${spName}?</h2>`;
	buf += `<div style="font-size:12px;color:#aaa;margin-bottom:8px">Choose a slot to swap with:</div><div class="pr-choice-grid">`;

	for (let i = 0; i < state.team.length; i++) {
		const targetMon = state.team[i];
		const disabled = i === fromIdx;
		const targetSpName = Dex.species.get(toID(targetMon.species)).name;
		const flexHtml = `<span style="font-size:12px;font-weight:500">${targetSpName}</span> <span style="font-size:10px;color:#888">Lv. ${targetMon.level}</span>`;
		const btnHtml = disabled ? '' : renderBtn(`/pokerogue movemon confirm ${i + 1}`, 'Swap', 'pr-pick-btn');
		buf += renderChoiceRow(getSpriteWithBall(targetMon.species, 40, targetMon.ball), flexHtml, btnHtml, disabled ? 'opacity:.45' : '');
	}

	buf += renderBtn('/pokerogue movemon cancel', 'Cancel', 'pr-btn', 'width:100%;padding:8px;margin-top:2px');
	return buf + `</div>`;
}

function renderReleaseMon(state: PokeRogueState): string {
	const mon = state.team[state.pendingReleaseSlot!];
	const spName = Dex.species.get(toID(mon.species)).name;

	let buf = `<h2 class="pr-choice-heading" style="color:#ef4444">Release ${spName}?</h2>`;
	buf += `<div style="text-align:center;margin-bottom:10px">${getSpriteWithBall(mon.species, 64, mon.ball)}`;
	buf += `<div style="font-size:12px;color:#aaa;margin-top:6px">Are you sure you want to release <b>Lv. ${mon.level} ${spName}</b>?<br>This action cannot be undone!</div>`;

	if (mon.heldItem) {
		const itemName = Dex.items.get(mon.heldItem).name;
		buf += `<div style="font-size:11px;color:#ff9800;margin-top:6px;font-weight:500;">Warning: It is holding ${Utils.escapeHTML(itemName)} which will be permanently lost!</div>`;
	}

	buf += `</div><center>`;
	buf += renderBtn('/pokerogue releasemon confirm', 'Yes, release it', 'pr-btn danger', 'padding:10px 20px') + `&nbsp;&nbsp;&nbsp;`;
	buf += renderBtn('/pokerogue releasemon cancel', 'Cancel', 'pr-btn', 'padding:10px 20px') + `</center>`;

	return buf;
}

// ─── Full Page Views ──────────────────────────────────────────────────────────

function renderMainView(state: PokeRogueState, user: User): string {
	if (state.battleRoomId) {
		return `<div style="text-align:center;padding:18px 0;color:#fac000;font-weight:500">Battle in progress!</div>`;
	}

	let buf = renderStatBar(state);

	buf += `<div class="pr-actions">`;
	buf += renderBtn('/pokerogue battle', 'Start battle', 'pr-btn primary');
	buf += renderBtn('/pokerogue view bag', 'Bag');
	buf += renderBtn('/pokerogue view shop', 'Shop');
	buf += `<br>`;
	buf += `</div>`;

	buf += `<div class="pr-section-title">Your team</div>`;
	buf += `<div class="pr-table-container"><table class="pr-table">`;
	buf += `<thead><tr><th colspan="2">Pokémon</th><th style="text-align:right">Action</th></tr></thead><tbody>`;

	for (let i = 0; i < state.team.length; i++) {
		const mon = state.team[i];
		const hp = mon.currentHp ?? 100;
		const bp = state.battlePoints ?? 0;

		const hyperItem = Object.values(SHOP_ITEMS).find(item => item.name === 'Hyper Potion');
		const superItem = Object.values(SHOP_ITEMS).find(item => item.name === 'Super Potion');
		const cureItem = Object.values(SHOP_ITEMS).find(item => item.type === 'cureStatus');

		const hyperCost = hyperItem ? hyperItem.cost : Infinity;
		const superCost = superItem ? superItem.cost : Infinity;
		const cureCost = cureItem ? cureItem.cost : Infinity;

		let qHealDisabled = true, qHealLabel = "Q Heal";
		if (hp <= 0) qHealLabel = "Fainted";
		else if (hp >= 100) qHealLabel = "Full HP";
		else if (hp < 40 && (bp >= hyperCost || bp >= superCost)) qHealDisabled = false;
		else if (hp >= 40 && bp >= superCost) qHealDisabled = false;
		else qHealLabel = "Need BP";

		let qCureDisabled = true, qCureLabel = "Q Cure";
		if (hp <= 0) qCureLabel = "Fainted";
		else if (!mon.status) qCureLabel = "No Status";
		else if (bp >= cureCost) qCureDisabled = false;
		else qCureLabel = "Need BP";

		const btnStyle = "display:block;width:100%;margin-bottom:4px;box-sizing:border-box;";
		let actionBtn = renderBtn(`/pokerogue movemon ${i + 1}`, 'Move', 'pr-shop-buy', btnStyle);
		actionBtn += renderBtn(qHealDisabled ? null : `/pokerogue qheal ${i + 1}`, qHealLabel, 'pr-shop-buy', btnStyle, qHealDisabled);
		actionBtn += renderBtn(qCureDisabled ? null : `/pokerogue qcure ${i + 1}`, qCureLabel, 'pr-shop-buy', btnStyle, qCureDisabled);

		if (state.team.length > 1) {
			actionBtn += renderBtn(`/pokerogue releasemon ${i + 1}`, 'Release', 'pr-shop-buy', "display:block;width:100%;box-sizing:border-box;");
		}

		buf += renderTeamTableRow(mon, actionBtn);
	}

	buf += `</tbody></table></div>`;
	return buf;
}

function renderShopView(state: PokeRogueState): string {
	const bp = state.battlePoints ?? 0;
	const currentFloor = state.floor ?? 1;
	const rerollCost = 2 + (state.timesRerolled ?? 0);

	let buf = renderStatBar(state, true);

	if (state.rotationalShop?.length) {
		buf += `<div class="pr-section-title" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><span>Current deals</span>`;
		buf += renderBtn(rerollCost > bp ? null : `/pokerogue reroll`, `Reroll (${rerollCost} BP)`, 'pr-shop-buy', 'font-size:10px;padding:4px 8px', rerollCost > bp);
		buf += `</div>`;

		const rotItems = state.rotationalShop
			.map(key => [key, ROTATIONAL_ITEM_POOL[key]] as [string, typeof ROTATIONAL_ITEM_POOL[string]])
			.filter(([, item]) => item && item.minFloor <= currentFloor);
		buf += renderShopTable(rotItems, bp, state.keyItems ?? [], 'pokerogue buy');
		buf += `<div style="margin:10px 0 5px"></div>`;
	}

	buf += `<div class="pr-section-title">Always available</div>`;
	const permItems = Object.entries(SHOP_ITEMS).filter(([, item]) => item.minFloor <= currentFloor);
	buf += renderShopTable(permItems, bp, state.keyItems ?? [], 'pokerogue buy');

	return buf;
}

function renderBagView(state: PokeRogueState): string {
	let buf = `<div class="pr-section-title">Bag</div><div class="pr-table-container"><table class="pr-table">`;
	buf += `<thead><tr><th colspan="2">Item</th><th>Description</th><th style="text-align:right;">Quantity</th></tr></thead><tbody>`;

	const inv = state.inventory || {};
	const ballTypes = [
		{ id: 'pokeball', name: 'Poké Ball', icon: 'Poke Ball', desc: 'A standard ball for catching wild Pokémon.' },
		{ id: 'greatball', name: 'Great Ball', icon: 'Great Ball', desc: 'A good ball with a higher catch rate.' },
		{ id: 'ultraball', name: 'Ultra Ball', icon: 'Ultra Ball', desc: 'An excellent ball with a very high catch rate.' },
		{ id: 'masterball', name: 'Master Ball', icon: 'Master Ball', desc: 'Catches any wild Pokémon without fail.' },
	];

	for (const ball of ballTypes) {
		buf += `<tr><td class="pr-td-icon">${getShopItemIcon(ball.icon, 20)}</td><td class="pr-td-name">${ball.name}</td>`;
		buf += `<td class="pr-td-desc" style="color:#aaa;">${ball.desc}</td><td class="pr-td-action" style="text-align:right; font-weight:bold; font-size:13px;">x${inv[ball.id] || 0}</td></tr>`;
	}

	const keyItems = state.keyItems || [];
	const expItems = [
		{ name: 'Exp. All', count: keyItems.filter(k => k === 'Exp. All').length, icon: 'Exp. Share', desc: 'Non-participating Pokémon receive +20% EXP per stack.' },
		{ name: 'Exp. Charm', count: keyItems.filter(k => k === 'Exp. Charm').length, icon: 'Exp. Share', desc: 'Total EXP gained increased by 25% per stack.' },
	];

	for (const item of expItems) {
		buf += `<tr><td class="pr-td-icon">${getShopItemIcon(item.icon, 20)}</td><td class="pr-td-name">${item.name}</td>`;
		buf += `<td class="pr-td-desc" style="color:#aaa;">${item.desc}</td><td class="pr-td-action" style="text-align:right; font-weight:bold; font-size:13px; color:#8ab4f8;">x${item.count}</td></tr>`;
	}

	return buf + `</tbody></table></div>`;
}

function renderTopView(): string {
	const entries = Object.entries(savedData)
		.filter(([, s]) => (s.highestFloor ?? 0) > 0)
		.sort((a, b) => (b[1].highestFloor ?? 0) - (a[1].highestFloor ?? 0))
		.slice(0, 100);

	if (!entries.length) return `<div style="text-align:center;padding:16px;color:#888;font-size:13px">No records yet!</div>`;

	let buf = `<div class="pr-section-title">Ladder</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;display:block;"><table class="pr-table" style="min-width:520px;border-collapse:collapse;">`;
	buf += `<thead><tr><th>Rank</th><th>Player</th><th>Floor</th><th>Team</th></tr></thead><tbody>`;

	entries.forEach(([userid, s], i) => {
		const displayTeam = s.recordTeam?.length ? s.recordTeam : s.team;
		const teamSprites = (displayTeam ?? []).slice(0, 6).map((m: PokemonEntry) => getSprite(m.species, 28)).join('');
		buf += `<tr><td class="pr-td-desc" style="font-weight:500;white-space:nowrap;">#${i + 1}</td><td class="pr-td-name" style="white-space:nowrap;">${Impulse.nameColor(s.displayName || userid, true, false)}</td>`;
		buf += `<td class="pr-td-desc" style="white-space:nowrap;">Floor ${s.highestFloor}</td><td style="white-space:nowrap;"><div class="pr-lb-team">${teamSprites}</div></td></tr>`;
	});

	return buf + `</tbody></table></div>`;
}

function renderResetConfirmView(state: PokeRogueState): string {
	let buf = `<div style="text-align:center;padding:20px 12px">`;
	buf += `<div style="font-size:17px;font-weight:500;color:#f87171;margin-bottom:8px">Reset run?</div>`;
	buf += `<div style="color:#aaa;font-size:12px;margin-bottom:18px">This will permanently end your current run on Floor <b>${state.floor}</b>.</div>`;
	buf += `<center>${renderBtn('/pokerogue quit', 'Yes, reset run', 'pr-btn danger', 'padding:8px 18px')}</center></div>`;
	return buf;
}

function renderGameOverView(state: PokeRogueState): string {
	return `<div class="pr-gameover"><div class="pr-go-title">Game over</div>` +
		`<div class="pr-go-sub">Your run ended on Floor <b>${state.lastRunFloor || 1}</b>.</div>` +
		renderBtn('/pokerogue newgame confirm', 'Start new run', 'pr-newrun-btn') + `</div>`;
}

function renderGuideView(): string {
	let buf = `<div class="pr-section-title">The core loop</div>`;
	buf += renderGuidePanel(`The game runs floor by floor. Every 10 floors is one <b>Zone</b>. Each zone has a random Biome (Except Floors 1-10, which are always TOWN) that determines which wild Pokémon you fight. The Biomes: <b>Town, Plains, Grass, Forest, Cave, Mountain, Volcano, Sea</b>.`);
	buf += renderGuidePanel(`<b>Zone Boss</b> — Floors 10, 20, 30, 40… Harder fight. Win = full party heal and +10 BP total.`);

	buf += `<div class="pr-section-title">Level cap system</div>`;
	buf += renderGuidePanel(`Your Pokémon cannot exceed the cap for your current zone: <b>Floors 1–10 = cap 10, 11–20 = cap 20, 21–30 = cap 30</b>, and so on up to 100. EXP earned beyond the cap is held — it all counts once you enter the next zone. The enemy AI scales its levels to match each zone as well.`);

	buf += `<div class="pr-section-title">Rarity tiers</div>`;
	buf += renderGuidePanel(`<div style="margin-bottom:7px">Common → Uncommon → Rare → Super Rare → Ultra Rare → Boss → Boss Rare → Boss Ultra Rare. Higher floors unlock higher rarities in battles. Wild encounters draw from the current Biome's pool.</div><ul style="margin:0;padding-left:16px"><li><b>Common / Uncommon</b> — Early-game route Pokémon, fully dominant in Floors 1–10.</li><li><b>Rare</b> — Starter Pokémon and mid-tier species. Begin appearing reliably from Floor 11+.</li><li><b>Super Rare</b> — Powerful single-stage or fully-evolved Pokémon. Floor 21+.</li><li><b>Ultra Rare</b> — Sub-legendaries and mythicals. Floor 31+.</li><li><b>Boss / Boss Rare / Boss Ultra Rare</b> — Fully-evolved starters and legendaries. Boss floors 40+.</li></ul>`);

	buf += `<div class="pr-section-title">HP & Status conditions — persist between battles</div>`;
	buf += renderGuidePanel(`HP is tracked as a percentage (0–100%) and carries into every subsequent battle exactly where it left off. Status conditions — <b>burn, poison, toxic, paralysis, sleep, freeze</b> — also persist between floors. Boss floor clears trigger a <b>full party heal</b> (HP and Status).<ul style="margin:5px 0 0;padding-left:16px"><li>Buy <b>Potions</b>, <b>Full Heals</b> from the shop to recover between fights.</li><li>A fainted Pokémon (0% HP) is completely unusable until you buy a <b>Revive</b> and use it on them.</li></ul>`);

	buf += `<div class="pr-section-title">EXP & modern scaling</div>`;
	buf += renderGuidePanel(`EXP uses a <b>scaled formula</b> based on official Pokémon growth rates. Defeating Pokémon at a higher level than your own yields significantly more EXP, while defeating weaker Pokémon yields less. The base EXP earned is divided evenly among all Pokémon that directly participated in the battle.<ul style="margin:5px 0 0;padding-left:16px"><li>Boss floors (Trainer battles) award a <b>1.5× EXP</b> bonus.</li><li>When a Pokémon levels up and already knows 4 moves, you are prompted to choose a move to forget or skip learning the new move entirely.</li><li>Pokémon evolve automatically upon reaching the required level.</li><li>EXP is capped at the current zone's level cap. Excess EXP is preserved and applied when the cap increases.</li></ul>`);

	buf += `<div class="pr-section-title">EXP Items & stacking</div>`;
	buf += renderGuidePanel(`Purchasable from the permanent shop. These are crucial for keeping your entire team leveled up:<ul style="margin:5px 0 0;padding-left:16px"><li><b>Exp. All:</b> Grants non-participating (benched) Pokémon 20% of the active Pokémon's earned EXP per stack. <b>Stacks up to 5 times.</b> At 5 stacks, the bench receives 100% of the active EXP.</li><li><b>Exp. Charm:</b> Provides a global +25% multiplier to all EXP earned by your team. <b>Stacks up to 99 times.</b></li></ul>`);

	buf += `<div class="pr-section-title">Adding Pokémon to your team</div>`;
	buf += renderGuidePanel(`<ul style="margin:0;padding-left:16px"><li><b>Starter</b> — choose one of 5 randomly drawn traditional starters at Level 5.</li><li><b>Catching</b> — buy Poké Balls from the permanent shop and throw them during wild encounters!</li><li>If your team is already at 6, you are offered to swap the caught Pokémon into a slot, or release it back into the wild.</li><li><b>Bosses</b> — you cannot catch Trainer or Boss Pokémon (Floors 10, 20, 30, etc.).</li></ul>`);

	buf += `<div class="pr-section-title">Economy & Battle Points (BP)</div>`;
	buf += renderGuidePanel(`You start with <b>20 BP</b>.<ul style="margin:5px 0 0;padding-left:16px"><li><b>+5 BP</b> for every floor cleared.</li><li><b>+5 BP bonus</b> for defeating a Zone Boss (total +10 BP on boss floors).</li><li><b>Rerolling the shop</b> costs 2 BP the first time, then +1 BP per additional reroll on the same floor. The counter resets each floor.</li><li>The rotational shop refreshes automatically with 5 freshly rolled items each new floor. <b>Smart Rolling:</b> TMs and Evolution items will <i>only</i> appear in the rotational shop if a Pokémon currently on your team can legally learn or use them!</li></ul>`);

	buf += `<div class="pr-section-title">Held items</div>`;
	buf += renderGuidePanel(`Each Pokémon can hold one item. Species-locked items (e.g. Pikachu's Light Ball) and Z-Crystals are filtered to only compatible Pokémon. Some items shift a Pokémon's form on equip (e.g. Griseous Orb on Giratina). Items can be removed freely via the <b>Bag</b> screen — but there is no storage, so removed items are permanently lost. Berries and single-use items consumed mid-battle are removed automatically after use.`);

	buf += `<div class="pr-section-title">TMs & move teaching</div>`;
	buf += renderGuidePanel(`TMs appear in the rotational shop (filtered to your current team's compatibility). Buying a TM opens a Pokémon selection screen. If the target already has 4 moves, you enter the move-replacement flow: choose a slot to overwrite or skip. Cancelling the TM before assigning it to any Pokémon gives a full BP refund.`);

	buf += `<div class="pr-section-title">Team management</div>`;
	buf += renderGuidePanel(`From the main screen you can:<ul style="margin:5px 0 0;padding-left:16px"><li><b>Move</b> — reorder your Pokémon. The first slot is sent out first, so your lead goes at the top.</li><li><b>Release</b> — permanently remove a Pokémon. You cannot release your last Pokémon. Any held item is permanently lost on release.</li><li><b>Bag</b> — unequip held items from Pokémon (items are discarded, not stored).</li></ul>All team management is locked while an active battle room is open.`);

	buf += `<div class="pr-section-title">AI difficulty & heuristics</div>`;
	buf += renderGuidePanel(`The enemy AI grows meaningfully stronger as you climb:<ul style="margin:5px 0 0;padding-left:16px"><li><b>Floors 1–10</b> — random IVs (0–31), minimal EVs (0–40 per stat), random natures.</li><li><b>Floors 11–20</b> — IVs 15–31, balanced 40 EVs per stat.</li><li><b>Floors 21–30</b> — IVs 20–31, full 510 EV spread (85 per stat).</li><li><b>Floors 31–40</b> — perfect 31 IVs, 510 EVs.</li><li><b>Floors 41+</b> — perfect IVs, optimised 252/252/6 EV spread targeting the two highest base stats, with an appropriate speed or attack nature.</li></ul><div style="margin-top:7px"><b>Advanced Decision Making:</b> The AI evaluates the battle dynamically every turn. It calculates expected damage (factoring in STAB and type effectiveness), actively avoids moves that trigger immunities (e.g., Levitate, Volt Absorb, Wonder Guard, Bulletproof), prioritizes setup moves based on HP ratios, and will strategically <b>switch out</b> if its active Pokémon is entirely walled by your team or at critically low HP.</div>`);

	buf += `<div class="pr-section-title">Boss floor Pokémon tiers</div>`;
	buf += renderGuidePanel(`<ul style="margin:0;padding-left:16px"><li><b>Floor 10</b> — 100% Rare tier (starter base forms, early Eevee, strong normals).</li><li><b>Floor 20</b> — mostly Rare, with a small chance of Super Rare (Snorlax, Lapras).</li><li><b>Floor 30</b> — Super Rare is the standard; small Ultra Rare chance appears.</li><li><b>Floor 40</b> — Boss tier introduced: fully-evolved starters, powerful single-stage Pokémon.</li><li><b>Floor 50+</b> — Boss, Boss Rare, and Boss Ultra Rare all possible. Expect major legendaries.</li></ul>`);

	return buf;
}

// ─── Page Entry Point ─────────────────────────────────────────────────────────

export function renderGamePage(state: PokeRogueState, user: User): string {
	const view = (state as any).view || 'main';

	let buf = (state.battleRoomId || state.notification) ? `<meta http-equiv="refresh" content="${PAGE_REFRESH_SECONDS}">` : '';
	buf += `<div class="pr">`;

	if (state.gameOver) return buf + renderHeader('main', true) + `<div style="padding:0 14px 14px">${renderGameOverView(state)}</div></div>`;
	if (view === 'resetconfirm') return buf + renderHeader('resetconfirm', false) + `<div style="padding:0 14px 14px">${renderResetConfirmView(state)}</div></div>`;
	if (view === 'top') return buf + renderHeader('top', false) + `<div style="padding:0 14px 14px">${renderTopView()}</div></div>`;

	buf += renderHeader(view, false) + `<div style="padding:0 14px 14px">${renderNotification(state)}`;

	if (state.pendingChoice?.length) return buf + renderPendingChoice(state) + `</div></div>`;
	if (state.pendingSwap) return buf + renderPendingSwap(state) + `</div></div>`;
	if (state.pendingMoves?.length) return buf + renderPendingMoves(state) + `</div></div>`;
	if (state.moveToLearn && state.purchasedItem && state.pokemonForTM === undefined) return buf + renderTeachTM(state) + `</div></div>`;
	if (state.itemOptions?.length) return buf + renderItemOptions(state) + `</div></div>`;
	if (state.pendingItemName) return buf + renderGiveItem(state) + `</div></div>`;
	if (state.pendingConsumableType && state.purchasedItem) return buf + renderConsumable(state) + `</div></div>`;
	if (view === 'shop') return buf + renderShopView(state) + `</div></div>`;
	if (view === 'bag') return buf + renderBagView(state) + `</div></div>`;
	if (view === 'guide') return buf + renderGuideView() + `</div></div>`;
	if (state.pendingMoveSlot !== undefined) return buf + renderMoveMon(state) + `</div></div>`;
	if (state.pendingReleaseSlot !== undefined) return buf + renderReleaseMon(state) + `</div></div>`;

	return buf + renderMainView(state, user) + `</div></div>`;
}
