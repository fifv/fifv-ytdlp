/**
 * 目前問題:
 * * 如果下的是影片,雙擊打不開
 * 		* 因為讀到的是.251.webm之類的中間檔案,而不是最終檔
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
	MdHistory, MdOutlineContentPaste,

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
const win = remote.getCurrentWindow()
const main = {
	console: remote.require('console'),
	app: remote.app,
}

const isDebug = false
// const isDebug = true
interface Data {
	histories: {
		timestamp: number,
		url: string,
		status: string,
		destPath?: string,
		percentValue?: number,
		size?: string,
		title?: string,

	}[]
}
const db = new Low<Data>(new JSONFile(path.join(main.app.getPath('userData'), 'histories.json')))
await db.read()
db.data ||= {
	histories: []
}
const { histories } = db.data
// db.write()

console.log('*yt-dlp bin path:', path.join(__dirname, '..', '..', 'app.asar.unpacked', 'build', 'yt-dlp.exe'));
// console.log(main.app.getPath('exe'));
type KeyofType<OBJ, TYPE> = {
	[key in keyof OBJ]: OBJ[key] extends TYPE ? key : never
}[keyof OBJ]
const svgLoaderHash = <HashLoader size={ 10 } color="white" />
const svgLoaderGrid = <GridLoader size={ 4 } color="white" margin={ 1 } />
const svgLoaderPuff = <PuffLoader size={ 10 } color="white" speedMultiplier={ 0.5 } />

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
const svgRemove =
	<IconContext.Provider value={ { className: 'svgRemove' } }>
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

const quotePath = (path: string) => {
	if ((path[0] === `'` && path[path.length - 1] === `'`) || (path[0] === `"` && path[path.length - 1] === `"`)) {
		return path
	} else {
		return '"' + path + '"'
	}
}
interface taskHistory {
	timestamp: number,
	url: string,
	status: "finished" | "stopped" | "downloading" | "error",
	processingOutput: string[],
	destPath: string | undefined,
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

export default class App extends React.Component<
	{},
	{
		url: string,
		maximized: boolean,
		processes: {
			timestamp: number,
			process?: ChildProcess,
			url: string,
		}[],
		closedCount: number,


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
			url: '',
			processes: store.get('taskHistories').sort((a: taskHistory, b: taskHistory) => a.timestamp - b.timestamp),
			maximized: false,
			closedCount: 0,

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


		console.log('*start download');
		let url = this.state.url
		if (url.trim() === '') {
			url = clipboard.readText()
			this.setState((state, props) => ({
				url: url,
			}))
		}
		console.log('*url inputed:', url);
		/**
		 * 直接用是會有注入的風險啦
		 * \\TO\DO: 最好還是防注入做一下
		 * 感覺好像本來就不支援url帶引號?
		 * 空格連一下,開頭的--去掉,好像就差不多了齁
		 * 根據doc裡的風格指導,state裡只存origin content,能從state算出來的值都不是state,
		 * 所以不必把escaped好的值放state裡面啦
		 */
		url = url.replace(/( )|(^--?)/g, '')
		const ytdlpOptions: string[] = [];
		ytdlpOptions.push('--progress-template', '"[download process]|%(progress._percent_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(info.title)s|"',)
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

		ytdlpOptions.push(url)
		const ytdlpCommand = this.state.isUseLocalYtdlp ?
			/**
			 * 使用py要比用standalone快得多
			 * 各種不同的py版本很奇怪.總之啟用shell:true以及taskkill應該就ok了
			 */
			'yt-dlp'
			// 'D:/usr/bin/yt-dlp#.exe'
			:
			path.join(__dirname, '..', '..', 'app.asar.unpacked', 'build', 'yt-dlp.exe')

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
		this.setState((state, props) => ({
			processes: state.processes.concat({
				timestamp: Date.now(),
				process: child,
				url: url,
			})
		}))


	}
	handleStop = (timestamp: number) => {
		// const success = this.state.process?.kill()
		// if (success) {
		// 	this.setState({
		// 		process: null,
		// 	})
		// }
		console.log(`*child ${timestamp} report closed`);
		this.setState((state, props) => ({
			closedCount: state.closedCount + 1,
		}))
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
		console.log(`*child ${timestamp} removed`);

		this.setState((state, props) => {
			const processes = state.processes
			const i = processes.findIndex(
				(process) => process.timestamp === timestamp
			)
			processes.splice(i, 1)
			return {
				processes: processes
			}
		})
		const taskHistories = store.get('taskHistories')
		taskHistories.splice(taskHistories.findIndex((taskHistory: taskHistory) => taskHistory.timestamp === timestamp))
		store.set('taskHistories', taskHistories)
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
			url: text
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
	render() {


		const trafficLight =
			<div className="trafficLight">
				<button
					tabIndex={ -1 } id='minimize'
					onClick={ () => { win.minimize() } }
				>
					{ svgRemove }
				</button>
				{
					// this.state.maximized
					// 	?
					// 	<button tabIndex={ -1 } id='unmaximize'
					// 		onClick={ this.handleMax }
					// 	>
					// 		{ svgUnmaximize }
					// 	</button>
					// 	:
					// 	<button tabIndex={ -1 } id='maximize'
					// 		onClick={ this.handleMax }
					// 	>
					// 		{ svgMaximize }
					// 	</button>

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
			(this.state.processes.length - this.state.closedCount > 0) &&
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
					id='url'
					value={ this.state.url }
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
		// const option = (id: KeyofType<App['state'], boolean>, name?: string) => {
		// 	if (!name) {
		// 		name = id.replace(/([A-Z])/g, ' $1')
		// 		name = name[0].toUpperCase() + name.slice(1)
		// 	}
		// 	return (
		// 		// <div className="col-12 col-sm-6 col-xl-4">
		// 		// 	<div className="input-group input-group-sm option">
		// 		// 		<input checked={ this.state[id] } onChange={ this.handleInputChange } className='btn-check' type="checkbox" id={ id } tabIndex={ -1 } />
		// 		// 		<label className='btn btn-outline-primary check-container' htmlFor={ id }>{ svgSuccess }</label>

		// 		// 		<input tabIndex={ -1 } type="text" value={ name } className="form-control form-control-sm text-primary" disabled readOnly />
		// 		// 	</div>

		// 		// </div>
		// 		<div className="input-group input-group-sm optionWithInput">
		// 			{/* <input checked={ this.state[id] } onChange={ this.handleInputChange } className='btn-check' type="checkbox" id={ id } tabIndex={ -1 } />
		// 				<label className='btn btn-outline-primary check-container' htmlFor={ id }>{ svgSuccess }</label> */}
		// 			<div className={ classNames('checkButton', { 'checked': this.state[id] }) } id={ id } onClick={ this.handleClick } >{ svgSuccess }</div>

		// 			<div
		// 				id={ id }
		// 				// type='button'
		// 				className="btn btn-outline-primary bg-transparent promptButton"
		// 				/* htmlFor={ id } */
		// 				onClick={ this.handleClick }
		// 				tabIndex={ -1 }
		// 			>{ name }</div>

		// 			{/* <input tabIndex={ -1 } type="text" className="form-control form-control-sm input" value={ this.state[textInput] } onChange={ this.handleInputChange } id={ textInput } placeholder={ placeholder } /> */ }
		// 		</div>

		// 	)
		// }
		const optionWithInput = (checkboxId: KeyofType<App['state'], boolean>, buttonName?: string | JSX.Element, textInputId?: KeyofType<App['state'], string>, buttonId?: string, placeholder?: string,) => {
			/**
			 * if no buttonName provided, checkboxId will be used
			 * if no placeholder provided, textInputId will be used
			 * these ids are used as the html id and state name
			 */
			if (!buttonName) {
				buttonName = checkboxId.replace(/([A-Z])/g, ' $1')
				buttonName = buttonName[0].toUpperCase() + buttonName.slice(1)
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
				// <div className=" col-12 col-sm-6 col-xl-4">
				<div className="optionWithInput">
					{/* <input checked={ this.state[id] } onChange={ this.handleInputChange } className='btn-check' type="checkbox" id={ id } tabIndex={ -1 } />
						<label className='btn btn-outline-primary check-container' htmlFor={ id }>{ svgSuccess }</label> */}
					<div className={ classNames('checkButton', { 'checked': this.state[checkboxId] }) } id={ checkboxId } onClick={ this.handleClick } >{ svgSuccess }</div>

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
					>{ buttonName }</div>

					{ textInputId &&
						<input tabIndex={ -1 } type="text" className="input" value={ this.state[textInputId] } onChange={ this.handleInputChange } id={ textInputId } placeholder={ placeholder } />
					}
				</div>
				// </div>
			)
		}
		const contentSelectorOption = (id: 'video' | 'audio' | 'skip', buttonName?: string | JSX.Element) => {
			return <>
				{/* <input checked={ this.state.contentSelector === id } onChange={ this.handleRadio } className='btn-check' type="radio" id={ id } name="contentSelector" value={ id } tabIndex={ -1 } />
				<label className='selectorOption' htmlFor={ id }>{ id.toUpperCase() }</label> */}
				<div className={ classNames("selectorOption contentSelectorOption", { 'checked': this.state.contentSelector === id }) } id={ id } onClick={ this.handleClick }>{ buttonName || id.toUpperCase() }</div>
			</>
		}
		const bonusSelectorOption = (id: KeyofType<App['state'], boolean>, buttonName?: string | JSX.Element) => {
			if (!buttonName) {
				buttonName = id.replace(/([A-Z])/g, ' $1')
				buttonName = buttonName[0].toUpperCase() + buttonName.slice(1)
			}
			return <>
				{/* <input checked={ this.state[id] } onChange={ this.handleInputChange } className='btn-check' type="checkbox" id={ id } tabIndex={ -1 } /> */ }
				{/* <label className='selectorOption' htmlFor={ id }>{ name }</label> */ }
				<div className={ classNames("selectorOption", { 'checked': this.state[id] }) } id={ id } onClick={ this.handleClick } >{ buttonName }</div>
			</>
		}
		const contentSelector =
			<div className="contentSelector">
				{ contentSelectorOption('video', svgVideo) }
				{ contentSelectorOption('audio', svgMusic) }
				{ contentSelectorOption('skip', svgClose()) }
			</div>
		const bonusSelector =
			<div className="bonusSelector">
				{ bonusSelectorOption('saveThumbnail', svgPhoto) }
				{ bonusSelectorOption('saveSubtitles', svgSubtitle) }
				{ bonusSelectorOption('saveAutoSubtitle', svgSubtitleFill) }
			</div>

		const optionsArea =
			<div className="optionsArea">
				<div className="selectors">
					{ contentSelector }
					{ bonusSelector }
				</div>
				<div className="options">
					{ optionWithInput('isSpecifyDownloadPath', svgFolder, 'destPath', 'openDir',) }
					{ optionWithInput('isProxy', svgNetwork, 'proxyHost',) }
					{ optionWithInput('isUseCookie', svgCookie, 'cookieFile', 'openCookie',) }
					{ optionWithInput('isUseHistory', svgHistory, 'historyFile', 'openHistory',) }
					{ optionWithInput('isFormatFilename', svgFormat, 'fileNameTemplate',) }
					{/* { option('saveThumbnail',) } */ }
					{/* { option('saveSubtitles',) } */ }
					{/* { option('notDownloadVideo',) }
					{ option('onlyDownloadAudio',) } */}
					{/* { option('saveAutoSubtitle',) } */ }
					{ optionWithInput('isUseLocalYtdlp', 'Local Ytdlp') }
					{/* { option('saveAllSubtitles',) } */ }
				</div>
			</div>

		const tasksArea =
			<div className="display-area">
				{
					this.state.processes.map(({ timestamp, process, url }) => {
						return (
							<Task
								timestamp={ timestamp }
								process={ process }
								key={ timestamp }
								url={ url }
								handleStop={ () => this.handleStop(timestamp) }
								handleRemove={ () => this.handleRemove(timestamp) }
							/>
						)
					}).reverse()
				}

			</div>
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
		timestamp: number,
		process?: ChildProcess,
		url: string,
		handleStop: () => void
		handleRemove: () => void
	},
	{
		processingOutput?: string[],
		thumbnailInfo?: string,
		destPath?: string,
		otherInfo?: string,
		errorInfo?: string,

		status: "finished" | "stopped" | "downloading" | "error",

	}
> {
	child?: ChildProcess
	constructor(props: Task['props']) {
		super(props);
		const taskHistory = store.get('taskHistories').find(
			(taskHistory: taskHistory) =>
				taskHistory.timestamp === this.props.timestamp
		) as taskHistory | undefined
		this.state = {
			processingOutput: taskHistory?.processingOutput,
			// thumbnailInfo: '',
			destPath: taskHistory?.destPath,
			// otherInfo: '',
			// errorInfo: '',

			status: taskHistory ? taskHistory.status : 'downloading',
		}

		this.child = this.props.process
		this.child?.stdout?.on('data', (data: Buffer) => {
			const info = decode(data, 'gbk')
			if (info.includes('[download] Destination')) {
				console.log('*downloadingInfo:', info);
				this.setState((state, props) => ({
					otherInfo: info,
					destPath: info.replace('[download] Destination: ', '').trim().replace('\n', ''),
				}))
			} else if (info.includes('[download process]')) {
				const processingOutput = info.replace(/(\r)|(')|(")/g, '').split('|').map((str) => str.trim())
				console.log('*processingOutput:', info);
				this.setState((state, props) => ({
					processingOutput: processingOutput,
				}))


			} else if (info.includes('Writing video thumbnail')) {
				console.log('*thumbnailInfo:', info);
				this.setState((state, props) => ({
					thumbnailInfo: info,
				}))
				// } else if (info.includes('[download] Destination')) {
				// 	console.log('*downloadingInfo:', info);
				// 	this.setState((state, props) => ({
				// 		downloadingInfo: info,
				// 	}))

			} else if (info.includes('has already been downloaded')) {
				console.log('*otherinfo:', info);
				// [download] D:\Downloads\CRTubeGet Downloaded\youtube-dl\[20220218]【メン限でアーカイブ残してます！】かわいくってごめんね？【神楽めあ】-1oOgfQA5KRc.webm has already been downloaded
				this.setState((state, props) => ({
					otherInfo: info,
					destPath: info.replace('[download] ', '').replace(' has already been downloaded', '').replace('\n', ''),
				}))
			} else if (info.includes('idk')) {
				/* empty */
			} else if (info.includes('Downloading video thumbnail')) {
				console.log('*otherinfo:', info);
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
			console.log('*process close:', code);
			// this.setState((state, props) => ({
			// 	// infos: state.infos.concat('[Download Stopped]'),
			// 	process: null,
			// }))
			this.props.handleStop()
			/**
			 * seems that 0 === finished
			 * null === kill()
			 * 1 === error
			 * 
			 * if i use takkkill,force kill will be 1 not null
			 */
			switch (code) {
				case 0:
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
						this.setState((state, props) => ({
							status: "error",
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
				otherInfo: 'Cancelled',
			}))
		})
	}

	handleOpenFolder = () => {
		const destPath = this.state.destPath
		if (destPath) {
			// spawn('start', ['""', '"' + path.dirname(destPath) + '"'], { shell: true, })
			// spawn('explorer', ['/select,', '"' + destPath + '"'], { shell: true, })
			if (this.state.status === 'downloading') {
				console.log('*openPath:', destPath);
				shell.openPath(path.dirname(destPath))
			} else {
				console.log('*showItemInFolder:', destPath);
				shell.showItemInFolder(destPath)
				// shell.openPath(path.dirname(destPath))
			}
		}
	}
	render() {
		'"downloading-%(progress._percent_str)s-%(progress._total_bytes_str)s-%(progress._speed_str)s-%(progress._eta_str)s"'
		interface info {
			status: string,
			processingOutput?: string[],
			other?: string,
			error?: string,
			thumbnail?: string,
			percent?: string,
			size?: string,
			speed?: string,
			eta?: string,
			title?: string,
			percentValue?: number,
			destPath?: string,

		}
		const info: info = {
			status: this.state.status,

			processingOutput: this.state.processingOutput,
			other: this.state.otherInfo?.trim(),
			error: this.state.errorInfo?.trim(),
			thumbnail: this.state.thumbnailInfo?.trim(),
			title: this.props.url,
			destPath: this.state.destPath,
		}
		if (info.processingOutput) {
			info.percent = info.processingOutput[1]?.trim()
			info.size = info.processingOutput[2]?.trim()
			info.speed = info.processingOutput[3]?.trim()
			info.eta = info.processingOutput[4]?.trim()
			info.title = info.processingOutput[5]?.trim()
			info.percentValue = parseFloat(info.percent)
		}
		if (info.percentValue && info.percentValue < 100) {
			info.other = 'Downloading...'
		}
		if (info.status === 'error' && info.other) {
			info.other = 'Failed'
		}

		const taskHistory = {
			timestamp: this.props.timestamp,
			url: this.props.url,
			status: info.status === 'downloading' ? 'stopped' : info.status,
			processingOutput: info.processingOutput,
			destPath: info.destPath,
		}
		const taskHistories = store.get('taskHistories')
		const historyIndex = taskHistories.findIndex((taskHistory: taskHistory) => taskHistory.timestamp === this.props.timestamp)
		if (historyIndex !== -1) {
			taskHistories.splice(
				historyIndex,
				1,
			)
		}
		store.set('taskHistories', [
			...taskHistories,
			taskHistory,
		])

		const progressBar =
			// <div className="progress">
			// 	<div
			// 		className="progress-bar"
			// 		style={ {
			// 			width: info.percentValue + '%',
			// 		} }
			// 	/>
			// </div>
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
			{ !!info.thumbnail && svgPhoto }
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
			info.processingOutput &&
			<div className="midcol">
				{ infoDiv(info.percent, 'infoPercent') }
				{ infoDiv(info.size, 'infoSize') }
				{ infoDiv(info.speed, 'infoSpeed') }
				{ infoDiv(info.eta, 'infoEta') }
			</div>
		const rightCol =
			<div className="rightcol" onDoubleClick={ this.handleOpenFolder }>
				{ infoDiv(info.title, 'infoTitle', svgRight) }
				{ ((info.percentValue && !isNaN(info.percentValue)) || isDebug) && progressBar }
				{ !!info.other &&
					<div className="infoOther">
						{ svgInfo }
						<span>{ info.other }</span>
					</div>
				}
				{ !!info.error &&
					<div className="infoError">
						{ svgDanger }
						<span> { info.error }</span>
					</div>
				}
			</div>

		const rightMostCol =
			<div className="rightMostCol" onClick={ info.status === 'downloading' ? this.handleStop : () => this.props.handleRemove() }>
				{ info.status === 'downloading' ? svgClose() : svgRemove }
			</div>

		return (
			<div className="task">
				{ leftCol }
				{ midCol }
				{ rightCol }
				{ rightMostCol }
			</div>
		);
	}
}
