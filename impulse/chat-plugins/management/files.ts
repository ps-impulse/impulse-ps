/*
* Files chat-plugin
* @author PrinceSky-Git
*/
import { FS, Utils } from '../../../lib';
import { Check_White_Listed } from '../../impulse-utils';

const getErrorMessage = (err: unknown): string => {
	return err instanceof Error ? err.message : String(err);
};

export const commands: Chat.ChatCommands = {
	async fileread(target, room, user): Promise<void> {
		if (!this.runBroadcast()) return;
		this.checkCan('bypassall');
		Check_White_Listed(user);

		if (!target) {
			throw new Chat.ErrorMessage('Please specify a file path.');
		}

		const filePath = target.trim();

		try {
			const file = FS(filePath);

			if (!await file.exists()) {
				throw new Chat.ErrorMessage(`File not found: ${filePath}`);
			}

			if (!await file.isFile()) {
				throw new Chat.ErrorMessage(`Path is not a file: ${filePath}`);
			}

			const content = await file.read();

			return this.sendReplyBox(
				`<details>` +
				`<summary>File: ${Utils.escapeHTML(filePath)}</summary>` +
				`<pre style="max-height: 400px; overflow-y: auto;">` +
				`${Utils.escapeHTML(content)}</pre>` +
				`</details>`
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			throw new Chat.ErrorMessage(`Failed to read file: ${message}`);
		}
	},

	async filedelete(target, room, user): Promise<void> {
		if (!this.runBroadcast()) return;
		this.checkCan('bypassall');
		Check_White_Listed(user);

		if (!target) {
			throw new Chat.ErrorMessage('Please specify a file path.');
		}

		const filePath = target.trim();

		try {
			const file = FS(filePath);

			if (!await file.exists()) {
				throw new Chat.ErrorMessage(`File not found: ${filePath}`);
			}

			await file.unlinkIfExists();

			return this.sendReply(`File deleted: ${filePath}`);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			throw new Chat.ErrorMessage(`Failed to delete file: ${message}`);
		}
	},

	async filemove(target, room, user): Promise<void> {
		if (!this.runBroadcast()) return;
		this.checkCan('bypassall');
		Check_White_Listed(user);

		const [source, destination] = target.split(',').map(s => s.trim());

		if (!source || !destination) {
			throw new Chat.ErrorMessage('Usage: /filemove source, destination');
		}

		try {
			const sourceFile = FS(source);

			if (!await sourceFile.exists()) {
				throw new Chat.ErrorMessage(`Source file not found: ${source}`);
			}

			await sourceFile.rename(FS(destination).path);

			return this.sendReply(`File moved from ${source} to ${destination}`);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			throw new Chat.ErrorMessage(`Failed to move file: ${message}`);
		}
	},

	async filecopy(target, room, user): Promise<void> {
		if (!this.runBroadcast()) return;
		this.checkCan('bypassall');
		Check_White_Listed(user);

		const [source, destination] = target.split(',').map(s => s.trim());

		if (!source || !destination) {
			throw new Chat.ErrorMessage('Usage: /filecopy source, destination');
		}

		try {
			const sourceFile = FS(source);

			if (!await sourceFile.exists()) {
				throw new Chat.ErrorMessage(`Source file not found: ${source}`);
			}

			const content = await sourceFile.read();
			await FS(destination).write(content);

			return this.sendReply(`File copied from ${source} to ${destination}`);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			throw new Chat.ErrorMessage(`Failed to copy file: ${message}`);
		}
	},

	async filerename(target, room, user): Promise<void> {
		if (!this.runBroadcast()) return;
		this.checkCan('bypassall');
		Check_White_Listed(user);

		const [source, destination] = target.split(',').map(s => s.trim());

		if (!source || !destination) {
			throw new Chat.ErrorMessage('Usage: /filerename source, destination');
		}

		try {
			const sourceFile = FS(source);

			if (!await sourceFile.exists()) {
				throw new Chat.ErrorMessage(`Source file not found: ${source}`);
			}

			await sourceFile.rename(FS(destination).path);

			return this.sendReply(`File renamed from ${source} to ${destination}`);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			throw new Chat.ErrorMessage(`Failed to rename file: ${message}`);
		}
	},

	async fileupload(target, room, user): Promise<void> {
		if (!this.runBroadcast()) return;
		this.checkCan('bypassall');
		Check_White_Listed(user);

		if (!target) {
			throw new Chat.ErrorMessage('Please specify a file path.');
		}

		const filePath = target.trim();

		try {
			const file = FS(filePath);

			if (!await file.exists()) {
				throw new Chat.ErrorMessage(`File not found: ${filePath}`);
			}

			if (!await file.isFile()) {
				throw new Chat.ErrorMessage(`Path is not a file: ${filePath}`);
			}

			const content = await file.read();
			const fileName = filePath.split('/').pop() || 'file.txt';

			const gistData = {
				description: `Uploaded from Pokemon Showdown: ${filePath}`,
				public: false,
				files: {
					[fileName]: {
						content,
					},
				},
			};

			const response = await fetch('https://api.github.com/gists', {
				method: 'POST',
				headers: {
					'Accept': 'application/vnd.github+json',
					'Authorization': `Bearer ${Config.Github_Token}`,
					'X-GitHub-Api-Version': '2022-11-28',
					'User-Agent': 'Pokemon-Showdown',
				},
				body: JSON.stringify(gistData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMsg = errorData.message || response.statusText;
				throw new Chat.ErrorMessage(`Failed to upload to Gist: ${errorMsg}`);
			}

			const result = await response.json();

			return this.sendReplyBox(
				`<strong>File uploaded successfully!</strong><br />` +
				`File: ${Utils.escapeHTML(filePath)}<br />` +
				`Gist URL: <a href="${result.html_url}" target="_blank">${result.html_url}</a>`
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			throw new Chat.ErrorMessage(`Failed to upload file: ${message}`);
		}
	},

	async filesave(target, room, user): Promise<void> {
		if (!this.runBroadcast()) return;
		this.checkCan('bypassall');
		Check_White_Listed(user);

		const [filePath, url] = target.split(',').map(s => s.trim());

		if (!filePath || !url) {
			throw new Chat.ErrorMessage('Usage: /filesave [path], [GitHub/Gist raw URL]');
		}

		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Pokemon-Showdown',
				},
			});

			if (!response.ok) {
				throw new Chat.ErrorMessage(
					`Failed to fetch content from URL: ${response.statusText}`
				);
			}

			const content = await response.text();

			const file = FS(filePath);
			await file.write(content);

			return this.sendReply(
				`File saved successfully: ${filePath} (${content.length} bytes)`
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			throw new Chat.ErrorMessage(`Failed to save file: ${message}`);
		}
	},

	filehelp() {
		if (!this.runBroadcast()) return;
		this.sendReplyBox(
			`<div style="max-height: 350px; overflow-y: auto;"><center><strong><h4>File Commands</strong></h4></center><hr>` +
			`<b>/fileread [path]</b> - Reads and displays the contents of a file. Requires: Whitelisted User<hr>` +
			`<b>/filedelete [path]</b> - Deletes a file. Requires: Whitelisted User<hr>` +
			`<b>/filemove [source], [destination]</b> - Moves a file. Requires: Whitelisted User<hr>` +
			`<b>/filecopy [source], [destination]</b> - Copies a file. Requires: Whitelisted User<hr>` +
			`<b>/filerename [source], [destination]</b> - Renames a file. Requires: Whitelisted User<hr>` +
			`<b>/fileupload [path]</b> - Uploads a file to GitHub Gist. Requires: Whitelisted User<hr>` +
			`<b>/filesave [path], [GitHub/Gist raw URL]</b> - Downloads and saves a file from URL. Requires: Whitelisted User</div>`
		);
	},
};
