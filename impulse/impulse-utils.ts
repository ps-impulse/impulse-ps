/**
 * Impulse Utilities
 * Shared helpers for chat-plugins.
 */

import { FS } from '../lib';
const CONFIG_PATH = 'config/custom.css';
 
export const Table = (title: string, headerRow: string[], dataRows: string[][]): string => {
	let output = `<div class="themed-table-container" style="max-width: 100%; max-height: 380px; overflow-y: auto;">`;
	output += `<h3 class="themed-table-title">${title}</h3>`;
	output += `<table class="themed-table" style="width: 100%; border-collapse: collapse;">`;
	output += `<tr class="themed-table-header">`;
	headerRow.forEach(header => { output += `<th>${header}</th>`; });
	output += `</tr>`;
	dataRows.forEach(row => {
		output += `<tr class="themed-table-row">`;
		row.forEach(cell => { output += `<td>${cell}</td>`; });
		output += `</tr>`;
	});
	output += `</table></div>`;
	return output;
};

export const Check_White_Listed = (user: User): void => {
	if (!Config.WhiteListed?.includes(user.id)) {
		throw new Chat.ErrorMessage('You are not whitelisted to use this command.');
	}
};

export const ensureCustomCSS = async (): Promise<void> => {
    try {
        const existing = await FS(CONFIG_PATH).readIfExists();
        if (existing === null || existing === undefined) {
            await FS(CONFIG_PATH).write('');
        }
    } catch (e) {
        console.error('Failed to ensure custom.css exists:', e);
    }
};
