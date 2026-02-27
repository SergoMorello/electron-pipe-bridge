import {
	app
} from "electron";
import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import EventEmitter from "events";
import fs from "fs";
import { EventData, PipeBridgeConfig, PipeEvents, PipeMessageType } from "./types";

class PipeBridge extends EventEmitter<PipeEvents> {
	public process?: ChildProcess;

	constructor(private config?: PipeBridgeConfig) {
		super();
		this.config = config;
		if (typeof process !== 'undefined') {
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

			this.process.on('spawn', (e) => {
				resolve(e);
				this.emit('start');
			});

			this.process.on('error', (e) => {
				reject(e);
				this.emit('error', e);
			});

			this.process.on('close', () => {
				this.process = undefined;
				this.emit('close');
			});

			this.process.on('message', (data: EventData) => {
				if (data.type === 'comamnd') {
					if (data.event === '__isReady') {
						this.emit('ready');
					}
				}else{
					this.emit('message', data);
				}
			});
		});
	}

	public stop() {
		if (!this.process) return;
		this.process.kill();
	}

	public ready() {
		this.send('__isReady', undefined, 'comamnd');
	}

	public send(event: string, data?: any, type?: PipeMessageType) {
		if (this.process) {
			this.process.send({
				event,
				data,
				type
			});
		} else if (typeof process.send === 'function') {
			process.send({
				event,
				data,
				type
			});
		}
	}

	public receive(event: string, callback: (data: any) => void) {
		if (this.process) {
			this.process.on('message', (result: EventData) => {
				if (result.type === undefined && result.event === event) {
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