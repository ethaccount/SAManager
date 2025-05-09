<script setup lang="ts">
// Mock data for sessions
const sessions = ref([
	{
		id: 'session-1',
		name: 'Mobile App',
		validUntil: new Date('2023-12-31'),
		permissions: 'Transfer ETH, USDC',
	},
	{
		id: 'session-2',
		name: 'Web Dashboard',
		validUntil: new Date('2023-10-15'),
		permissions: 'Read-only',
	},
])
</script>

<template>
	<Card>
		<CardHeader>
			<CardTitle>Smart Sessions</CardTitle>
			<CardDescription>Manage session keys for your account</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="space-y-6">
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium">Active Sessions</h3>
						<Button size="sm">Create New Session</Button>
					</div>

					<div v-if="sessions.length === 0" class="text-sm text-muted-foreground">No active sessions</div>
					<div v-else class="grid gap-3">
						<div v-for="session in sessions" :key="session.id" class="border rounded-md p-4">
							<div class="flex items-start justify-between">
								<div>
									<div class="font-medium">{{ session.name }}</div>
									<div class="text-sm text-muted-foreground mt-1">
										Valid until: {{ session.validUntil.toLocaleDateString() }}
									</div>
									<div class="text-sm mt-2">Permissions: {{ session.permissions }}</div>
								</div>
								<Button
									variant="outline"
									size="sm"
									@click="sessions = sessions.filter(s => s.id !== session.id)"
								>
									Revoke
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</template>

<style lang="css" scoped></style>
