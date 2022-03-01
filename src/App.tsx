/**
 * 目前問題:
 * * 如果下的是影片,雙擊打不開
 * 		* 因為讀到的是.f251.webm之類的中間檔案,而不是最終檔
 * * 歷史記錄又卡又慢,尤其是同時量大以及記錄多的時候
 * 		* 每次都要完整從檔案裡讀出,修改,完整的寫入檔案
 * * tooltip沒有
 * * 無限的totalLoader
 * 		* 因為原本用的是加一減一的方法算出有多少在運行的
 * 		* 用queuer裡的方法,好像不行,因為App的state裡面沒有儲存status
 * * 無法最大化復原.
 * 		* 其實是無法最大化,窗口變了,但是實際state沒動,導致unmaximize失敗
 * 		* 所以直接去除了按鈕,眼不見為淨
 */
import React from 'react';
// import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.scss'
import { spawn, ChildProcess, spawnSync } from 'child_process'
import classNames from 'classnames';
import { decode } from 'iconv-lite';
import { ipcRenderer, clipboard, shell } from 'electron';
import ElectronStore from 'electron-store';
import { Line as ProgressLine } from 'rc-progress';
import { IconContext } from 'react-icons'
import {
	MdOutlineKeyboardArrowUp, MdOutlineKeyboardArrowDown, MdOutlineRemove,
	MdOutlineCheck, MdClose, MdPlayArrow, MdOutlineInsertPhoto, MdInfo,
	MdOutlineSubtitles, MdSubtitles, MdOutlineFolder, MdFormatPaint,
	MdHistory, MdOutlineContentPaste, MdDownload, MdDownloadDone,

} from 'react-icons/md'
import { VscChromeMaximize } from 'react-icons/vsc'
import { CgMinimize } from 'react-icons/cg'
import {
	BsArrowRightCircle, BsFillExclamationTriangleFill,
	BsFillArrowRightCircleFill, BsMusicNoteBeamed, BsCameraVideo, BsHddNetwork,
} from 'react-icons/bs'
import { Low, JSONFile } from 'lowdb'
import { BiCookie } from 'react-icons/bi';
import { IoPlayOutline } from 'react-icons/io5'
import HashLoader from 'react-spinners/HashLoader';
import GridLoader from 'react-spinners/GridLoader';
import PuffLoader from 'react-spinners/PuffLoader';
import path from 'path';
import * as remote from '@electron/remote'
import { isEqual, isNumber } from 'lodash-es';
import { Flipper, Flipped, spring } from 'react-flip-toolkit'
// import { Scrollbar } from "react-scrollbars-custom";
import { Scrollbars } from 'react-custom-scrollbars';
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; // optional



const isDebug = false
// const isDebug = true

/**
 * 以下為type
 */
/**
 * 詭異的typescript&vscode:
 * 用type,懸浮上去會有完整的內容
 * 用interface,懸浮上去只有一個名稱
 * 
 * DB['histories']這種type index只有type能用,interface不行
 * 
 * interface在outline中會有專屬的圖標,而type和普通的變元一個圖標
 */
type KeyofType<OBJ, TYPE> = {
	[key in keyof OBJ]: OBJ[key] extends TYPE ? key : never
}[keyof OBJ]
type Status = "finished" | "stopped" | "downloading" | "error"
type ContextData = {
	inputUrl?: string,
	actionId?: string,
	action?: () => void,
}
type History = {
	timestamp: number,
	urlInput: string,
	status: Status,
	thumbnailFinished?: boolean,
	destPath?: string,
	percentValue?: number,
	fileSizeValue?: number,
	fileSizeString?: string,
	title?: string,
	durationString?: string,
}
type DB = {
	histories: History[]
}
type TaskData = History & {
	timestamp: number,
	process?: ChildProcess,
	processJson?: ChildProcess,
	urlInput: string,
}

/**
 * global
 */
const onElementAppear = (element: HTMLElement, index: number) =>
	spring({
		config: {
			stiffness: 10000,
			damping: 200,
		},
		values: {
			translateY: [-15, 0],
			opacity: [0, 1]
		},
		onUpdate: (value) => {
			if (typeof value !== 'number') {
				const { translateY, opacity } = value
				element.style.opacity = opacity.toString();
				element.style.transform = `translateY(${translateY}px)`;
			}
		},
		delay: index * 5,
		// onComplete: () => console.log('done')
	})
const onElementExit = (element: HTMLElement, index: number, removeElement: () => void) => {
	spring({
		// config: { stiffness: 68000, damping: 2220 },//高速
		// config: { stiffness: 600, damping: 20 },
		// config: { stiffness: 10000, damping: 500, },
		config: { stiffness: 10000, damping: 200, },
		onUpdate: (val) => {
			if (typeof val === 'number') {

				element.style.opacity = `${1 - val}`;
				// element.style.transform = `scaleY(${1 - val})`;
				// console.log(val, index)
			}
		},
		// delay: index * 10,   
		onComplete: () => { removeElement() },
	})
};
const win = remote.getCurrentWindow()
const main = {
	console: remote.require('console'),
	app: remote.app,
}
const db = new Low<DB>(new JSONFile(path.join(main.app.getPath('userData'), 'histories.json')))
await db.read()
db.data ||= {
	histories: []
}
const { histories } = db.data
let historiesComp = histories.slice()
setInterval(() => {
	if (!isEqual(histories, historiesComp)) {
		// console.log('*timer auto save histories:', 'from', historiesComp, 'to', histories);
		db.write()
		historiesComp = histories.slice()
	}
}, 1000)
// db.write()
// console.log(main.app.getPath('exe'));
const quotePath = (path: string) => {
	if ((path[0] === `'` && path[path.length - 1] === `'`) || (path[0] === `"` && path[path.length - 1] === `"`)) {
		return path
	} else {
		return '"' + path + '"'
	}
}
/**
 * 千萬注意若找不到,dataIndex === -1 ,這個**必須**處理,否則會出現恐怖的結果!!!
 * 如果引用state的話,注意用slice(),直接改state是不太好的
 */
