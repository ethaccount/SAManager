import { createApp } from 'vue'
import { toast } from 'vue-sonner'
import App from './App.vue'
import { ERROR_NOTIFICATION_DURATION } from './config'
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
		key: id => `samanager-${id}`,
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
