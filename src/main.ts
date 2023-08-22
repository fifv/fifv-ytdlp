/**
 * 刷新不會重新執行這個腳本(當然啦)
 */
import { app, BrowserWindow } from 'electron'
import path from 'path'
import ElectronStore from 'electron-store'
import { setVibrancy, BrowserWindow as BrowserWindow_wtf } from 'electron-acrylic-window'
// console.log(app.getPath('exe'));

let isDev = false

// const isDev = process.env.NODE_ENV === 'development'
/**
 * 只能這樣,electron有預定義process.env,所以esbuild不會插process.env.NODE_ENV
 */
if (/* app.getPath('exe').includes('electron.exe') */!app.isPackaged) {
    console.log('*development')
    isDev = true
    /**
     * 我能想到的原始的判斷是不是dev環境的方法
     * 這個加在devDep裡面所以在打包後用的話或報錯 
     */
    // const electronReload = require('electron-reload')
    // // // console.log(__dirname);
    // // electronReload(path.join(__dirname, /* '..', 'build' */), {})
    // electronReload(path.join(__dirname, '..', 'build'), {})
}
/**
 * isolate is off, so this can be passed
 */
// process.env.AAA = 1

ElectronStore.initRenderer()
const createWindow = () => {
    const win = new BrowserWindow({
        width: 771,
        height: 690,
        // titleBarStyle:'customButtonsOnHover',
        // useContentSize:true,
        /**
         * 把transparent:false就會出現奇怪框框,在半透明狀態下非常難看
         * 但是此時拖動窗口最大化和最小化動畫都是有的
         * 
         * 不知為何,新版本(>17,但是改回16也這樣)下,變成了:
         * transparent:false下也沒有動畫了,但是反最大化正常,奇怪的框框不見了
         * transparent:true會反最大化失敗
         * 然後setVibrancy()會強制讓他透明,所以可以transparent:false,讓他最大化能正常
         * 
         * 直接start和生成出來的差很多誒
         * 目前transparent: true的dist可以正常最大化(start不行),也沒有怪框框
         */
        // transparent: true,
        // transparent: false,
        // opacity:0.85,
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        darkTheme: true,
        /**
         * 很奇怪的顏色設置
         * 目前是這樣,這裡和css都不要用opacity,全都用argb
         * 然後這裡在argb裡設置透明度(這裡是argb,css是rgba),在css裡a設為00,這樣有無網頁加載的時候看起來一樣了
         * 兩邊顏色設置成一樣的,css裡不設置的話會變成白色,這裡不設置的話網頁加載前後顏色會變
         */
        // backgroundColor: '#d9a0b1ff', //藍色
        // backgroundColor: '#00000000',
        // trafficLightPosition:{沒用
        // 	x:100,
        // 	y:100,
        // },

        icon: path.join(__dirname, 'img', 'youtube-icon.png'),
        // titleBarOverlay: {
        // 	color: '#282c34',
        // 	symbolColor: '#ececec'
        // 	// symbolColor: '#ececec'
        // 	// height:1,
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
            spellcheck: false,
            // zoomFactor: 2.0,
        }
    })
    global.win = win
    global.app = app


    /**
     * 這個好像會自動設置transparent: true,
     * 好像會讓上面的backgroundColor: '#d9a0b1ff',失效
     */
    setVibrancy(win as BrowserWindow_wtf, {
        // theme:'#a0b1ffd9',
        theme: '#282c3400',
        // effect: 'blur',
        effect: 'acrylic',
        // useCustomWindowRefreshMethod:false,
        maximumRefreshRate: 1440,
    })
    /**
     * 這個相對的還是root,而不是本腳本
     * 而__dirname指向./build
     */
    if (isDev) {
        /**
         * the path is not important, the key is set this env to hack electron to pass check 
         */
        process.env.ELECTRON_OVERRIDE_DIST_PATH = '.'
        console.log(__dirname)
        win.loadURL("http://localhost:5133/", {

        })
        // win.loadFile(path.join(__dirname, '..', 'build', 'index.html'))
        setTimeout(function () {
            win.webContents.openDevTools()
        }, 100)
    } else {
        win.loadFile(path.join(__dirname, 'index.html'))

    }
    console.log(__dirname)


    // console.log(win.webContents);
    /**
     * 雖然不明道理,但是這兩條都要加.即時那些隔離什麼的都關了也要
     * 不然會空白卡住
     */
    require('@electron/remote/main').initialize()
    require('@electron/remote/main').enable(win.webContents)
    win.once('ready-to-show', () => {
        console.log('*Ready to show')
    })

    // ipcMain.handle('close', () => {
    // 	win.close()
    // })
    // ipcMain.handle('maximize', () => {
    // 	win.maximize()
    // 	win.once('moved', () => {
    // 		win.unmaximize()
    // 		win.webContents.send('moved-unmaximize')
    // 		console.log('*moved-unmaximize');
    // 	})
    // })
    // ipcMain.handle('unmaximize', () => {
    // 	win.unmaximize()
    // })
    // ipcMain.handle('minimize', () => {
    // 	win.minimize()
    // })
}
// console.log(path.join(__dirname, 'preload.js'));
console.log('*App start')
app.whenReady().then(() => {
    console.log('*App is ready')
    createWindow()

    console.log('*Window created')
})
// console.log('3');
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        console.log('*App quit')
    }
})

export { }