const getCurrentData = (datas: TaskData[], timestamp: number) => {
	/**
	 * datas也是引用,所以如果引用state的話,直接改state是不太好的
	 * data應該是引用,對他修改會直接導致datas發生變化
	 * 當然data = ??? 這種應該會導致引用跑掉
	 */
	const dataIndex = datas.findIndex((data) => (timestamp === data.timestamp))
	const data = datas[dataIndex]
	return {
		datas,
		dataIndex,
		data,
		datasSliced: datas.slice(),
	}
}
const store = new ElectronStore({
	defaults: {
		isSpecifyDownloadPath: true,
		isProxy: false,
		isFormatFilename: true,
		saveThumbnail: true,
		saveSubtitles: false,
		isUseCookie: true,
		isUseHistory: false,
		saveAutoSubtitle: false,
		saveAllSubtitles: false,
		isUseLocalYtdlp: false,
		contentSelector: 'video',
		isDisplayFinished: true,
		isDisplayDownloading: true,

		proxyHost: 'http://127.0.0.1:1080',
		cookieFile: 'cookiejar.txt',
		historyFile: 'history.txt',
		fileNameTemplate: '[%(upload_date)s]%(title)s-%(id)s.%(ext)s',

		destPath: main.app.getPath('downloads'),
		tempPath: path.join(main.app.getPath('downloads'), 'temp'),

		taskHistories: [],
	}
})
window.onbeforeunload = (event) => {
	/* If window is reloaded, remove win event listeners
	(DOM element listeners get auto garbage collected but not
	Electron win listeners as the win is not dereferenced unless closed) */
	win.removeAllListeners();

}

/**
 * svg
 */
const svgLoaderHash = <HashLoader size={ 10 } color="white" />
const svgLoaderGrid = <GridLoader size={ 4 } color="white" margin={ 1 } />
const svgLoaderPuff = <PuffLoader size={ 10 } color="white" speedMultiplier={ 0.5 } />

const svgDownload = <MdDownload />
const svgDownloadDone = <MdDownloadDone />
const svgPaste = <MdOutlineContentPaste />
const svgNetwork = <BsHddNetwork />
const svgHistory = <MdHistory />
const svgCookie = <BiCookie />
const svgFormat = <MdFormatPaint />
const svgFolder = <MdOutlineFolder />
const svgSubtitleFill = <MdSubtitles />
const svgSubtitle = <MdOutlineSubtitles />
const svgVideo = <BsCameraVideo />
const svgMusic = <BsMusicNoteBeamed />
const svgUnmaximize = <CgMinimize />
const svgMaximize = <VscChromeMaximize />
const svgUp = <MdOutlineKeyboardArrowUp />
const svgDown = <MdOutlineKeyboardArrowDown />
const svgRemove = (className = 'svgRemove') =>
	<IconContext.Provider value={ { className: className } }>
		<MdOutlineRemove />
	</IconContext.Provider>
const svgSuccess =
	<IconContext.Provider value={ { className: 'svgSuccess' } }>
		<MdOutlineCheck />
	</IconContext.Provider>
const svgClose = (className = 'svgClose') =>
	<IconContext.Provider value={ { className: className } }>
		<MdClose />
	</IconContext.Provider>
const svgPlay = <IoPlayOutline />
const svgPhoto =
	<IconContext.Provider value={ { className: 'svgPhoto' } }>
		<MdOutlineInsertPhoto />
	</IconContext.Provider>
const svgRight = <BsFillArrowRightCircleFill />
const svgDanger =
	<IconContext.Provider value={ { className: 'svgDanger' } }>
		<BsFillExclamationTriangleFill />
	</IconContext.Provider>
const svgInfo = <MdInfo />


export default class App extends React.Component<
	{},
	{
		urlInput: string,
		maximized: boolean,
		datas: TaskData[],

		isSpecifyDownloadPath: boolean,
		isProxy: boolean,
		isFormatFilename: boolean,
		saveThumbnail: boolean,
		saveSubtitles: boolean,
		isUseCookie: boolean,
		isUseHistory: boolean,
		saveAutoSubtitle: boolean,
		saveAllSubtitles: boolean,
		isUseLocalYtdlp: boolean,
		isDisplayDownloading: boolean,
		isDisplayFinished: boolean,

		contentSelector: 'video' | 'audio' | 'skip'

		fileNameTemplate: string,
		proxyHost: string,
		cookieFile: string,
		historyFile: string,
		destPath: string,
		tempPath: string,
	}
