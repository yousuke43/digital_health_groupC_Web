import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // ネットワーク上で公開
    port: 5173,       // ポート番号（任意）
  },
  
  // ★★★ このブロックが重要 ★★★
  optimizeDeps: {
    include: [
      'three/addons/loaders/GLTFLoader.js',
      '@pixiv/three-vrm' // ← この行も必要
    ],
  },
})