export type PipeMessageType = 'comamnd' | undefined;

export type EventData = {
	event: string;
	data: any;
	type: PipeMessageType;
};

export type PipeBridgeConfig = {
	asar?: {
		debugPath: string;
		releasePath: string;
	};
	binary?: {
		path?: string;
		selfPath?: string;
	};
};


export type PipeEvents = {
	'start': [];
	'error': [error: Error];
	'close': [];
	'message': [data: any];
	'ready': [];
};