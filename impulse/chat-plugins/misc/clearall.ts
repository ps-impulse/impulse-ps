/*
* Clearall chat-plugin
* Refactor by @PrinceSky-Git
*/
interface ClearResult {
	cleared: string[];
	failed: string[];
}

interface HelpEntry {
	cmd: string;
	desc: string;
}

const rejoinUsersToRoom = (room: Room, userIds: ID[]): void => {
	for (const userId of userIds) {
		const u = Users.get(userId);
		if (!u) continue;
		for (const conn of u.connections) {
			u.joinRoom(room, conn);
		}
	}
};

const leaveUsersFromRoom = (room: Room, userIds: ID[]): void => {
	for (const userId of userIds) {
		const u = Users.get(userId);
		if (!u) continue;
		for (const conn of u.connections) {
			u.leaveRoom(room, conn);
		}
	}
};

const clearRooms = (rooms: Room[], _user: User): ClearResult => {
	const cleared: string[] = [];
	const failed: string[] = [];

	for (const room of rooms) {
		if (!room) continue;
		if (room.game?.gameid === 'tournament') {
			failed.push(room.id);
			continue;
		}

		if (Array.isArray(room.log?.log)) {
			room.log.log.length = 0;
		}

		const userIds = Object.keys(room.users) as ID[];
		leaveUsersFromRoom(room, userIds);
		cleared.push(room.id);

		// re-join users after a short delay to allow the client to process the clear.
		setTimeout(() => {
			rejoinUsersToRoom(room, userIds);
		}, 1000);
	}

	return { cleared, failed };
};

const generateHelpHTML = (title: string, helpList: HelpEntry[]): string => {
	const items = helpList
		.map(({ cmd, desc }, i) =>
			`<li><b>${cmd}</b> - ${desc}</li>${i < helpList.length - 1 ? '<hr>' : ''}`
		)
		.join('');

	return (
		`<center><strong>${title}:</strong></center>` +
		`<hr><ul style="list-style-type:none;padding-left:0;">${items}</ul>`
	);
};

export const commands: Chat.ChatCommands = {
	clearall: {
		''(target, room, user): void {
			if (room?.battle) return this.sendReply('Cannot clearall in battle rooms.');
			if (!room) throw new Chat.ErrorMessage('Requires a room.');

			this.checkCan('roommod', null, room);

			const { failed } = clearRooms([room], user);
			if (failed.length) {
				throw new Chat.ErrorMessage(
					`Cannot clear room "${room.id}" because a tournament is running.`
				);
			}
		},

		global(target, room, user): void {
			this.checkCan('roomowner');

			const rooms = Rooms.global.chatRooms.filter((r): r is Room => !!r && !r.battle);
			const { failed } = clearRooms(rooms, user);

			if (failed.length) {
				throw new Chat.ErrorMessage(
					`Cannot clear the following rooms because a tournament is running: ${failed.join(', ')}`
				);
			}
		},

		help() {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>Clearall Commands</strong></h4><hr>Commands Alias: /globalclearall</center><hr>` +
				`<b>/clearall</b> - Clear the current room chat. Requires: #<hr>` +
				`<b>/clearall global</b> - Clear all public rooms. Requires: ~</div>`
			);
		},
	},

	globalclearall(): void { this.parse('/clearall global'); },
	clearallhelp(): void { this.parse('/clearall help'); },
};
