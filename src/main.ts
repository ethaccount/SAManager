import { createApp } from 'vue'
import { toast } from 'vue-sonner'
import App from './App.vue'
import { ERROR_NOTIFICATION_DURATION } from './config'
import { parseError } from './lib/error'
import './style.css'

const app = createApp(App)

// pinia
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
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

	toast.error(err.name, {
		description: err.message,
		duration: ERROR_NOTIFICATION_DURATION,
	})
}
