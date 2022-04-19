export interface APIGuild {
	id: string;
	name: string;
	icon?: string;
	channels: APIChannel[];
	roles: APIRole[];
}

export interface APIRole {
	id: string;
	name: string;
	color: number;
	hoist: boolean;
	icon?: string;
	unicode_emoji?: string;
	position: number;
	permissions: string;
	managed: boolean;
	mentionable: boolean;
	// TODO: type this properly
	tags: Record<string, any>;
}

export interface APIUser {
	username: string;
	discriminator: string;
	id: string;
	bot: boolean;
}

export interface APIMessage {
	id: string;
	content: string;
	guild_id: string;
	channel_id: string;
	author: APIUser;
}

export interface APIChannel {
	id: string;
	name: string;
}
