import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { createVfm } from 'vue-final-modal'
import 'vue-final-modal/style.css'
import router from './router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { AppError, formatErrMsg, normalizeError } from './lib/error'
import { ERROR_NOTIFICATION_DURATION } from './config'

const app = createApp(App)

import Notifications, { notify } from '@kyvg/vue3-notification'
app.use(Notifications)

const vfm = createVfm()
app.use(vfm)

// pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

app.use(router)

app.mount('#app')

app.config.errorHandler = (error: unknown, _vm, _info) => {
	const err = normalizeError(error)
	const appError = new AppError(err.message, { cause: err })
	console.error(appError)

	notify({
		title: 'App Error',
		text: formatErrMsg(appError),
		type: 'error',
		duration: ERROR_NOTIFICATION_DURATION,
	})
}
