import { LOBBY_ROOM_ID } from '../constants';
import type { ClanWar } from '../interface';
import type { ClanDoc } from '../database';
import { generateWarCard } from './html';

type BroadcastMode = 'new' | 'change';

export function broadcastToRoom(roomId: RoomID | ID, message: string): void {
	const room = Rooms.get(roomId);
	if (room) room.add(message).update();
}

export function broadcastUhtml(
	roomId: RoomID | ID,
	uhtmlId: string,
	html: string,
	mode: BroadcastMode = 'change'
): void {
	const room = Rooms.get(roomId);
	if (!room) return;
	const tag = mode === 'new' ? 'uhtml' : 'uhtmlchange';
	room.add(`|${tag}|${uhtmlId}|${html}`).update();
}

export function broadcastUhtmlToRooms(
	roomIds: (RoomID | ID)[],
	uhtmlId: string,
	html: string,
	mode: BroadcastMode = 'change'
): void {
	for (const roomId of roomIds) {
		broadcastUhtml(roomId, uhtmlId, html, mode);
	}
}

export function broadcastWarUpdate(
	war: ClanWar,
	clan1: ClanDoc,
	clan2: ClanDoc,
	uhtmlId: string,
	mode: BroadcastMode = 'change',
	options: {
		endMessage?: string;
		lastBattle?: { winnerName: string; loserName: string; winningClanName: string };
	} = {}
): void {
	const challengerHtml = generateWarCard(war, clan1, clan2, 'challenger', options);
	const targetHtml = generateWarCard(war, clan1, clan2, 'target', options);
	const publicHtml = generateWarCard(war, clan1, clan2, 'public', options);

	broadcastUhtml(clan1.chatRoom, uhtmlId, challengerHtml, mode);
	broadcastUhtml(clan2.chatRoom, uhtmlId, targetHtml, mode);
	broadcastUhtml(LOBBY_ROOM_ID, uhtmlId, publicHtml, mode);
}

export function broadcastWarEnded(
	war: ClanWar,
	clan1: ClanDoc,
	clan2: ClanDoc,
	uhtmlId: string,
	endMessage: string
): void {
	const endedHtml = generateWarCard(war, clan1, clan2, 'ended', { endMessage });

	broadcastUhtml(clan1.chatRoom, uhtmlId, endedHtml, 'change');
	broadcastUhtml(clan2.chatRoom, uhtmlId, endedHtml, 'change');
	broadcastUhtml(LOBBY_ROOM_ID, uhtmlId, endedHtml, 'change');
}

export function broadcastClanMessage(
	clanChatRoom: RoomID | ID,
	html: string,
	toLobby = false
): void {
	broadcastToRoom(clanChatRoom, html);
	if (toLobby) broadcastToRoom(LOBBY_ROOM_ID, html);
}

export function getWarUhtmlId(warId: ID): string {
	return `clan-war-card-${warId}`;
}
