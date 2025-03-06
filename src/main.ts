import { createApp } from 'vue'
import App from './App.vue'
import { ERROR_NOTIFICATION_DURATION } from './config'
import { AppError, formatErrMsg, parseError } from './lib/error'
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

	notify({
		title: 'App Error',
		text: formatErrMsg(err),
		type: 'error',
		duration: ERROR_NOTIFICATION_DURATION,
	})
}
