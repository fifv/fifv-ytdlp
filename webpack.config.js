const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const srcDir = path.join(__dirname, 'src')
const CopyPlugin = require("copy-webpack-plugin");

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
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/i,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.s?css$/i,
				use: ['style-loader', 'css-loader', 'sass-loader'],
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
				{ from: "./src/main.js", to: "./main.js" },
				// { from: "./src/preload.js", to: "./preload.js" },
				{ from: "./src/assets/yt-dlp.exe", to: "./" },
				{ from: "./src/assets/youtube-icon.png", to: "./img" },
			],
			options: {},
		}),
	],
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
		// splitChunks: {
		// 	name: "vendor",
		// 	chunks(chunk) {
		// 		// return chunk.name !== 'background';
		// 		return true
		// 	}
		// },
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