import { ValidationMethodData } from '@/lib/validations'
import { JSONParse, JSONStringify } from 'json-with-bigint'
import { defineStore, storeToRefs } from 'pinia'
import { isSameAddress } from 'sendop'

export type InitCodeData = {
	address: string
	initCode: string
	vMethod: ValidationMethodData
}

export const useInitCodeStore = defineStore(
	'useInitCodeStore',
	() => {
		const initCodeList = ref<InitCodeData[]>([])

		function addInitCode(initCodeData: InitCodeData) {
			// throw an error if the address is same but the initCode is different
			if (
				initCodeList.value.some(
					i => isSameAddress(i.address, initCodeData.address) && i.initCode !== initCodeData.initCode,
				)
			) {
				throw new Error(`addInitCode: initCode conflict for address ${initCodeData.address}`)
			}
			// if the address is in the list and the initCode is the same, do nothing
			if (
				initCodeList.value.some(
					i => isSameAddress(i.address, initCodeData.address) && i.initCode === initCodeData.initCode,
				)
			) {
				return
			}
			initCodeList.value.push(initCodeData)
		}

		function removeInitCode(address: string) {
			initCodeList.value = initCodeList.value.filter(i => !isSameAddress(i.address, address))
		}

		function hasInitCode(address: string) {
			return initCodeList.value.some(i => isSameAddress(i.address, address))
		}

		function getInitCodeData(address: string) {
			return initCodeList.value.find(i => isSameAddress(i.address, address))
		}

		return {
			initCodeList,
			addInitCode,
			removeInitCode,
			hasInitCode,
			getInitCodeData,
		}
	},
	{
		persist: {
			pick: ['initCodeList'],
			// Note: If the stored data contains bigint, a serializer must be used.
			// Otherwise, the state will be ignored and not saved to local storage.
			serializer: {
				deserialize: JSONParse,
				serialize: JSONStringify,
			},
		},
	},
)

export function useInitCode() {
	const store = useInitCodeStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