> {
	constructor(props: App['props']) {
		super(props);
		this.state = {
			urlInput: '',
			// processes: store.get('taskHistories').sort((a: TaskHistory, b: TaskHistory) => a.timestamp - b.timestamp),
			datas: histories ? histories.slice() : [],
			maximized: false,

			isSpecifyDownloadPath: store.get('isSpecifyDownloadPath'),
			isProxy: store.get('isProxy'),
			isFormatFilename: store.get('isFormatFilename'),
			saveThumbnail: store.get('saveThumbnail'),
			saveSubtitles: store.get('saveSubtitles'),
			isUseCookie: store.get('isUseCookie'),
			isUseHistory: store.get('isUseHistory'),
			saveAutoSubtitle: store.get('saveAutoSubtitle'),
			saveAllSubtitles: store.get('saveAllSubtitles'),
			isUseLocalYtdlp: store.get('isUseLocalYtdlp'),
			contentSelector: store.get('contentSelector', 'video') as 'video' | 'audio' | 'skip',
			isDisplayDownloading: store.get('isDisplayDownloading'),
			isDisplayFinished: store.get('isDisplayFinished'),

			proxyHost: store.get('proxyHost'),
			cookieFile: store.get('cookieFile'),
			historyFile: store.get('historyFile'),
			destPath: store.get('destPath'),
			tempPath: store.get('tempPath'),
			fileNameTemplate: store.get('fileNameTemplate')
		}
	}

	startDownload = () => {
		/**
		 * *失敗心得:
		 * 不能直接在startDownload()裡面一步到胃
		 * 重點是setState是異步的,在startDownload()裡面放好幾個setState,會導致他們一起執行
		 * 期望的情況是挨個兒執行,也就是說一起執行會出錯
		 * 比如先粘貼,更新了url之後,才能取得這個url.實際情況是url還沒更新呢,就已經取了,這會取到空值,不行
		 * 貌似這樣需要連續的setState唯一的解法就是用setState自帶的callback參數
		 * 
		 * *誒嘿,轉變一下思路:
		 * 原本是讀取->set->讀取,其實可以不需要讀兩遍
		 * 讀出來是空的就直接從clipboard裡面讀好了,然後順便把clipboard裡面讀到的setState
		 */
		/**
		 * 清空狀態,先清空在
		 */


		let urlInput = this.state.urlInput
		if (urlInput.trim() === '') {
			urlInput = clipboard.readText()
			this.setState((state, props) => ({
				urlInput: urlInput,
			}))
		}
		console.log('*url inputed:', urlInput);
		console.log('*start download');
		/**
		 * 直接用是會有注入的風險啦
		 * \\TO\DO: 最好還是防注入做一下
		 * 感覺好像本來就不支援url帶引號?
		 * 空格連一下,開頭的--去掉,好像就差不多了齁
		 * 根據doc裡的風格指導,state裡只存origin content,能從state算出來的值都不是state,
		 * 所以不必把escaped好的值放state裡面啦
		 */
		urlInput = urlInput.replace(/( )|(^--?)/g, '')
		const ytdlpOptions: string[] = [];
		ytdlpOptions.push('--progress-template', '"[download process]|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|"',)
		// ytdlpOptions.push('-P', 'temp:'+this.state.tempPath)
		// ytdlpOptions.push('-r', '5K') //調試用降速
		// ytdlpOptions.push('--geo-verification-proxy', 'http://127.0.0.1:7890') //沒用啊...
		// ytdlpOptions.push('--print', '%(title)s', '--no-simulate') 


		this.state.isSpecifyDownloadPath && ytdlpOptions.push('-P', quotePath(this.state.destPath)) //如果不加home:或temp:就是下載在一塊兒(以前就是這樣的)
		this.state.isProxy && ytdlpOptions.push('--proxy', this.state.proxyHost,)
		this.state.isFormatFilename && ytdlpOptions.push('-o', this.state.fileNameTemplate,)
		this.state.saveThumbnail && ytdlpOptions.push('--write-thumbnail',)
		this.state.saveSubtitles && ytdlpOptions.push('--write-subs',)
		this.state.isUseCookie && ytdlpOptions.push('--cookies', this.state.cookieFile)
		this.state.isUseHistory && ytdlpOptions.push('--download-archive', this.state.historyFile)
		this.state.contentSelector === 'skip' && ytdlpOptions.push('--skip-download')
		this.state.contentSelector === 'audio' && ytdlpOptions.push('--format', 'bestaudio/best')
		this.state.saveAutoSubtitle && ytdlpOptions.push('--write-auto-subs')
		// this.state.saveAllSubtitles && ytdlpOptions.push('')

		ytdlpOptions.push(urlInput)
		const ytdlpCommand = this.state.isUseLocalYtdlp ?
			/**
				 * 使用py要比用standalone快得多
				 * 各種不同的py版本很奇怪.總之啟用shell:true以及taskkill應該就ok了
				 */
			'yt-dlp'
			// 'D:/usr/bin/yt-dlp#.exe'
			:
			'"' + path.join(__dirname, '..', '..', 'app.asar.unpacked', 'build', 'yt-dlp.exe') + '"'
		console.log('*yt-dlp command:', ytdlpCommand);

		// console.log(__dirname,'yt-dlp.exe');
		const child = spawn(
			/**
			 * 太奇怪了,用yt-dlp.exe直接沒法停止...為什麼會這樣...?
			 * 但是用yt-dlp_min.exe好像就正常
			 * 
			 * 用builder打包的話整個build目錄都被壓成了app.asar,此時getPath之類的操作好像就失效了淦
			 */
			ytdlpCommand,
			ytdlpOptions,
			{ shell: true },
		)
		ytdlpOptions.push('-J',)
		const childJson = spawn(
			ytdlpCommand,
			ytdlpOptions,
			{ shell: true },
		)
		this.setState((state, props) => ({
			datas: state.datas.concat({
				timestamp: Date.now(),
				process: child,
				processJson: childJson,
				urlInput: urlInput,
				status: 'downloading',
			})
		}))


	}
	reportStatus = (timestamp: number, status: Status) => {
		// const success = this.state.process?.kill()
		// if (success) {
		// 	this.setState({
		// 		process: null,
		// 	})
		// }
		console.log('*child report', `[${status}]`, ':', timestamp,);
		const { datasSliced, dataIndex, data } = getCurrentData(this.state.datas, timestamp)

		// const datas = this.state.datas
		// const dataIndex = datas.findIndex((data) => { return data.timestamp === timestamp })
		if (dataIndex === -1) {
			console.error('*Should be found in state.datas but failed!:', timestamp,);
		}
		data.status = status
		this.setState((state, props) => ({
			datas: datasSliced,
		}))
		// this.setState((state, props) => ({
		// 	closedCount: state.closedCount + 1,
		// }))
		/**
		 * seems like directly remove the process from state is probably not a good idea.
		 * if something downloaded finished, or failed, yes, the process is not running.
		 * However, the info should be left so that i can see them,
		 * but the spinner and 'stop' button in singlemode are judged from how many processes exist in the state
		 * 
		 * if in the multimode, those are judged seperately so i needn't to care about them,
		 * in other words, keep process if they are finished
		 */
		// this.setState((state, props) => ({
		// 	processes: state.processes.filter((props) => {
		// 		return timestamp !== props.timestamp
		// 	})
		// }))
	}
	handleRemove = (timestamp: number) => {

		const { datasSliced, dataIndex, data } = getCurrentData(this.state.datas, timestamp)
		// console.log('BEFORE:this.state.datas:', this.state.datas);
		// console.log('BEFORE:datas:', datasSliced);

		// console.log('dataIndex:',dataIndex);
		if (dataIndex !== -1) {
			/**
			 * 如果直接改datas,相當於改state,這不好.
			 * 雖然其實這裡不會出錯,但是會大幅增加出錯的概率
			 */
			const removed = datasSliced.splice(dataIndex, 1)
			// console.log('AFTER:this.state.datas:', this.state.datas);
			// console.log('AFTER:datas:', datasSliced);


			/**
			 * 這裡不知道怎麼回事
			 * dataIndex是錯的
			 * 因為會有-1啊!!!
			 * 
			 * 理論上
			 */
			console.log('*task removed:', timestamp, removed,);
			this.setState((state, props) => {
				// const processes = state.datas
				// const i = processes.findIndex(
				// 	(process) => process.timestamp === timestamp
				// )
				return {
					datas: datasSliced,
				}
			})
		} else {
			console.error('*Should be found in state.datas but failed!:', timestamp,);
		}
		// const taskHistories = store.get('taskHistories')
		// taskHistories.splice(taskHistories.findIndex((taskHistory: taskHistory) => taskHistory.timestamp === timestamp))
		// store.set('taskHistories', taskHistories)
	}
	pasteUrl = (callback?: () => void) => {
		// navigator.clipboard.readText().then((text) => {
		// 	this.setState((state, props) => ({
		// 		url: text
		// 	}))
		// 	console.log(text);
		// })
		const text = clipboard.readText()
		this.setState((state, props) => ({
			urlInput: text
		}), callback
		)
		console.log('*paste:', text);
	}
	handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const target = e.currentTarget
		const value = target.type === 'checkbox' ? target.checked : target.value
		const id = target.id
		this.setState<never>((state, props) => ({
			[id]: value
		}))
		store.set(id, value)
	}
	handleRadio = (e: React.ChangeEvent<HTMLInputElement>) => {
		/**
		 * 好像radio是由相同的name來決定一組
		 * label的htmlFor好像是指向id的
		 */
		const target = e.currentTarget
		const value = target.type === 'checkbox' ? target.checked : target.value
		const name = target.name
		const id = target.id
		this.setState<never>((state, props) => ({
			[name]: value
		}))
		store.set(name, value)
		console.log('*contentSelector:', 'name:', name, 'id:', id, 'value:', value);
	}
	/**
	 * 讚哦,用了remote,直接在這裡操縱win,不用ipc傳來傳去了
	 */
	// handleClick = (e: React.MouseEvent) => {
	// 	const target = e.currentTarget
	// 	const id = target.id
	// 	ipcRenderer.invoke(id)
	// }
	handleMax = (e: React.MouseEvent) => {
		/**
		 * 讚哦,所有的東西全移到這裡來了!
		 * 目前這個腳本已經用不著任何ipc了!
		 */
		const target = e.currentTarget
		const id = target.id
		// ipcRenderer.invoke(id)
		if (id === 'maximize') {
			win.maximize()
			console.log('*maximize', 'isMaximized:', win.isMaximized());
			win.once('moved', () => {
				win.unmaximize()
				// win.webContents.send('moved-unmaximize')
				this.setState((state, props) => ({
					maximized: false,
				}))
				main.console.log('*moved-unmaximize');
			})
		} else if (id === 'unmaximize') {
			win.unmaximize()
			console.log('*unmaximize', 'isMaximized:', win.isMaximized());
		}

		this.setState((state, props) => ({
			maximized: !state.maximized
		}))
	}
	handleClick = (e: React.MouseEvent) => {
		const target = e.currentTarget
		const className = e.currentTarget.className
		const id = target.id
		if (id === 'openDir' && this.state.isSpecifyDownloadPath) {
			console.log('*open dir:', this.state.destPath);
			spawn('start', ['""', `"${this.state.destPath}"`], { shell: true })
			// shell.openPath(this.state.destPath)
		} else if (id === 'openDir' && !this.state.isSpecifyDownloadPath) {
			const cwd = remote.process.cwd()
			console.log('*open dir:', cwd);
			spawn('start', ['""', `"${cwd}"`], { shell: true })
			// shell.openPath(cwd)
		} else if (id === 'openHistory') {
			// const appPath = main.app.getAppPath()
			const historyFile = this.state.historyFile
			console.log('*open historyFile:', historyFile);
			spawn('start', ['""', `"${historyFile}"`], { shell: true })
		} else if (id === 'openCookie') {
			// const appPath = main.app.getAppPath()
			const cookieFile = this.state.cookieFile
			console.log('*open cookieFile:', cookieFile);
			spawn('start', ['""', `"${cookieFile}"`], { shell: true })
		} else if (className.includes('contentSelectorOption')) {
			/**
			 * 處理radio
			 */
			this.setState<never>((state, props) => ({
				contentSelector: id
			}))
			store.set('contentSelector', id)
		} else if (id in this.state) {
			/**
			 * 處理checkbox
			 */
			const value = !this.state[id as keyof App['state']]
			this.setState<never>((state, props) => ({
				[id]: value,
			}))
			store.set(id, value)
		}
	}
	getStatusCount = (status: Status = 'downloading') => {
		const count = this.state.datas.reduce((count, data) => {
			return data.status === status ? count + 1 : count
		}, 0)
		return count
	}
	render() {


		const trafficLight =
			<div className="trafficLight">
				<button
					tabIndex={ -1 } id='minimize'
					onClick={ () => { win.minimize() } }
				>
					{ svgRemove() }
				</button>
				{
					this.state.maximized
						?
						<button tabIndex={ -1 } id='unmaximize'
							onClick={ this.handleMax }
						>
							{ svgUnmaximize }
						</button>
						:
						<button tabIndex={ -1 } id='maximize'
							onClick={ this.handleMax }
						>
							{ svgMaximize }
						</button>
				}
				<button
					tabIndex={ -1 } id='close'
					onClick={ () => { win.close() } }
				>
					{ svgClose() }
				</button>
			</div>

		const totalLoader =
			/**
			* 哈...邏輯短路真的短路了...
			* this.state.process || 1 && Element
			* &&優先級高於||
			* 所以相當於this.state.process || Element
			* 當前面的有內容的時候直接返回前面的...process...就報錯了...所以ts為啥不報錯?!
			* 然後eslint也不報錯...
			* 奇怪了
			* 
			* it's so confused to set the spinner...
			* my original attemption is let it appear whenever any download process is running.
			* but now process will keep in state even if they were closed
			* so it's necessary to judge whether a process is running or closed
			* oh wait, it seems unnecessary in multimode.
			* i can let it appear per task bar rather the url bar
			* it is only needed in the single mode
			*/
			/**
			 * TO\DO: make the spinner work well
			 */
			!!this.getStatusCount('downloading') &&
			<div className='totalLoader'>
				{ svgLoaderPuff }
			</div>
		const urlBar =
			<div className="urlBar">
				<input
					autoFocus
					onKeyPress={ (e) => {
						e.key === 'Enter' /* && !this.state.process */ && this.startDownload()
					} }
					className='urlInput'
					placeholder='Input a videopage url'
					type='text'
					id='urlInput'
					value={ this.state.urlInput }
					onChange={ this.handleInputChange }
				/>
				{
					/**
					 * 單個模式下要Stop好像有點麻煩
					 */
				}
				<button className='btnStart' tabIndex={ -1 } onClick={ this.startDownload }>{ svgPlay }</button>
				<button className='btnPaste' tabIndex={ -1 } onClick={ () => this.pasteUrl() }>{ svgPaste }</button>

			</div>
		/**
		 * 太太太太太忍者了ござる!!!
		 * 把obj裡的key連起來變成union,但是只會連指定類型的「key對應的type」
		 */
		// type A = {
		// 	[key in keyof App['state']]: App['state'][key] extends boolean ? key : never
		// }[keyof App['state']]

		const optionWithInput = (checkboxId: KeyofType<App['state'], boolean>, checkboxPopupContent?: string, buttonContent?: string | JSX.Element, buttonPopupContent?: string, textInputId?: KeyofType<App['state'], string>, buttonId?: string, placeholder?: string,) => {
			/**
			 * if no buttonName provided, checkboxId will be used
			 * if no placeholder provided, textInputId will be used
			 * these ids are used as the html id and state name
			 */
			if (!buttonContent) {
				buttonContent = checkboxId.replace(/([A-Z])/g, ' $1')
				buttonContent = buttonContent[0].toUpperCase() + buttonContent.slice(1)
			}
			if (!placeholder && textInputId) {
				placeholder = textInputId.replace(/([A-Z])/g, ' $1')
				placeholder = placeholder[0].toUpperCase() + placeholder.slice(1)
			}
			/**
			 * TO\DO: make options functionable
			 * TO\DO:make options beautiful
			 */
			return (
				<div className="optionWithInput">
					{ checkOption(checkboxId, svgSuccess, checkboxPopupContent) }
					<Tippy content={ buttonPopupContent } disabled={ !buttonPopupContent }>
						<div
							id={ buttonId }
							// type='button'
							className={ classNames(
								"promptButton",
								{ 'clickAble': buttonId },
								{ 'noTextInput': !textInputId },
							) }
							/* htmlFor={ id } */
							onClick={ buttonId ? this.handleClick : undefined }
							tabIndex={ -1 }
						>{ buttonContent }</div>
					</Tippy>

					{ textInputId &&
						<input tabIndex={ -1 } type="text" className="input" value={ this.state[textInputId] } onChange={ this.handleInputChange } id={ textInputId } placeholder={ placeholder } />
					}
				</div>
			)
		}
		const radioOption = (id: 'video' | 'audio' | 'skip', buttonContent?: string | JSX.Element, popupContent?: string,) => {
			if (!buttonContent) {
				buttonContent = id.replace(/([A-Z])/g, ' $1')
				buttonContent = buttonContent[0].toUpperCase() + buttonContent.slice(1)
			}
			return <Tippy content={ popupContent } disabled={ !popupContent }>
				<div
					className={ classNames("selectorOption contentSelectorOption", { 'checked': this.state.contentSelector === id }) }
					id={ id }
					onClick={ this.handleClick }
				>
					{ buttonContent }
				</div>
			</Tippy>
		}
		const checkOption = (id: KeyofType<App['state'], boolean>, buttonContent?: string | JSX.Element, popupContent?: string) => {
			if (!buttonContent) {
				buttonContent = id.replace(/([A-Z])/g, ' $1')
				buttonContent = buttonContent[0].toUpperCase() + buttonContent.slice(1)
			}
			return <Tippy content={ popupContent } disabled={ !popupContent } duration={100}>
				<div
					className={ classNames("selectorOption", { 'checked': this.state[id] }) }
					id={ id }
					onClick={ this.handleClick } >
					{ buttonContent }
				</div>
			</Tippy>
		}
		const displaySelector =
			<div className="selector">
				{ checkOption('isDisplayDownloading', svgDownload, 'Show Tasks Downloading or Failed') }
				{ checkOption('isDisplayFinished', svgDownloadDone, 'Show Tasks Finished') }
			</div>
		const contentSelector =
			<div className="selector">
				{ radioOption('video', svgVideo, 'Download best video and audio, then merge') }
				{ radioOption('audio', svgMusic, 'Only download best audio') }
				{ radioOption('skip', svgClose(), 'Skip download, useful for downloading thumbnail or test') }
			</div>
		const bonusSelector =
			<div className="selector">
				{ checkOption('saveThumbnail', svgPhoto, 'Save Thumbnail') }
				{ checkOption('saveSubtitles', svgSubtitle, 'Save Subtitle') }
				{ checkOption('saveAutoSubtitle', svgSubtitleFill, 'Save AutoSubtitle') }
			</div>

		const optionsArea =
			<div className="optionsArea">
				<div className="selectors">
					{ contentSelector }
					{ displaySelector }
					{ bonusSelector }
				</div>
				<div className="options">
					{ optionWithInput('isSpecifyDownloadPath', 'Enable to download at the specific path. Otherwise at where the app exists', svgFolder, 'Open folder, depending on your setting', 'destPath', 'openDir',) }
					{ optionWithInput('isProxy', 'Enable to use proxy. support http and socks5, but http is recomended', svgNetwork, '', 'proxyHost',) }
					{ optionWithInput('isUseCookie', 'Enable to use cookie', svgCookie, 'Open specified cookie file', 'cookieFile', 'openCookie',) }
					{ optionWithInput('isUseHistory', 'Enable to use history file. If downloaded and recorded in history file, it will not be downloaded twice', svgHistory, 'Open specified history file', 'historyFile', 'openHistory',) }
					{ optionWithInput('isFormatFilename', 'Enable to format downloaded filename', svgFormat, '', 'fileNameTemplate',) }
					{/* { option('saveThumbnail',) } */ }
					{/* { option('saveSubtitles',) } */ }
					{/* { option('notDownloadVideo',) }
					{ option('onlyDownloadAudio',) } */}
					{/* { option('saveAutoSubtitle',) } */ }
					{ optionWithInput('isUseLocalYtdlp', 'Enable to use local yt-dlp command, required it in the path. If not understand, DO NOT enable it', 'Local Ytdlp', '') }
					{/* { option('saveAllSubtitles',) } */ }
				</div>
			</div>

		const tasksArea =
			<Flipper
				flipKey={ this.state.datas.length + +this.state.isDisplayDownloading + +this.state.isDisplayFinished + this.getStatusCount('downloading') }
				className='flipper'
				spring={ { stiffness: 10000, damping: 200 } }
			>
				<Scrollbars
					style={ { height: '100%',/* right:'3%' */ } }
					// noDefaultStyles 
					// removeTracksWhenNotUsed
					// disableTracksWidthCompensation

					renderTrackVertical={ props => <div { ...props } className="scrollbarTrackVertical" /> }
					hideTracksWhenNotNeeded
					// autoHeight
					autoHide
					autoHideTimeout={ 1000 }
					autoHideDuration={ 200 }
				>
					<div className="display-area">
						{
							this.state.datas.map((taskData) => {
								return (
									<Task
										isDisplay={ taskData.status === 'finished' ? this.state.isDisplayFinished : this.state.isDisplayDownloading }
										key={ taskData.timestamp }
										taskData={ taskData }
										reportStatus={ (status) => this.reportStatus(taskData.timestamp, status) }
										handleRemove={ () => this.handleRemove(taskData.timestamp) }
									/>
								)
							}).reverse()
						}

					</div>
				</Scrollbars>
			</Flipper>
		return (
			<>
				{ trafficLight }
				<div className="container">
					<div className="main">
						{ totalLoader }
						{ urlBar }
						{ tasksArea }
						{ optionsArea }
					</div>
				</div>
			</>
		);
	}
}

