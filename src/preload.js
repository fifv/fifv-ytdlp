console.log('preload script executed!!');
/**
 * 好像每次刷新整個腳本都會被執行誒
 */
	const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('myAPI', {
	startDownload: (url) => {
		ipcRenderer.invoke('startDownload', url)
	},
	getOutput: (component) => {
		console.log('start listen');
		ipcRenderer.on('output', (event, info) => {
			// console.log(component);
			// console.log('info',info);
			component.updateState(info)
		})
	}
})
// contextBridge.exposeInMainWorld('saySomething', (something)=>{
// 	ipcRenderer.invoke('clg',something)
// })
window.addEventListener('DOMContentLoaded', () => {
	/**
	 * 這個?.不能出現在等號左邊.雖然很奇怪,他沒報錯?
	 * 哦,報錯訊息在窗口的console裡.而且是刷新就生效,不需要重啟
	 */
	console.log('DOMContentLoaded!!');
	try {
		document.getElementById('node-version').innerText = process.versions.node
		document.getElementById('chrome-version').innerText = process.versions.chrome
		document.getElementById('electron-version').innerText = process.versions.electron
	} catch (error) {
		console.log('set version error!');
	}
})