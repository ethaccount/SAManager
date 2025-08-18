import { type Emitter } from 'mitt'

export interface RequestArguments {
	readonly method: string
	readonly params?: readonly unknown[] | object
}

export interface ProviderRpcError extends Error {
	message: string
	code: number
	data?: unknown
}

interface ProviderConnectInfo {
	readonly chainId: string
}

export interface ProviderMessage {
	readonly type: string
	readonly data: unknown
}

export type ProviderEventMap = {
	connect: ProviderConnectInfo
	disconnect: ProviderRpcError
	chainChanged: string // hex string
	accountsChanged: string[]
	message: ProviderMessage
}

export type ProviderEventEmitter = Emitter<ProviderEventMap>

export interface ProviderInterface {
	request(args: RequestArguments): Promise<unknown>
	disconnect(): Promise<void>
	emit<K extends keyof ProviderEventMap>(event: K, payload: ProviderEventMap[K]): void
	on<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void
	removeListener<K extends keyof ProviderEventMap>(event: K, handler: (payload: ProviderEventMap[K]) => void): void
}

export type Address = string
export type HexString = string
