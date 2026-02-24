import { 
	type BrowserWindow,
	contextBridge,
	ipcMain,
	ipcRenderer
} from "electron";

type EventData = {
	event: string;
	data: any;
};

declare global {
	interface Window {
		x11Pipe?: {
			on: (event: string, callback: (data: EventData) => void) => (() => void);
			send: (event: string, data: any) => void;
		};
	}
};

class X11Pipe {
	private window?: BrowserWindow;

	public send(event: string, data: any) {
		if (!window.x11Pipe) return;
		window.x11Pipe.send(event, data);
	}

	public on(event: string, callback: (data: any) => void) {
		if (!window.x11Pipe) return;
		window.x11Pipe.on(event, (result) => {
			if (result.event === event) {
				callback(result.data);
			}
		});
	}

	public setMain(window: BrowserWindow) {
		this.window = window;
		process.on('message', (data: EventData) => {
			this.window?.webContents.send(`event:${data.event}`, data);
		});
	
		ipcMain.on('message', (_, data) => {
			process.send?.(data);
		});
	}

	public setPreload() {
		contextBridge.exposeInMainWorld("x11Pipe", {
			send: (event: string, data: any) => ipcRenderer.send('message', {event, data}),
			on: (event: string, callback: (data: any) => void) => {
				const handler = (_: any, data: any) => {
					callback(data)
				};
				ipcRenderer.on(`event:${event}`, handler);
				return () => ipcRenderer.removeListener(`event:${event}`, handler);
			}
		});
	}
}

export const x11Pipe = new X11Pipe();