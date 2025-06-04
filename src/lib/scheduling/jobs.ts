import { AbiCoder } from 'ethers'
import { Job } from './useFetchJobs'

export function decodeExecutionData(data: string) {
	const abiCoder = new AbiCoder()
	const [recipient, tokenAddress, amount] = abiCoder.decode(['address', 'address', 'uint256'], data)

	return {
		recipient,
		tokenAddress,
		amount,
	}
}

// Helper function to calculate next execution time
export function getNextExecutionTime(job: Job) {
	if (job.lastExecutionTime > 0) {
		// Calculate next execution based on last execution + interval
		const nextTime = Number(job.lastExecutionTime) + Number(job.executeInterval)
		return new Date(nextTime * 1000)
	} else {
		// First execution will be at start date
		return new Date(Number(job.startDate) * 1000)
	}
}

// Helper function to format next execution
export function formatNextExecution(job: Job) {
	const nextTime = getNextExecutionTime(job)
	if (isNaN(nextTime.getTime())) {
		return 'Invalid Date'
	}

	const now = new Date()
	const diffMs = nextTime.getTime() - now.getTime()

	if (diffMs < 0) {
		const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
		const overdueHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
		const overdueMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60))

		if (overdueDays > 0) {
			return `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`
		} else if (overdueHours > 0) {
			return `Overdue by ${overdueHours} hour${overdueHours > 1 ? 's' : ''}`
		} else if (overdueMinutes > 0) {
			return `Overdue by ${overdueMinutes} minute${overdueMinutes > 1 ? 's' : ''}`
		} else {
			return 'Overdue by less than a minute'
		}
	}

	const diffMinutes = Math.floor(diffMs / (1000 * 60))
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays > 0) {
		return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
	} else if (diffHours > 0) {
		return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
	} else if (diffMinutes > 0) {
		return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`
	} else {
		return 'very soon'
	}
}

// Helper function to check if job is overdue
export function isJobOverdue(job: Job) {
	const nextTime = getNextExecutionTime(job)
	const now = new Date()
	return nextTime.getTime() < now.getTime()
}

export function isJobCompleted(job: Job) {
	return job.numberOfExecutionsCompleted >= job.numberOfExecutions
}

// Helper function to format interval
export function formatInterval(interval: bigint) {
	const seconds = Number(interval)
	const days = Math.floor(seconds / 86400)
	const hours = Math.floor((seconds % 86400) / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)

	if (days > 0) return `Every ${days} day${days > 1 ? 's' : ''}`
	if (hours > 0) return `Every ${hours} hour${hours > 1 ? 's' : ''}`
	if (minutes > 0) return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`
	return `Every ${seconds} second${seconds > 1 ? 's' : ''}`
}

// Helper function to format timestamp
export function formatDate(timestamp: bigint) {
	const date = new Date(Number(timestamp) * 1000)
	if (isNaN(date.getTime())) {
		return 'Invalid Date'
	}
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}
