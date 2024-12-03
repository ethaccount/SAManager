import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { createVfm } from 'vue-final-modal'
import 'vue-final-modal/style.css'

const app = createApp(App)

app.use(createPinia())

const vfm = createVfm()
app.use(vfm)

app.mount('#app')
