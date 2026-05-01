/*
* News chat-plugin
* @author PrinceSky-Git
*/
import { FS } from '../../../lib';
import { toID } from '../../../sim/dex';

const DATA_FILE = 'impulse/db/server-news.json';

interface NewsEntry {
	id: string;
	title: string;
	postedBy: string;
	desc: string;
	postTime: string;
	timestamp: number;
}

interface ServerNewsData {
	news: { [id: string]: NewsEntry };
	blocks: { [userId: string]: boolean };
}

let data: ServerNewsData = {
	news: {},
	blocks: {},
};

const serverName = Config.Server_Name || 'Impulse';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (date: Date = new Date()): string =>
	`${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;

const saveData = (): void => {
	FS(DATA_FILE).writeUpdate(() => JSON.stringify(data));
};

const loadData = async (): Promise<void> => {
	try {
		const raw = await FS(DATA_FILE).readIfExists();
		if (raw) {
			const json = JSON.parse(raw);
			// merge with defaults to prevent crashes if keys are missing
			data = {
				news: json.news || {},
				blocks: json.blocks || {},
			};
		}
	} catch (e) {
		console.error('Failed to load server news:', e);
		// if load fails, keep default empty state to prevent crashes
		data = { news: {}, blocks: {} };
	}
};

void loadData();

const generateNewsDisplay = (): string[] => {
	if (!data.news) return [];

	const news = Object.values(data.news)
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, 2);

	return news.map(entry =>
		`<center><strong>${entry.title}</strong></center><br>${entry.desc}<br><br>` +
		`<small>-<em> ${Impulse.nameColor(entry.postedBy, true, false)}</em> on ${entry.postTime}</small>`
	);
};

const onUserConnect = (user: User): void => {
	if (!data.news || Object.keys(data.news).length === 0) return;
	if (data.blocks && data.blocks[user.id]) return;

	const news = generateNewsDisplay();
	if (news.length) {
		user.send(`|pm| ${serverName} News|${user.getIdentity()}|/raw ${news.join('<hr>')}`);
	}
};

const addNews = (id: string, title: string, desc: string, user: User): void => {
	if (!data.news) data.news = {};
	data.news[id] = {
		id,
		title,
		postedBy: user.name,
		desc,
		postTime: formatDate(),
		timestamp: Date.now(),
	};
	saveData();
};

const deleteNews = (id: string): boolean => {
	if (!data.news?.[id]) return false;
	delete data.news[id];
	saveData();
	return true;
};

const blockNews = (userid: string): void => {
	if (!data.blocks) data.blocks = {};
	data.blocks[userid] = true;
	saveData();
};

const unblockNews = (userid: string): boolean => {
	if (!data.blocks?.[userid]) return false;
	delete data.blocks[userid];
	saveData();
	return true;
};

const parseTargetArgs = (target: string): [string, string] => {
	const [title, ...descParts] = target.split(',');
	return [title, descParts.join(',')];
};

const validateNewsArgs = (target: string, context: Chat.CommandContext): [string, string] | null => {
	if (!target) {
		context.parse('/help servernewshelp');
		return null;
	}
	const [title, desc] = parseTargetArgs(target);
	if (!desc) {
		throw new Chat.ErrorMessage("Usage: /servernews add [title], [desc]");
	}
	return [title, desc];
};

export const loginfilter = (user: User, oldUser: User | null, userType: string): void => {
	onUserConnect(user);
};

export const commands: Chat.ChatCommands = {
	servernews: {
		'': 'view',
		display: 'view',
		view(target, room, user): void {
			const news = generateNewsDisplay();
			const output = news.length ?
				`<center><strong>Server News:</strong></center>${news.join('<hr>')}` :
				`<center><strong>Server News:</strong></center><center><em>No news.</em></center>`;

			user.send(`|popup||html|<div class="infobox">${output}</div>`);
		},

		add(target, room, user): void {
			this.checkCan('roomowner');
			const args = validateNewsArgs(target, this);
			if (!args) return;
			const [title, desc] = args;
			const id = toID(title);

			if (data.news && data.news[id]) {
				throw new Chat.ErrorMessage(`"${title}" exists.`);
			}

			addNews(id, title, desc, user);
			this.sendReply(`Added: "${title}"`);
		},

		remove: 'delete',
		delete(target, room, user): void {
			this.checkCan('roomowner');
			if (!target) return this.parse('/help servernewshelp');

			const id = toID(target);
			if (!deleteNews(id)) {
				throw new Chat.ErrorMessage(`News "${target}" not found.`);
			}

			this.sendReply(`Deleted: "${target}"`);
		},

		block(target, room, user): void {
			const userid = toID(user.name);
			if (data.blocks && data.blocks[userid]) {
				throw new Chat.ErrorMessage("You have already blocked server news.");
			}

			blockNews(userid);
			this.sendReply("You have blocked server news. You will no longer receive news on login.");
		},

		unblock(target, room, user): void {
			const userid = toID(user.name);
			if (!unblockNews(userid)) {
				throw new Chat.ErrorMessage("You have not blocked server news.");
			}

			this.sendReply("You have unblocked server news. You will now receive news on login.");
		},
	},
	svn: 'servernews',

	servernewshelp() {
		if (!this.runBroadcast()) return;
		this.sendReplyBox(
			`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Server News Commands</strong></h4><hr>Commands Alias: /svn</center><hr>` +
			`<b>/servernews view</b> - View the latest 2 server news.<hr>` +
			`<b>/servernews add [title], [desc]</b> - Add a news. Requires: ~<hr>` +
			`<b>/servernews delete [title]</b> - Delete a news. Requires: ~<hr>` +
			`<b>/servernews block</b> - Block server news on login.<hr>` +
			`<b>/servernews unblock</b> - Unblock server news on login.</div>`
		);
	},
	svnhelp: 'servernewshelp',
};
