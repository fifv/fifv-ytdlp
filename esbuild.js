/**
 * yarn add --dev esbuild colorette @craftamap/esbuild-plugin-html esbuild-plugin-clean esbuild-plugin-copy rimraf esbuild-sass-plugin
 */
const isElectron = true
const mainEntryPoint = isElectron ? 'src/renderer.tsx' : 'src/index.jsx'


const colorette = require('colorette');
console.log(colorette.blue('----------Loading Libraries------------'));
const t0 = Date.now()

const path = require('path');
const fs = require('fs');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html'); // 550ms+
// const { clean } = require('esbuild-plugin-clean');
const { copy } = require('esbuild-plugin-copy');
const { build } = require('esbuild')
const rimraf = require('rimraf')
/**
 * 这个可以watch
 */
const { sassPlugin } = require('esbuild-sass-plugin') //200ms
// const sassPlugin = require("esbuild-plugin-sass");
// const sassEs = require("essass");
// console.log(process.argv);

console.log(colorette.blue('>'), colorette.cyan((Date.now() - t0) + 'ms'), colorette.blue('<'));
console.log(colorette.blue('----------Start Build------------'));
const t1 = Date.now()
const isProd = process.argv.includes('production')
const isDev = process.argv.includes('development')
// const isDev = true
if (isProd === isDev) {
	console.error(colorette.red('Need a argument "development" or "production"'))
}

const outdir =
	isElectron ?
		'build'
		:
		(isProd ? 'dist' : 'dev')
/* isDev &&  */rimraf(outdir, [], () => { })
function whiteToFiles(result) {
	const outputFiles = result.outputFiles
	for (const outputFile of outputFiles) {
		const foundLastOutputFile = lastOutputFiles.find((lastOutputFile) => {
			return lastOutputFile.path === outputFile.path
		})
		if (foundLastOutputFile?.text !== outputFile.text) {
			console.log(/* colorette.cyan('Write to file:'),  */colorette.cyan((outputFile.contents.length / 1024).toFixed(2).padStart(6) + ' KB'), colorette.green(outputFile.path));
			fs.mkdirSync(path.dirname(outputFile.path), { recursive: true, })
			fs.writeFile(outputFile.path, outputFile.contents, () => { })

		}
	}
	lastOutputFiles = outputFiles
}
let lastOutputFiles = []
build({
	external: ['electron'],
	// entryPoints: [path.join(__dirname, 'src', 'index.jsx')],
	entryPoints: [
		mainEntryPoint,
	],
	// entryNames: isProd ? 'static/[name]-[hash]' : 'static/[name]',
	entryNames: 'static/[name]',
	// chunkNames:'static/[name]-[hash]',
	// assetNames:'static/[name]-[hash]',
	bundle: true,
	// outfile: 'main.js',
	platform: 'node',
	outdir: outdir,
	watch: isDev && {
		/**
		 * 他每次rebuild都會把所有檔案全部更新
		 */
		onRebuild(error, result) {
			console.log(colorette.blue('\n\n-----------Start Watch Build-----------'),)
			if (error) {
				console.error(error)
				console.error(colorette.red('-----------Watch Build Failed-----------'),)
			}
			else {
				whiteToFiles(result)
				// console.log(result?.metafile);
				console.log(colorette.blue('-----------Watch Build Successful-----------'),)
			}
		},

	},
	sourcemap: isDev || process.argv.includes('sourcemap'),
	// sourcemap: true,
	minify: isProd,
	metafile: true,
	write: false,
	define: {
		/**
		 * 臥槽,加了這個,react就用prod了
		 */
		'process.env.NODE_ENV': isProd ? "'production'" : "'development'",
	},
	plugins: [
		// clean({
		// 	/**
		// 	 * 每次rebuild都會clean
		// 	 */
		// 	patterns: isProd ? ['./dist/*',] : [],
		// }),
		sassPlugin(),
		copy({
			/**
			 * 只有第一次會copy,後續的rebuild不會
			 */
			assets: [
				{
					from: ['./public/**/*'],
					to: [path.join(__dirname, outdir)],
					keepStructure: true,
				},
			],
		}),
		htmlPlugin({
			files: [
				{
					entryPoints: [
						mainEntryPoint,
					],
					filename: 'index.html',
					htmlTemplate: fs.readFileSync('src/index.html'),
					define: {
						basehref: isProd ? './' : './'
					},
				}
			],
		}),
	],
})
	.then((result) => {
		whiteToFiles(result)
		// console.log(result?.metafile,);
		console.log(colorette.blue('----------'));
		console.log(colorette.blue('>'), colorette.cyan((Date.now() - t1) + 'ms'), colorette.blue('<'));
		if (isDev) {
			console.log(colorette.blue('-----------Watching-----------'));
			if (!isElectron) {
				const liveServer = require("live-server");
				/**
				 * 會出現不夠新的問題
				 * 觀察一下,檔案是新的,那就是這個的問題
				 * 只要wait改的夠高就沒問題
				 * 小工程就用live preview好了,很穩
				 */
				const host = "0.0.0.0"
				const port = 5000
				liveServer.start({
					port: port,
					host: host, // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
					root: "./dev", // Set root directory that's being served. Defaults to cwd.
					open: false, // When false, it won't load your browser by default.
					/**
					 * 行了!!感動!!他這注釋過時了都,明明實際上使用array的
					 * 這裡相對的是cwd
					 */
					ignore: ['**/*.map', '**/index.html'], // 
					file: "index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
					wait: 0, // Waits for all changes, before reloading. Defaults to 0 sec.
					mount: [['/components', './node_modules']], // Mount a directory to a route.
					logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
					middleware: [function (req, res, next) { next(); }] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
				});
				// console.log('live-server listening', host, ":", port);
			}
		}

		if (isProd) {
			console.log(colorette.blue('-----------Distribution Build Successful-----------'),);
		}
	})
	.catch(() => process.exit(1))





isElectron &&
	build({
		entryPoints: [
			'src/main.js',
		],
		outfile: path.join(outdir, 'main.js'),
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
		watch: isDev && {
			onRebuild(error, result) {
				if (error) {
					// 
				}
				else {
					whiteToFiles(result)
				}
			},

		},
		sourcemap: isDev || process.argv.includes('sourcemap'),
		minify: isProd,
		write: false,
		define: {
			'process.env.NODE_ENV': isProd ? "'production'" : "'development'",
		},
	}).then(
		(result) => {
			whiteToFiles(result)
		}
	)



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