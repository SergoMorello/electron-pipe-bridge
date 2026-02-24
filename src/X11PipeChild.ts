import path from 'path';
import { app } from "electron";
import { ChildProcess, spawn } from 'child_process';

class X11PipeChild {
	public process?: ChildProcess;

	public start(asarFile: string) {
		return new Promise((resolve, reject) => {
			if (this.process) return;
			// Если второе приложение лежит рядом с основным .exe в папке resources
			const childPath = app.isPackaged
			? path.join(process.resourcesPath, asarFile)
			: path.join(app.getAppPath(), `assets/${asarFile}`);

			// Запускаем через наш же бинарник, передавая путь к другому ASAR
			this.process = spawn(process.execPath, [childPath], {
				detached: false, // Если true, дочернее выживет после закрытия родителя
				stdio:  ['inherit', 'inherit', 'inherit', 'ipc'], // Проброс логов в консоль родителя для отладки
				env: {
					...process.env,
					TARGET_ASAR: childPath
				}
			});
			
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
		if (!this.process) return;
		this.process.send({
			event,
			data
		});
	}

	public on(event: string, callback: (data: any) => void) {
		if (!this.process) return;
		this.process.on('message', (result) => {
			//@ts-ignore
			if (result.event === event) {
				//@ts-ignore
				callback(result.data);
			}
		});
	}
}

export const x11PipeChild = new X11PipeChild();