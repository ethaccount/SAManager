import { createApp } from 'vue'
import { toast } from 'vue-sonner'
import App from './App.vue'
import { ERROR_NOTIFICATION_DURATION, LOCAL_STORAGE_KEY_PREFIX } from './config'
import { parseError } from './lib/error'
import './style.css'

const app = createApp(App)

// pinia
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
const pinia = createPinia()

// @docs https://prazdevs.github.io/pinia-plugin-persistedstate/guide/advanced.html#global-key-option
pinia.use(
	createPersistedState({
		key: id => `${LOCAL_STORAGE_KEY_PREFIX}${id}`,
	}),
)

app.use(pinia)

// vue-router
import router from './router'
app.use(router)

// vue-final-modal
import { createVfm } from 'vue-final-modal'
import 'vue-final-modal/style.css'
const vfm = createVfm()
app.use(vfm)

app.mount('#app')

app.config.errorHandler = (error: unknown, _vm, _info) => {
	const err = parseError(error)
	console.error(err)

	toast.error(err.message, {
		duration: ERROR_NOTIFICATION_DURATION,
	})
}

// Load Cloudflare Web Analytics only in production
if (import.meta.env.PROD) {
	const script = document.createElement('script')
	script.defer = true
	script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
	script.setAttribute('data-cf-beacon', '{"token": "0742cf5e720f49a9a49f1f9b26393a9d"}')
	document.head.appendChild(script)
}
