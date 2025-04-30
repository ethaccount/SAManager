import { createApp } from 'vue'
import App from './App.vue'
import { ERROR_NOTIFICATION_DURATION } from './config'
import { parseError } from './lib/error'
import './style.css'
import { toast } from 'vue-sonner'

// vue-spring-bottom-sheet
import '@douxcode/vue-spring-bottom-sheet/dist/style.css'

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

// vue-notification
import Notifications, { notify } from '@kyvg/vue3-notification'
app.use(Notifications)

// vue-final-modal
import { createVfm } from 'vue-final-modal'
import 'vue-final-modal/style.css'

const vfm = createVfm()
app.use(vfm)

app.mount('#app')

app.config.errorHandler = (error: unknown, _vm, _info) => {
	const err = parseError(error)
	console.error(err)

	// why not show?
	toast.error(err.name, {
		description: err.message,
		duration: ERROR_NOTIFICATION_DURATION,
	})

	notify({
		title: err.name,
		text: err.message,
		type: 'error',
		duration: ERROR_NOTIFICATION_DURATION,
	})
}
