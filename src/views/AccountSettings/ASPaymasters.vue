<script setup lang="ts">
// Mock data for paymasters
const paymasters = [
	{ id: 'open', name: 'Public Paymaster', description: 'General purpose paymaster for gas sponsorship' },
	{ id: 'circle', name: 'Circle USDC Paymaster', description: 'Pay gas fees with USDC' },
]

const selectedPaymaster = ref(paymasters[0])
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Paymasters</CardTitle>
			<CardDescription>Configure paymaster options for gas sponsorship</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-6">
				<div class="space-y-4">
					<h3 class="text-sm font-medium">Select Default Paymaster</h3>
					<div class="grid gap-3">
						<div
							v-for="paymaster in paymasters"
							:key="paymaster.id"
							class="border rounded-md p-4 cursor-pointer transition-colors"
							:class="[
								selectedPaymaster.id === paymaster.id
									? 'border-primary bg-primary/5'
									: 'hover:bg-accent',
							]"
							@click="selectedPaymaster = paymaster"
						>
							<div class="flex items-start">
								<div class="flex-1">
									<div class="font-medium">{{ paymaster.name }}</div>
									<div class="text-sm text-muted-foreground mt-1">
										{{ paymaster.description }}
									</div>
								</div>
								<div
									class="w-4 h-4 rounded-full border-2"
									:class="[
										selectedPaymaster.id === paymaster.id
											? 'border-primary bg-primary'
											: 'border-muted',
									]"
								/>
							</div>
						</div>
					</div>
				</div>

				<div class="pt-4">
					<Button class="w-full">Save Paymaster Settings</Button>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
