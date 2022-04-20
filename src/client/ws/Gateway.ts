import type { APIMessage, APIUnavailableGuild, GatewayReadyDispatch } from 'discord-api-types/v10';
import { WebSocket } from 'ws';
import { Guild, Message } from '../../structures';
import { log } from '../../utils/logger';
import type { Client } from '../Client';

export class Gateway {
	private HEARTBEAT_INTERVAL = 0;
	private lastSequence: number | undefined;
	private lastHeartbeat = 0;

	private readyGuilds: APIUnavailableGuild[] = [];

	private socket = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');

	public constructor(private client: Client) {}

	public _init(token: string, intents: number) {
		this.socket.addEventListener('open', () => {
			log({ state: 'WS', message: 'Connected to API' });
		});

		this.socket.addEventListener('message', (message) => {
			const buffer = JSON.parse((message.data as string | Buffer | Buffer[]).toString());
			log({ state: 'WS', json: buffer });

			if (buffer.s) this.lastSequence = buffer.s;

			if (this.HEARTBEAT_INTERVAL === 0 && buffer.op === 10) {
				this.HEARTBEAT_INTERVAL = buffer.d.heartbeat_interval;

				log({ state: 'WS', message: `Sending a heartbeat every ${this.HEARTBEAT_INTERVAL}ms + jitter time` });
				log({ state: 'WS', message: 'Identifying' });

				this.send({
					op: 2,
					d: {
						token,
						intents,
						properties: {
							$os: process ? process.platform : 'ailurus',
							$browser: 'ailurus',
							$device: 'ailurus'
						}
					}
				});

				log({ state: 'WS', message: 'Identified' });

				return this.heartbeat();
			}

			if (buffer.op === 11) {
				log({ state: 'WS', message: `Heartbeat acknowledged in ${Date.now() - this.lastHeartbeat}ms` });
			}

			switch (buffer.op) {
				case 0: {
					switch (buffer.t) {
						case 'READY': {
							const readyPayload = buffer as GatewayReadyDispatch;
							this.readyGuilds = readyPayload.d.guilds;

							break;
						}
						case 'GUILD_CREATE': {
							if (this.readyGuilds.length > 0) {
								const g = new Guild(buffer.d, this.client);
								this.client.guilds.set(g.id, g);

								g.channels.forEach((c) => this.client.channels.set(c.id, c));

								this.readyGuilds = this.readyGuilds.filter((x) => x.id !== g.id);
								if (this.readyGuilds.length === 0) this.client.emit('ready'), log({ state: 'WS', message: 'Guilds loaded' });
							}
							break;
						}
						case 'MESSAGE_CREATE': {
							const apiMessage = buffer.d as APIMessage;

							const message = new Message(apiMessage, this.client);
							this.client.emit('message', message);
						}
					}
				}
			}
		});
	}

	private send(options: any) {
		this.socket.send(JSON.stringify(options));
	}

	private heartbeat() {
		setTimeout(() => {
			this.send({
				op: 1,
				d: this.lastSequence
			});

			log({ state: 'WS', message: 'Heartbeating' });
			this.lastHeartbeat = Date.now();

			this.heartbeat();
		}, this.HEARTBEAT_INTERVAL + Math.random());
	}
}
