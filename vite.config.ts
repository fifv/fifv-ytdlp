import { defineConfig } from 'vite'

import builtinModules from 'builtin-modules'
import commonjsExternals from 'vite-plugin-commonjs-externals'
import reactSwc from '@vitejs/plugin-react-swc'

const externals = [
    'electron',
    'electron-store',
    '@electron/remote',
    // './external/lowdb/index',
    // './external/lowdb/node',
    'lowdb',
    'lowdb/node',    
    // 'node:path',
    // 'steno',
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
    // resolve: {
    //     conditions: [
    //         'node'
    //     ],
    // },
    build: {
        outDir: 'build',
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