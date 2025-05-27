import { Options } from 'vite-plugin-html-config'
import packageJson from './package.json'

const BASE_URL = packageJson.homepage
const TITLE = packageJson.name.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
const DESCRIPTION = packageJson.description
const KEYWORDS = packageJson.keywords.join(', ')
const AUTHOR = packageJson.author
const COVER_IMAGE = `${BASE_URL}/cover.png`

export const htmlConfig: Options = {
	metas: [
		{
			name: 'description',
			content: DESCRIPTION,
		},
		{
			name: 'keywords',
			content: KEYWORDS,
		},
		{
			name: 'author',
			content: AUTHOR,
		},
		// Open Graph Meta Tags
		{
			property: 'og:type',
			content: 'website',
		},
		{
			property: 'og:url',
			content: BASE_URL,
		},
		{
			property: 'og:title',
			content: TITLE,
		},
		{
			property: 'og:description',
			content: DESCRIPTION,
		},
		{
			property: 'og:image',
			content: COVER_IMAGE,
		},
		// Twitter Meta Tags
		{
			property: 'twitter:card',
			content: 'summary_large_image',
		},
		{
			property: 'twitter:domain',
			content: 'samanager.up.railway.app',
		},
		{
			property: 'twitter:url',
			content: BASE_URL,
		},
		{
			name: 'twitter:title',
			content: TITLE,
		},
		{
			name: 'twitter:description',
			content: DESCRIPTION,
		},
		{
			name: 'twitter:image',
			content: COVER_IMAGE,
		},
	],
}
