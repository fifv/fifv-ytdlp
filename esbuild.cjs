/** 2.2.0
 * use this command to install required libraries:
pnpm add -D esbuild colorette rimraf @craftamap/esbuild-plugin-html  esbuild-plugin-copy esbuild-style-plugin tailwindcss postcss autoprefixer
*/
/**
 deprecated:
esbuild-css-modules-plugin esbuild-sass-plugin
esbuild-plugin-clean 
 */


const colorette = require('colorette')

/* ------------------------------------------- */
/* ----Here are some configurations---- */
const IS_ELECTRON = process.argv.includes('electron')
const HAS_DOM = true
const MAIN_ENTRY_POINT = IS_ELECTRON ? 'src/renderer.tsx' : 'src/index.tsx'
const BASE_PATH_PROD = './'
const BASE_PATH_DEV = './'
// const isProd = process.argv.includes('production')
const IS_DEV = process.argv.includes('dev')
// const isDev = true
// if (isDev) {
//     console.log(colorette.red('Lack argument "development" or "production"'))
// }
const OUT_DIR =
    IS_ELECTRON
        ? 'build'
        : (IS_DEV ? 'dev' : 'dist')
/* ------------------------------------------- */



console.log(colorette.blue('----------Loading Plugins------------'))
const t0 = Date.now()
const path = require('path')
const fs = require('fs')
const { htmlPlugin } = HAS_DOM && require('@craftamap/esbuild-plugin-html') // 550ms+
const { copy } = require('esbuild-plugin-copy')
// const cssModulesPlugin = require('esbuild-css-modules-plugin');
const stylePlugin = require('esbuild-style-plugin')
const esbuild = require('esbuild')
const { rimraf } = require('rimraf')
/**
 * 这个可以watch
 */
// const { sassPlugin } = HAS_DOM && require('esbuild-sass-plugin') //200ms
// console.log(process.argv);

console.log(colorette.blue('>'), colorette.cyan((Date.now() - t0) + 'ms'), colorette.blue('<'))
const t1 = Date.now()


/**
 * @type {import('esbuild').OutputFile[]}
 */
let lastOutputFiles = []


/**
 * @param {import('esbuild').BuildResult | null} buildResult
 */
function writeToFiles(buildResult) {
    if (buildResult && buildResult.outputFiles) {
        const outputFiles = buildResult.outputFiles
        for (const outputFile of outputFiles) {
            const foundLastOutputFile = lastOutputFiles.find((lastOutputFile) => {
                return lastOutputFile.path === outputFile.path
            })
            if (foundLastOutputFile?.text !== outputFile.text) {
                console.log(/* colorette.cyan('Write to file:'),  */
                    colorette.cyan((outputFile.contents.length / 1024).toFixed(2).padStart(7) + ' KB'),
                    colorette.green(outputFile.path)
                )
                fs.mkdirSync(path.dirname(outputFile.path), { recursive: true, })
                fs.writeFile(outputFile.path, outputFile.contents, () => { })

            }
        }
        lastOutputFiles = outputFiles ?? []
    }
}


/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
    external: ['electron'], //electron必須加這個,不然會報錯
    entryPoints: [
        MAIN_ENTRY_POINT,
    ],
    entryNames: IS_DEV ? 'static/[name]' : 'static/[name]-[hash]', // dev時候不用hash,一是理論上可能快一點,二是防止產生一大堆檔案,畢竟每次修改都會產生一個新的而不是覆蓋
    // entryNames: 'static/[name]',
    chunkNames: 'static/[name]-[hash]',
    assetNames: 'assets/[name]-[hash]',
    bundle: true,
    // outfile: 'main.js',
    outdir: OUT_DIR,
    platform: (IS_ELECTRON || !HAS_DOM) ? 'node' : 'browser',
    // watch: isDev && {
    //     /**
    //      * 他每次rebuild都會把所有檔案全部更新
    //      */
    //     onRebuild(error, result) {
    //         console.log(colorette.blue('\n\n-----------Start Watch Build-----------'),)
    //         if (error) {
    //             console.error(error)
    //             console.error(colorette.red('-----------Watch Build Failed-----------'),)
    //         }
    //         else {
    //             whiteToFiles(result)
    //             // console.log(result?.metafile);
    //             console.log(colorette.blue('-----------Watch Build Successful-----------'),)
    //         }
    //     },

    // },
    sourcemap: IS_DEV || process.argv.includes('sourcemap'),
    // sourcemap: true,
    minify: !IS_DEV,
    metafile: true,
    // splitting: true,
    // format: 'esm',
    loader: {
        '.jpg': 'dataurl',
    },
    write: false,
    define: {
        /**
         * 臥槽,加了這個,react就用prod了
         */
        'process.env.NODE_ENV': IS_DEV ? "'development'" : "'production'",
    },
    /**
     * FIX\ME: this need to be remove manually when pure node
     */
    plugins: [
        /**
         * 神奇的選擇性spread
         * 關鍵在於...false不會讓array裡面多東西
         */
        ...(HAS_DOM && [
            stylePlugin({
                postcss: {
                    plugins: [
                        // @ts-ignore
                        require('tailwindcss'),
                        // @ts-ignore
                        require('autoprefixer'),
                    ]
                }
            }),
            copy({
                /**
                 * 只有第一次會copy,後續的rebuild不會
                 */
                assets: [
                    {
                        from: ['./public/**/*'],
                        to: [path.join(__dirname, OUT_DIR)],
                        // @ts-ignore
                        keepStructure: true,
                    },
                ],
            }),
            htmlPlugin({
                files: [
                    {
                        entryPoints: [
                            MAIN_ENTRY_POINT,
                        ],
                        filename: 'index.html',
                        htmlTemplate: fs.readFileSync('src/index.html').toString(),
                        define: {
                            basehref: IS_DEV ? BASE_PATH_DEV : BASE_PATH_PROD
                        },
                    }
                ],
            }),

            // clean({
            // 	/**
            // 	 * 每次rebuild都會clean
            // 	 */
            // 	patterns: isProd ? ['./dist/*',] : [],
            // }),
            // HAS_DOM && sassPlugin(),
            // cssModulesPlugin({
            // 	// inject: true,
            // 	// v2: true,
            // }),

        ])
    ],
}

