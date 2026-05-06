export type ClanView = 'main' | 'profile' | 'list' | 'members' | 'logs' | 'wars';

export interface ClanUIState {
	view: ClanView;
	targetId?: string;
	page?: number;
}

export const uiState: Record<string, ClanUIState> = {};

export function getUIState(userid: string): ClanUIState {
	if (!uiState[userid]) {
		uiState[userid] = { view: 'main' };
	}
	return uiState[userid];
}

export function setUIState(userid: string, state: Partial<ClanUIState>): void {
	uiState[userid] = { ...getUIState(userid), ...state };
}
