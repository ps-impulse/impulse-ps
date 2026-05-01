/**
 * Shop chat-plugin
 * @author MusaddikTemkar
 */
import { FS } from '../../../lib';
import { Table } from '../../impulse-utils';
import { getBalance, setBalance, CURRENCY_NAME } from './economy';

const SHOP_PATH = 'impulse/db/shop.json';
const SHOP_LOGS_PATH = 'impulse/db/shop-logs.json';

interface ShopItem {
	description: string;
	cost: number;
}

interface ShopLogEntry {
	user: string;
	item: string;
	timestamp: number;
}

type ShopData = Record<string, ShopItem>;

let data: ShopData = {};
let logsData: ShopLogEntry[] = [];

const saveData = (): void => {
	FS(SHOP_PATH).writeUpdate(() => JSON.stringify(data));
};

const saveLogs = (): void => {
	FS(SHOP_LOGS_PATH).writeUpdate(() => JSON.stringify(logsData));
};

const loadData = async (): Promise<void> => {
	try {
		const raw = await FS(SHOP_PATH).readIfExists();
		if (raw) data = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to load shop data:', e);
		data = {};
	}
};

const loadLogs = async (): Promise<void> => {
	try {
		const raw = await FS(SHOP_LOGS_PATH).readIfExists();
		if (raw) logsData = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to load shop logs data:', e);
		logsData = [];
	}
};

const cleanOldLogs = (): void => {
	const now = Date.now();
	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
	const initialLength = logsData.length;
	
	logsData = logsData.filter(log => (now - log.timestamp) <= sevenDaysMs);
	
	if (logsData.length !== initialLength) {
		saveLogs();
	}
};

void (async () => {
	await loadData();
	await loadLogs();
})();

export const commands: ChatCommands = {
	shop: {
		''(target, room, user) {
			if (!this.runBroadcast()) return;

			const sorted = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));

			if (!sorted.length) {
				return this.sendReplyBox(`<strong>The shop is currently empty.</strong>`);
			}

			const rows = sorted.map(([name, item]) => [
				Chat.escapeHTML(name),
				Chat.escapeHTML(item.description),
				`<button class="button" name="send" value="/shop buy ${name}">${item.cost} ${CURRENCY_NAME}</button>`,
			]);

			this.sendReplyBox(Table(
				`Shop`,
				['Name', 'Description', 'Cost'],
				rows
			));
		},

		buy(target, room, user) {
			const itemName = target.trim();
			if (!itemName) return this.errorReply(`Usage: /shop buy [item name]`);

			const item = data[itemName];
			if (!item) return this.errorReply(`Item "${itemName}" does not exist in the shop.`);

			const balance = getBalance(user.id);
			if (balance < item.cost) {
				return this.errorReply(`You do not have enough ${CURRENCY_NAME}. Your balance: ${balance}. Cost: ${item.cost}.`);
			}

			setBalance(user.id, balance - item.cost);
			
			logsData.push({
				user: user.name,
				item: itemName,
				timestamp: Date.now(),
			});
			saveLogs();

			this.sendReply(`|raw|You purchased <strong>${itemName}</strong> for <strong>${item.cost}</strong> ${CURRENCY_NAME}. Your new balance: <strong>${balance - item.cost}</strong>.`);

			const staffRoom = Rooms.get('staff');
			if (staffRoom) {
				const date = new Date().toUTCString();
				staffRoom.add(
					`|html|<div class="infobox">${Impulse.nameColor(user.name, true, true)} purchased <strong>${itemName}</strong> for <strong>${item.cost}</strong> ${CURRENCY_NAME}. Remaining balance: <strong>${balance - item.cost}</strong>. <small>(${date})</small></div>`
				).update();
			}
		},

		add(target, room, user) {
			this.checkCan('roomowner');
			const parts = target.split(',').map(s => s.trim());
			if (parts.length < 3) {
				return this.errorReply(`Usage: /shop add [name], [description], [cost]`);
			}

			const [name, description, costArg] = parts;
			const cost = parseInt(costArg);
			if (isNaN(cost) || cost <= 0) {
				return this.errorReply(`Cost must be a positive number.`);
			}

			if (data[name]) {
				return this.errorReply(`Item "${name}" already exists. Use /shop edit to update it.`);
			}

			data[name] = { description, cost };
			saveData();

			this.sendReply(`|raw|Added item <strong>${name}</strong> to the shop for <strong>${cost}</strong> ${CURRENCY_NAME}.`);
		},

		remove(target, room, user) {
			this.checkCan('roomowner');
			const name = target.trim();
			if (!name) return this.errorReply(`Usage: /shop remove [item name]`);

			if (!data[name]) {
				return this.errorReply(`Item "${name}" does not exist in the shop.`);
			}

			delete data[name];
			saveData();

			this.sendReply(`Removed item "${name}" from the shop.`);
		},

		edit(target, room, user) {
			this.checkCan('roomowner');
			const parts = target.split(',').map(s => s.trim());
			if (parts.length < 3) {
				return this.errorReply(`Usage: /shop edit [name], [description], [cost]`);
			}

			const [name, description, costArg] = parts;
			const cost = parseInt(costArg);
			if (isNaN(cost) || cost <= 0) {
				return this.errorReply(`Cost must be a positive number.`);
			}

			if (!data[name]) {
				return this.errorReply(`Item "${name}" does not exist. Use /shop add to create it.`);
			}

			data[name] = { description, cost };
			saveData();

			this.sendReply(`|raw|Updated item <strong>${Impulse.nameColor(name, true, true)}</strong>: "${description}" for <strong>${cost}</strong> ${CURRENCY_NAME}.`);
		},

		logs(target, room, user) {
			this.checkCan('roomowner');
			
			cleanOldLogs();

			if (!logsData.length) {
				return this.sendReplyBox(`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Shop Logs</h4></strong><hr></center>No recent shop logs found.</div>`);
			}

			const sortedLogs = [...logsData].sort((a, b) => b.timestamp - a.timestamp);

			let html = `<div style="max-height: 350px; overflow-y: auto;">`;
			html += `<center><strong><h4>Shop Logs</h4></strong><hr></center>`;
			
			const formattedLogs = sortedLogs.map(log => {
				const dateObj = new Date(log.timestamp);
				const day = String(dateObj.getDate()).padStart(2, '0');
				const month = String(dateObj.getMonth() + 1).padStart(2, '0');
				const year = dateObj.getFullYear();
				
				return `<strong>${Chat.escapeHTML(log.user)}</strong> purchased <strong>${Chat.escapeHTML(log.item)}</strong> on ${day}-${month}-${year}`;
			});

			html += formattedLogs.join('<hr>');
			html += `</div>`;

			this.sendReplyBox(html);
		},

		help(target, room, user) {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Shop Commands</h4></strong><hr></center>` +
				`<b>/shop</b> - View all available items in the shop.<hr>` +
				`<b>/shop buy [item name]</b> - Purchase an item from the shop.<hr>` +
				`<b>/shop add [name], [description], [cost]</b> - Add an item to the shop. Requires: ~<hr>` +
				`<b>/shop remove [item name]</b> - Remove an item from the shop. Requires: ~<hr>` +
				`<b>/shop edit [name], [description], [cost]</b> - Edit an existing shop item. Requires: ~<hr>` +
				`<b>/shop logs</b> - View shop purchase logs (Auto-deletes after 7 days). Requires: ~</div>`
			);
		},
	},

	shophelp: 'shop.help',
};
