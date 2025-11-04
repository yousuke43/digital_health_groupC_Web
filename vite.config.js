import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ★★★ このブロックが重要 ★★★
  optimizeDeps: {
    include: [
      'three/addons/loaders/GLTFLoader.js',
      '@pixiv/three-vrm' // ← この行も必要
    ],
  },
})