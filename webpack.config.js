/**
 * 還是top-await的問題,導致esbuild不能用
 * 只能用loader湊合了
 * 
 * 用了loader + minimizer後,	dev: 3.9s, build: 4.7s
 * 用了loader後,				dev: 3.9s, build: 10s
 * 原本: 						dev: 7.3s, build: 13.4s
 * 
 * 不知道為什麼,esbuild的minimizer會讓開啟進入沒有動畫
 * 至少也快了一點
 * 
 * 用esbuild的話,必須要external: ['electron'],
 * 不過esbuild不支援top-await導致要用async的lowdb,明顯變慢很多
 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const srcDir = path.join(__dirname, 'src')
const CopyPlugin = require("copy-webpack-plugin");
const { ESBuildMinifyPlugin } = require('esbuild-loader')

const rendererConfig = {

	entry: {
		// main: path.join(srcDir, 'main.js'),
		// preload: path.join(srcDir, 'preload.js')
		renderer: path.join(srcDir, 'renderer.tsx'),
		// styles: path.join(srcDir, 'styles.scss')
	},
	target: "electron-renderer",
	output: {
		path: path.join(__dirname, 'build'),
		filename: 'js/[name].js',
		clean: true,
	},
	optimization: {
		splitChunks: {
			name: "vendor",
			chunks(chunk) {
				// return chunk.name !== 'background';
				return true
			}
		},
		// minimizer: [
		// 	new ESBuildMinifyPlugin({
		// 		target: 'esnext'  // Syntax to compile to (see options below for possible values)
		// 	})
		// ]
	},
	module: {
		rules: [
			// {
			// 	test: /\.tsx?$/i,
			// 	use: "ts-loader",
			// 	exclude: /node_modules/,
			// },
			{
				test: /\.s?css$/i,
				use: ['style-loader', 'css-loader', 'sass-loader'],
			},

			{
				test: /\.tsx?$/,
				loader: 'esbuild-loader',
				options: {
					loader: 'tsx',  // Or 'ts' if you don't need tsx
					target: 'esnext',
				}
			},
		],
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".scss"],
	},
	plugins: [
		new HtmlWebpackPlugin(
			{
				filename: 'index.html',
				template: 'src/index.html',
			}
		),
		new CopyPlugin({
			patterns: [
				{ from: './src/main.js', to: './main.js' },
				// { from: './src/preload.js', to: './preload.js' },
				{ from: './src/assets/yt-dlp.exe', to: './' },
				{ from: './src/assets/youtube-icon.png', to: './img' },
			],
			options: {},
		}),
	],
	experiments: {
		topLevelAwait: true,
	},
}
const mainConfig = {
	entry: {
		main: path.join(srcDir, 'main.js'),
		// preload: path.join(srcDir, 'preload.js')
		// renderer: path.join(srcDir, 'renderer.tsx'),
		// styles: path.join(srcDir, 'styles.scss')
	},
	target: "electron-main",
	output: {
		path: path.join(__dirname, 'build'),
		filename: 'main.js',
		clean: true,
	},
	optimization: {
		splitChunks: {
			name: "vendor",
			chunks(chunk) {
				// return chunk.name !== 'background';
				return true
			}
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/i,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js",],
	},
}
module.exports = [rendererConfig]