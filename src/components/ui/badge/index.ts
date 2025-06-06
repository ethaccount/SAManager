import { cva, type VariantProps } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
	'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground shadow',
				secondary: 'border-transparent bg-secondary text-secondary-foreground',
				destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
				outline: 'text-foreground',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