/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptionsForElectronMain = {
    entryPoints: [
        'src/main.ts',
    ],
    outfile: path.join(OUT_DIR, 'main.js'),
    external: [
        'electron',  //must
        'electron-acrylic-window', //must
        // 'electron-store',
        'electron-reload',  //must
        // 'path', 
        // '@electron/remote/main',
    ],
    // bundle: false,
    bundle: true,
    platform: 'node',
    // watch: isDev && {
    //     onRebuild(error, result) {
    //         if (error) {
    //             // 
    //         }
    //         else {
    //             writeToFiles(result)
    //         }
    //     },

    // },
    sourcemap: IS_DEV || process.argv.includes('sourcemap'),
    minify: !IS_DEV,
    write: false,
    define: {
        'process.env.NODE_ENV': IS_DEV ? "'development'" : "'production'",
    },
    plugins: [],
}
function startLiveServer(host = "0.0.0.0", port = 5000) {
    const liveServer = require("live-server")
    /**
     * 會出現不夠新的問題
     * 觀察一下,檔案是新的,那就是這個的問題
     * 只要wait改的夠高就沒問題
     * 小工程就用live preview好了,很穩
     */
    // const host = "0.0.0.0"
    // const port = 5000
    liveServer.start({
        port: port,
        host: host, // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
        root: "./dev", // Set root directory that's being served. Defaults to cwd.
        open: false, // When false, it won't load your browser by default.
        /**
         * 行了!!感動!!他這注釋過時了都,明明實際上使用array的
         * 這裡相對的是cwd
         */
        // @ts-ignore
        ignore: ['**/*.map', '**/index.html'], // 
        file: "index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
        wait: 400, // 如果更新不正確,就加高一點.好像400+比較好 Waits for all changes, before reloading. Defaults to 0 millisec. 
        mount: [['/components', './node_modules']], // Mount a directory to a route.
        logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
        middleware: [function (req, res, next) { next() }] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
    })
    // console.log('live-server listening', host, ":", port);

}


async function main() {
    try {
        /* isDev &&  */await rimraf(OUT_DIR, {},)
        if (IS_DEV) {
            console.log(colorette.blue('----------Watching: ') + colorette.yellow('development') + colorette.blue('----------'))

            // if (!IS_ELECTRON && HAS_DOM) {
            //     startLiveServer()
            // }
            /**
             * @type {import('esbuild').Plugin}
             */
            const onBuildPlugin = {
                name: 'on-rebuild',
                setup(build) {
                    let count = 0
                    let tStart = 0
                    build.onStart(() => {
                        count++
                        tStart = Date.now()
                        console.log(colorette.blue('\n\n-----------Dev Build') + colorette.yellow(` #${count}`) + colorette.blue('----------'))
                    })
                    build.onEnd(result => {
                        writeToFiles(result)
                        console.log(colorette.blue('----------'))
                        console.log(colorette.blue('>'), colorette.cyan((Date.now() - tStart) + 'ms'), colorette.blue('<'))
                        console.log(colorette.blue('-----------Dev Build Successful-----------'),)
                    })
                },
            }

            buildOptions.plugins?.push(onBuildPlugin)
            const ctx = await esbuild.context(buildOptions)
            await ctx.watch()

            // if (IS_ELECTRON) {
            //     buildOptionsForElectronMain.plugins?.push(onBuildPlugin)
            //     const ctxForElectronMain = await esbuild.context(buildOptionsForElectronMain)
            //     await ctxForElectronMain.watch()
            // }
        } else {
            console.log(colorette.blue('----------Prod Build: ') + colorette.yellow('production') + colorette.blue('----------'))
            writeToFiles(await esbuild.build(buildOptions))
            /**
             * electron的main.js和上面的renderer.jsx分開
             */
            if (IS_ELECTRON) {
                writeToFiles(await esbuild.build(buildOptionsForElectronMain))
            }
            console.log(colorette.blue('----------'))
            console.log(colorette.blue('>'), colorette.cyan((Date.now() - t1) + 'ms'), colorette.blue('<'))
            console.log(colorette.blue('-----------Prod Build Successful-----------'),)
        }
        // console.log(result?.metafile,);



    } catch (error) {
        console.error(error)
        process.exit(1)
    }

}
main()







// build({
// 	/**
// 	 * 已知live-server是可以hot-reload css的
// 	 * 前提是只有css發生變化
// 	 * 問題來了,正常情況改了scss,js會跟著刷新
// 	 * 而js是必須被監聽的,不能ignore
// 	 * 總之我需要:修改scss,對應只有css發生變化
// 	 * esbuild裡好像沒找到類似的選項
// 	 * 只能新開一個build了
// 	 * 此時htmlPlugin的自動插入就失效了
// 	 * 這樣也太麻煩了
// 	 * 如果我有多個入口,每個都有對應的scss...直接搞不來
// 	 */
// 	...options,
// 	entryPoints: [
// 		'src/App.scss',
// 	],
// 	outdir: undefined,
// 	outfile: path.join(outdir, 'static', 'style.css'),
// 	entryNames: undefined,
// 	plugins: [
// 		sassPlugin(),
// 	],

// })