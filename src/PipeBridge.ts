import {
	app
} from "electron";
import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import EventEmitter from "events";
import fs from "fs";

type EventData = {
	event: string;
	data: any;
};

type PipeBridgeConfig = {
	asar?: {
		debugPath: string;
		releasePath: string;
	};
	binary?: {
		path?: string;
		selfPath?: string;
	};
};

class PipeBridge extends EventEmitter {
	public process?: ChildProcess;

	constructor(private config?: PipeBridgeConfig) {
		super();
		this.config = config;
		if (process) {
			process.removeAllListeners();
			process.on('message', (data: EventData) => {
				this.emit(`event:${data.event}`, data.data);
			});
		}
	}

	private makeProcess() {
		if (this.process || !this.config) return;

		if (this.config.asar?.releasePath && this.config.asar?.debugPath) {
			const childPath = app.isPackaged
				? this.config?.asar?.releasePath
				: path.join(app.getAppPath(), this.config?.asar?.debugPath);

			this.process = spawn(process.execPath, [childPath], {
				detached: false,
				stdio:  ['inherit', 'inherit', 'inherit', 'ipc'],
				env: {
					...process.env,
					TARGET_ASAR: childPath
				}
			});
		}

		if (this.config.binary) {
			const configPath = this.config.binary.selfPath
				? path.join(app.getAppPath(), this.config.binary.selfPath)
				: this.config.binary.path;
			const binaryPath = this.getExistPath(configPath!);

			if (!binaryPath) return;
			
			this.process = spawn(binaryPath, [], {
				detached: false,
				stdio:  ['inherit', 'inherit', 'inherit', 'ipc'],
				env: {
					...process.env
				}
			});
		}
	}

	private getExistPath(fullPath: string) {
		const extensions = process.platform === 'win32' 
			? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') 
			: [''];

		if (fs.existsSync(fullPath)) return fullPath;

		for (let ext of extensions) {
			const pathWithExt = fullPath + ext.toLowerCase();
			if (fs.existsSync(pathWithExt)) {
				return pathWithExt;
			}
		}

		return null;
	}

	public start(config?: PipeBridgeConfig) {
		this.config = config;
		return new Promise((resolve, reject) => {
			this.makeProcess();

			if (!this.process) return;
			
			this.process.on('spawn', resolve);
			this.process.on('error', reject);

			this.process.on('close', () => {
				this.process = undefined;
			});
		});
	}

	public stop() {
		if (!this.process) return;
		this.process.kill();
	}

	public send(event: string, data: any) {
		if (this.process) {
			this.process.send({
				event,
				data
			});
		} else if (typeof process.send === 'function') {
			process.send({
				event,
				data
			});
		}
	}

	public receive(event: string, callback: (data: any) => void) {
		if (this.process) {
			this.process.on('message', (result: EventData) => {
				if (result.event === event) {
					callback(result.data);
				}
			});
		} else if (typeof process.send === 'function') {
			this.on(`event:${event}`, callback);
		}
	}

}

export {
	PipeBridge
};

export const pipeBridge = new PipeBridge();