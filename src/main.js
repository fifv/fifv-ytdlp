/**
 * 刷新不會重新執行這個腳本(當然啦)
 */
const { app, BrowserWindow, ipcMain, Tray, } = require('electron');

const path = require('path');
const { spawn } = require("child_process");

const ElectronStore = require('electron-store');
ElectronStore.initRenderer()

const { setVibrancy } = require('electron-acrylic-window')


const electronReload = require('electron-reload')
electronReload(path.join(__dirname, '..', 'build'), {})



const createWindow = () => {
	const win = new BrowserWindow({
		width: 601,
		height: 690,
		// titleBarStyle:'customButtonsOnHover',
		// useContentSize:true,
		transparent:true,
		// opacity:0.85,
		/**
		 * 很奇怪的顏色設置
		 * 目前是這樣,這裡和css都不要用opacity,全都用argb
		 * 然後這裡在argb裡設置透明度(這裡是argb,css是rgba),在css裡a設為00,這樣有無網頁加載的時候看起來一樣了
		 * 兩邊顏色設置成一樣的,css裡不設置的話會變成白色,這裡不設置的話網頁加載前後顏色會變
		 */
		backgroundColor: '#d9a0b1ff',
		// trafficLightPosition:{沒用
		// 	x:100,
		// 	y:100,
		// },
		darkTheme:true,
		frame:false,
		titleBarStyle: 'hidden',
		icon:path.join(__dirname,'img','youtube-icon.png'),
		// titleBarOverlay: {
		// 	color: '#2f3241',
		// 	symbolColor: '#74b1be'
		// },
		// titleBarOverlay:true,
		webPreferences: {
			/**
			 * 不知道為什麼,但是一定要用絕對路徑
			 * 這個__dirname應該是本腳本的位置,也就是說main.js編譯到build/裡邊之後會加載build/preload.js
			 * 
			 * webpack的module resolve裡好像說所有相對路徑都會被按照一定規則轉換成絕對路徑
			 */
			// preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
			contextIsolation: false,
		}
	})
	setVibrancy(win,{
		// theme:'#a0b1ffd9',
		effect:'blur',
		// useCustomWindowRefreshMethod:false,
		maximumRefreshRate:1440,
	})
	/**
	 * 這個相對的還是root,而不是本腳本
	 * 而__dirname指向./build
	 */
	win.loadFile(path.join(__dirname, 'index.html'))
	// console.log(win.webContents);
win.once('ready-to-show', ()=>{
	console.log('*Ready to show');
})
	ipcMain.handle('close', ()=>{
		win.close()
	})
	ipcMain.handle('maximize', ()=>{
		win.maximize()
		win.once('moved',()=>{
			win.unmaximize()
			win.webContents.send('moved-unmaximize')
			console.log('*moved-unmaximize');
		})
	})
	ipcMain.handle('unmaximize', ()=>{
		win.unmaximize()
	})
	ipcMain.handle('minimize', ()=>{
		win.minimize()
	})
}
// console.log(path.join(__dirname, 'preload.js'));
console.log('*App start');
app.whenReady().then(() => {
	console.log('*App is ready');
	createWindow()
	console.log('*Window created');
})
// console.log('3');
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
		console.log('*App quit');
	}
})