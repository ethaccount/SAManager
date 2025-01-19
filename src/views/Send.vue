<script setup lang="ts">
import { AutoForm } from '@/components/ui/auto-form'
import { Button } from '@/components/ui/button'
import * as z from 'zod'

const schema = z.object({
	to: z
		.string({
			required_error: 'Address is required.',
		})
		.min(42, {
			message: 'Address must be at least 42 characters.',
		})
		.default('0x9e8f8C3Ad87dBE7ACFFC5f5800e7433c8dF409F2'),

	value: z.coerce
		.number({
			invalid_type_error: 'Value must be a number.',
		})
		.min(0, {
			message: 'Value must be at least 0.',
		})
		.max(10, {
			message: 'Value must be at most 10.',
		})
		.default(0),

	calldata: z.string().optional(),
})

function onSubmit(values: Record<string, any>) {
	console.log(values)
}
</script>

<template>
	<AutoForm
		class="w-full space-y-3"
		:schema="schema"
		:field-config="{
			to: {
				inputProps: {
					placeholder: '0x',
				},
			},
			calldata: {
				inputProps: {
					placeholder: '0x',
				},
			},
		}"
		@submit="onSubmit"
	>
		<Button type="submit"> Send Operations </Button>
	</AutoForm>
</template>
