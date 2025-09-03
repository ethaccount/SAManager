export type PendingRequest<ParamsType = unknown> = {
	method: string
	params: ParamsType
	resolve: (value: unknown) => void
	reject: (reason?: unknown) => void
}
