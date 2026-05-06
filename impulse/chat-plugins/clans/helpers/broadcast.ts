/*
 * Pokemon Showdown - Impulse Server
 * Clans Broadcast Helper
 * @author PrinceSky-Git
 */

import { LOBBY_ROOM_ID } from '../constants';
import type { ClanWar } from '../interface';
import type { ClanDoc } from '../database';
import { generateWarCard } from './html';

type BroadcastMode = 'new' | 'change';

/**
 * Broadcasts an HTML message to a single room if it exists.
 *
 * @param roomId  - The room ID to broadcast to
 * @param message - The raw PS protocol message string to send
 */
export function broadcastToRoom(roomId: RoomID | ID, message: string): void {
	const room = Rooms.get(roomId);
	if (room) room.add(message).update();
}

/**
 * Broadcasts a uhtml or uhtmlchange message to a room if it exists.
 *
 * @param roomId   - The room ID to broadcast to
 * @param uhtmlId  - The uhtml identifier
 * @param html     - The HTML content to display
 * @param mode     - 'new' uses |uhtml|, 'change' uses |uhtmlchange|
 */
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

/**
 * Broadcasts a uhtml/uhtmlchange message to multiple rooms at once.
 *
 * @param roomIds  - Array of room IDs to broadcast to
 * @param uhtmlId  - The uhtml identifier
 * @param html     - The HTML content to display
 * @param mode     - 'new' uses |uhtml|, 'change' uses |uhtmlchange|
 */
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

/**
 * Broadcasts a war card update to both clan rooms and the lobby.
 * Generates perspective-appropriate HTML for each room automatically.
 *
 * @param war      - The current war document
 * @param clan1    - The challenger clan (clans[0])
 * @param clan2    - The target clan (clans[1])
 * @param uhtmlId  - The uhtml identifier for this war card
 * @param mode     - 'new' uses |uhtml|, 'change' uses |uhtmlchange|
 * @param options  - Optional extra data passed to generateWarCard
 */
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

/**
 * Broadcasts a war ended card to both clan rooms and the lobby.
 * Uses the same HTML for all three rooms since the war is over.
 *
 * @param war        - The completed war document
 * @param clan1      - The challenger clan (clans[0])
 * @param clan2      - The target clan (clans[1])
 * @param uhtmlId    - The uhtml identifier for this war card
 * @param endMessage - The message to display on the ended card
 */
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

/**
 * Broadcasts a plain HTML infobox message to a clan room and optionally the lobby.
 *
 * @param clanChatRoom  - The clan's chat room ID
 * @param html          - The HTML content to display
 * @param toLobby       - Whether to also broadcast to the lobby room
 */
export function broadcastClanMessage(
	clanChatRoom: RoomID | ID,
	html: string,
	toLobby = false
): void {
	broadcastToRoom(clanChatRoom, html);
	if (toLobby) broadcastToRoom(LOBBY_ROOM_ID, html);
}

/**
 * Returns the standard uhtml ID for a given war document.
 *
 * @param warId - The war's _id field
 * @returns A consistent uhtml ID string
 */
export function getWarUhtmlId(warId: ID): string {
	return `clan-war-card-${warId}`;
}
