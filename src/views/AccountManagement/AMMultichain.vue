<script setup lang="ts">
const crossChainAccounts = [
	{ chain: 'Sepolia', address: '0x1234...5678' },
	{ chain: 'Base', address: '0xabcd...efgh' },
	{ chain: 'Base Sepolia', address: '0x9876...5432' },
]
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Multichain Deployments</CardTitle>
			<CardDescription>Your account deployments across different networks</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-6">
				<div class="space-y-4">
					<div class="grid gap-3">
						<div
							v-for="account in crossChainAccounts"
							:key="account.chain"
							class="flex items-center justify-between p-3 border rounded-md"
						>
							<div>
								<div class="font-medium">{{ account.chain }}</div>
								<div class="text-sm text-muted-foreground">{{ account.address }}</div>
							</div>

							<div class="pt-4">
								<Button class="w-full">Deploy to Another Chain</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
