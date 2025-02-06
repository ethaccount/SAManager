import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { createVfm } from 'vue-final-modal'
import 'vue-final-modal/style.css'
import router from './router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useErrorModalStore } from './stores/useErrorModal'

const app = createApp(App)

const vfm = createVfm()
app.use(vfm)

// pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

app.use(router)

app.mount('#app')

app.config.errorHandler = (err: any, vm, info) => {
	console.error('Vue Error:', err.message)
	const errorModalStore = useErrorModalStore()
	errorModalStore.logError(err.message)
}
