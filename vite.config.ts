import { defineConfig } from 'vite'

import builtinModules from 'builtin-modules'
import commonjsExternals from 'vite-plugin-commonjs-externals'
import reactSwc from '@vitejs/plugin-react-swc'

const externals = [
    'electron',
    'electron-store',
    '@electron/remote',
    // 'lowdb/node',    
    // 'node:path',
    // 'fs/promises',
    // // 'node:fs',
    // 'os',
    // 'path',
    // 'child_process',
    // 'fs',
    // 'tty',
    // 'electron/main',
    // 'electron/common',
    // 'electron/renderer',
    // 'original-fs',
    ...builtinModules,
]

export default defineConfig({
    // root: './src',
    server: {
        port: 5133,
        sourcemapIgnoreList: false,
    },
    resolve: {
        conditions: [
            'node'
        ],
    },
    optimizeDeps: {
        exclude: [...externals,],
    },
    plugins: [
        reactSwc(),
        commonjsExternals({
            externals: [...externals,],
        })
    ],
})