class Task extends React.Component<
	{
		isDisplay: boolean,
		taskData: TaskData
		reportStatus: (status: Status) => void
		handleRemove: () => void
	},
	{
		// processingOutput?: string[],
		thumbnailFinished?: boolean,
		otherInfo?: string,
		errorInfo?: string,

		destPath?: string,
		title?: string,
		fileSizeValue?: number,
		fileSizeString?: string,
		durationString?: string,
		webpageUrl?: string,

		speed?: string,
		etaString?: string,
		percentValue?: number,

		status: Status,
		removeConfirmed: boolean,

	}
> {
	child?: ChildProcess
	childJson?: ChildProcess
	constructor(props: Task['props']) {
		super(props);
		const taskData = this.props.taskData
		/**
		 * 目前使用從上面傳下來的方法
		 * 而上面的有兩種來源:新建 | 讀取自db
		 * 新建的 會 有childprocess,但是 不會 有其餘的資訊
		 * db的 不會 有childprocess,但是 有 大量的資訊
		 */
		this.state = {
			thumbnailFinished: taskData.thumbnailFinished,
			// otherInfo: taskHistory.otherInfo,
			// errorInfo: taskHistory.errorInfo,

			destPath: taskData.destPath,
			title: taskData.title,
			fileSizeValue: taskData.fileSizeValue,
			fileSizeString: taskData.fileSizeString,
			durationString: taskData.durationString,
			// webpageUrl: taskHistory.webpageUrl,

			// speed: taskHistory.speed,
			// etaString: taskHistory.etaString,
			percentValue: taskData.percentValue,

			status: taskData.status,
			removeConfirmed: false,
		}

		this.childJson = this.props.taskData.processJson
		this.childJson?.stdout?.on('data', (data: Buffer) => {
			// console.log('json:', typeof data, data);
			let infoJson: any | null
			try {
				infoJson = JSON.parse(decode(data, 'gbk'))
			} catch {
				infoJson = null
			}
			if (infoJson) {

				// console.log('*json:', infoJson);
				const title = infoJson['fulltitle']
				const destPath = infoJson['requested_downloads'][0]['_filename'] as string
				const fileSizeValue = infoJson['filesize'] ?? infoJson['filesize_approx'] as number
				const fileSizeString = (fileSizeValue / 1024 / 1024).toFixed(1) + ' MiB'
				const durationString = infoJson['duration_string']
				const webpageUrl = infoJson['webpage_url']

				this.setState((state, props) => ({
					title: title,
					destPath: destPath,
					fileSizeValue: fileSizeValue,
					fileSizeString: fileSizeString,
					durationString: durationString,
					webpageUrl: webpageUrl,
				}))
			}
		})
		this.child = this.props.taskData.process
		this.child?.stdout?.on('data', (data: Buffer) => {
			const info = decode(data, 'gbk').trim()
			if (info.includes('[download process]')) {
				console.log('*processingOutput:', info);
				const processingOutput = info.replace(/(\r)|(')|(")/g, '').split('|').map((str) => str.trim())
				this.setState((state, props) => ({
					// processingOutput: processingOutput,
					percentValue: parseFloat(processingOutput[1]),
					speed: processingOutput[2],
					etaString: processingOutput[3],

					otherInfo: (state.percentValue && state.percentValue < 100) ? 'Downloading...' : state.otherInfo
				}))
				// } else if (info.includes('[download] Destination')) {
				// 	console.log('*downloadingInfo:', info);
				// 	this.setState((state, props) => ({
				// 		otherInfo: info,
				// 		destPath: info.replace('[download] Destination: ', '').trim().replace('\n', ''),
				// 	}))


			} else if (info.includes('Writing video thumbnail')) {
				console.log('*thumbnailInfo:', info);
				this.setState((state, props) => ({
					thumbnailFinished: true,
					otherInfo: info,
				}))


				// } else if (info.includes('has already been downloaded')) {
				// 	console.log('*otherinfo:', info);
				// 	// [download] D:\Downloads\CRTubeGet Downloaded\youtube-dl\[20220218]【メン限でアーカイブ残してます！】かわいくってごめんね？【神楽めあ】-1oOgfQA5KRc.webm has already been downloaded
				// 	this.setState((state, props) => ({
				// 		otherInfo: info,
				// 		destPath: info.replace('[download] ', '').replace(' has already been downloaded', '').replace('\n', ''),
				// 	}))
			} else if (info.includes('idk')) {
				/* empty */

				// } else if (info.includes('Downloading video thumbnail')) {
				// 	console.log('*otherinfo:', info);
			} else {
				console.log('*other info:', info);
				this.setState((state, props) => ({
					otherInfo: info
				}))
			}
		})
		this.child?.stderr?.on('data', (data) => {
			let info = decode(data, 'gbk')
			console.log('*stderr:', info);
			if (info.includes('is not a valid URL') || info.includes('You must provide at least one URL')) {
				info = 'Please input a vaild url'
			}
			this.setState((state, props) => ({
				errorInfo: info
			}))
		})
		this.child?.on('close', (code) => {
			console.log('*process close with code', `[${code}]`, ':', this.props.taskData.timestamp);

			/**
			 * seems that 0 === finished
			 * null === kill()
			 * 1 === error
			 * 
			 * if i use takkkill,force kill will be 1 not null
			 */
			switch (code) {
				case 0:
					this.props.reportStatus('finished')
					this.setState((state, props) => ({
						status: "finished",
						otherInfo: 'Finished',
					}))
					break;
				// case 1:
				// 	if (this.state.status !== 'stopped') {
				// 		this.setState((state, props) => ({
				// 			status: "error"
				// 		}))
				// 	}
				// 	break;
				// case null:
				// 	this.setState((state, props) => ({
				// 		status: "stopped"
				// 	}))
				// 	break;

				default:
					if (this.state.status !== 'stopped') {
						this.props.reportStatus('error')
						this.setState((state, props) => ({
							status: "error",
							otherInfo: this.state.otherInfo && "Failed"
						}))
					}
					break;
			}


		})

	}

	// componentDidUpdate(){
	// 	// console.log('*update');

	// }
	handleStop = () => {
		/**
		 * 這個不一定成功.
		 * 如果process還有生subprocess,kill只會殺死process,而不會殺死subprocess
		 * 這個yt-dlp用2022.2新版本的standalone的時候就會出現這種問題
		 * 只能用上神奇的taskkill.默認的kill太遜了
		 * 
		 * 如果先kill,再用taskkill,taskkill會失敗
		 */
		// this.child.kill()
		const kill = spawn('taskkill', ['/pid', this.child?.pid?.toString() ?? '', '/f', '/t',])
		kill.on('close', () => {
			this.setState((state, props) => ({
				status: "stopped",
				otherInfo: this.state.otherInfo && 'Cancelled',
			}))
			/**
			 * 上面的handleStop()只幹了一件事:把status設為stopped,以便於統計
			 * 不能排除這裡按了,但是沒有觸發onClose的event的情況
			 * 這邊直接來一發就能確保了
			 * 不過會出現手動按叉叉會執行兩遍this.props.handleStop()的情況,不過無傷大雅
			 */
			this.props.reportStatus('stopped')
		})
	}
	handleContextClick = (e: React.MouseEvent, data: ContextData) => {
		console.log('*context data:', data);
		data.action && data.action()
	}
	handleRemove = () => {
		// const historyIndex = histories.findIndex((history) => {
		// 	return history.timestamp === this.props.taskData.timestamp
		// })
		const timestamp = this.props.taskData.timestamp
		if (!this.state.removeConfirmed) {
			this.setState((state, props) => ({
				removeConfirmed: true,
			}))
			// setTimeout(() => {
			// 	this.setState((state, props) => ({
			// 		removeConfirmed: false,
			// 	}))
			// }, 3000);
		} else {
			const { dataIndex, } = getCurrentData(histories, timestamp)

			if (dataIndex !== -1) {
				const removed = histories.splice(dataIndex, 1)
				db.write()
				console.log('*remove from db:', timestamp, removed,);
				this.props.handleRemove()
			} else {
				console.error('*Should be found in histories but failed!:', timestamp,);
			}
		}
	}

	handleOpenFolder = () => {
		const destPath = this.state.destPath
		if (destPath) {
			// spawn('start', ['""', '"' + path.dirname(destPath) + '"'], { shell: true, })
			// spawn('explorer', ['/select,', '"' + destPath + '"'], { shell: true, })
			if (this.state.status === 'finished') {
				console.log('*showItemInFolder:', destPath);
				shell.showItemInFolder(destPath)
				// shell.openPath(path.dirname(destPath))
			} else {
				console.log('*openPath:', destPath);
				shell.openPath(path.dirname(destPath))
				/**
				 * part不行,因為有.f248.webm.part
				 */
				// shell.showItemInFolder(destPath + '.part')
			}
		}
	}
	render() {
		const info = {
			timestamp: this.props.taskData.timestamp,
			urlInput: this.props.taskData.urlInput,

			thumbnailFinished: this.state.thumbnailFinished,
			otherInfo: this.state.otherInfo,
			errorInfo: this.state.errorInfo,

			destPath: this.state.destPath,
			title: this.state.title,
			fileSizeValue: this.state.fileSizeValue,
			fileSizeString: this.state.fileSizeString,
			durationString: this.state.durationString,
			webpageUrl: this.state.webpageUrl,

			speed: this.state.speed,
			etaString: this.state.etaString,
			percentValue: this.state.percentValue,

			status: this.state.status,
		}
		const taskHistory: History = {
			timestamp: info.timestamp,
			status: info.status === 'downloading' ? 'stopped' : info.status,
			urlInput: info.urlInput,
			destPath: info.destPath,
			percentValue: info.percentValue,
			fileSizeValue: info.fileSizeValue,
			fileSizeString: info.fileSizeString,
			title: info.title,
			durationString: info.durationString,
			thumbnailFinished: info.thumbnailFinished,
		}
		// console.log(histories);
		// const historyIndex = histories.findIndex((history) => history.timestamp === info.timestamp)
		const { dataIndex } = getCurrentData(histories, info.timestamp)
		if (dataIndex === -1) {
			console.log('*not in histories and will be added:', info.timestamp,);
			histories.push(taskHistory)
		} else {
			histories[dataIndex] = taskHistory
		}

		const progressBar =
			<ProgressLine
				percent={ info.percentValue }
				// strokeColor={ '#cc66ff' }
				strokeLinecap='square'
				strokeWidth={ 0.4 }
				className='progressBar'
			/>
		/**
		 * TO\DO: progress bar
		 */
		let statusIcon: JSX.Element = svgLoaderHash
		switch (info.status) {
			case 'downloading':
				statusIcon = svgLoaderHash
				break;
			case 'stopped':
				statusIcon = svgClose('svgCloseStopped')
				break;
			case 'finished':
				statusIcon = svgSuccess
				break;
			case 'error':
				statusIcon = svgClose('svgCloseError')
				break;

			default:
				break;
		}

		const statusIndicator = <div className="statusIndicator">
			{ !!this.state.thumbnailFinished && svgPhoto }
			{ statusIcon }
		</div>
		const infoDiv = (info: string | undefined, classname: string, svg?: JSX.Element) =>
			(isDebug || (
				!!info &&
				info !== 'NA' &&
				info !== 'Unknown'
			)) &&
			<div className={ classname }>
				{ svg }
				<span>
					{ info }
				</span>
			</div>

		const leftCol =
			<div className="leftcol">
				{ statusIndicator }
			</div>
		const midCol =
			isNumber(info.percentValue) &&
			<div className="midcol">
				{ infoDiv(info.percentValue + '%', 'infoPercent') }
				{ infoDiv(info.fileSizeString, 'infoSize') }
				{ infoDiv(info.speed, 'infoSpeed') }
				{ infoDiv(info.etaString, 'infoEta') }
			</div>
		const rightcolContext =
			<ContextMenu id={ "rightcolContext" + info.timestamp } hideOnLeave>
				{ info.urlInput &&
					<MenuItem data={ { actionId: 'copyUrl', action: () => { clipboard.writeText(info.urlInput) }, info: info } as ContextData } onClick={ this.handleContextClick }>
						Copy Url: { info.urlInput }
					</MenuItem>
				}
				{ info.destPath &&
					<MenuItem data={ { actionId: 'openFolder', action: this.handleOpenFolder } as ContextData } onClick={ this.handleContextClick }>
						Open In Explorer
					</MenuItem>
				}
			</ContextMenu>
		const rightCol =
			<ContextMenuTrigger
				id={ "rightcolContext" + info.timestamp }
				attributes={ {
					className: 'rightcol',
					onDoubleClick: this.handleOpenFolder,
				} }
			>

				{/* <div className="rightcol" onDoubleClick={ this.handleOpenFolder }> */ }
				{ infoDiv(info.title ?? this.props.taskData.urlInput, 'infoTitle', svgRight) }
				{ ((info.percentValue && !isNaN(info.percentValue)) || isDebug) && progressBar }
				{ !!info.otherInfo &&
					<div className="infoOther">
						{ svgInfo }
						<span>{ info.otherInfo }</span>
					</div>
				}
				{ !!info.errorInfo &&
					<div className="infoError">
						{ svgDanger }
						<span> { info.errorInfo }</span>
					</div>
				}
				{/* </div> */ }

			</ContextMenuTrigger>

		const rightMostCol =
			<div
				className="rightMostCol"
				/**
				 * 點一下變紅,再點一下刪掉
				 * 滑鼠移開就變白.感覺這樣比等三秒合理
				 */
				onClick={ info.status === 'downloading' ? this.handleStop : () => this.handleRemove() }
				onMouseLeave={
					() => {
						// console.log('out');
						this.setState((state, props) => ({
							removeConfirmed: false,
						}))
					}
				}
			>
				{ info.status === 'downloading' ?
					svgClose()
					:
					svgRemove(this.state.removeConfirmed ? 'svgRemoveConfirmed' : 'svgRemove')
				}
			</div>

		return (
			<>
				{ this.props.isDisplay &&
					<Flipped flipId={ info.timestamp } onAppear={ onElementAppear } /* onExit={ onElementExit } */>
						<div className="task">
							{ leftCol }
							{ midCol }
							{ rightCol }
							{ rightMostCol }
						</div>
					</Flipped>
				}
				{
					/**
					 * 這個如果unmount的話會出現詭異的bug,那就不要讓他unmount好了
					 * 然後他在這個位置之後,就不會隨著列表滾動了
					 */
					rightcolContext
				}
			</>
		);
	}
}
