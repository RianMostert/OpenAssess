import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@dashboard': path.resolve(__dirname, 'src/app/dashboard'),
      '@components': path.resolve(__dirname, 'src/components'),
      'next/navigation': path.resolve(__dirname, 'tests/mocks/next-navigation.ts'),
      'react-konva': path.resolve(__dirname, 'tests/mocks/react-konva.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup/test-setup.ts',
    include: ['tests/unit/**/*.spec.{ts,tsx}'],
    watch: false,
  },
})
