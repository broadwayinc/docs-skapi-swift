import DefaultTheme from 'vitepress/theme'
import { defineComponent, h } from 'vue'
import type { Theme } from 'vitepress'
import OtherLanguages from './OtherLanguages.vue'
import './custom.css'

// home-features-after only renders on the home page: links to the other languages' docs.
const Layout = defineComponent({
  name: 'SkapiDocsLayout',
  setup(_, { slots }) {
    return () => h(DefaultTheme.Layout, null, { ...slots, 'home-features-after': () => h(OtherLanguages, { current: 'swift' }) })
  },
})

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
}

export default theme
