import React from 'react';
// import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.scss'
import { spawn, ChildProcess, spawnSync } from 'child_process'
import { decode } from 'iconv-lite';
import { ipcRenderer, clipboard, shell } from 'electron';
import ElectronStore from 'electron-store';
import { IconContext } from 'react-icons'
import { MdOutlineKeyboardArrowUp, MdOutlineKeyboardArrowDown, MdOutlineRemove, MdOutlineCheck, MdClose, MdPlayArrow, MdOutlineInsertPhoto, MdInfo } from 'react-icons/md'
import { BsArrowRightCircle, BsFillExclamationTriangleFill, BsFillArrowRightCircleFill } from 'react-icons/bs'
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
console.log('*yt-dlp bin path:', path.join(__dirname, '..', '..', 'app.asar.unpacked', 'build', 'yt-dlp.exe'));
// console.log(main.app.getPath('exe'));
type KeyofType<OBJ, TYPE> = {
	[key in keyof OBJ]: OBJ[key] extends TYPE ? key : never
}[keyof OBJ]
const svgLoaderHash = <HashLoader size={ 10 } color="white" />
const svgLoaderGrid = <GridLoader size={ 4 } color="white" margin={ 1 } />
const svgLoaderPuff = <PuffLoader size={ 10 } color="white" speedMultiplier={ 0.5 } />


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

const store = new ElectronStore({
	defaults: {
		specifyDownloadPath: true,
		useProxy: false,
		formatFilename: true,
		saveThumbnail: true,
		saveSubtitles: false,
		useCookie: true,
		useHistory: false,
		saveAutoSubtitle: false,
		saveAllSubtitles: false,
		useLocalYtdlp: false,
		contentSelector: 'video',

		proxyHost: 'http://127.0.0.1:1080',
		cookieFile: 'cookiejar.txt',
		historyFile: 'history.txt',
		fileNameTemplate: '[%(upload_date)s]%(title)s-%(id)s.%(ext)s',

		destPath: main.app.getPath('downloads'),
		tempPath: path.join(main.app.getPath('downloads'), 'temp'),
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
			process: ChildProcess,
			url: string,
		}[],
		closedCount: number,


		specifyDownloadPath: boolean,
		useProxy: boolean,
		formatFilename: boolean,
		saveThumbnail: boolean,
		saveSubtitles: boolean,
		useCookie: boolean,
		useHistory: boolean,
		saveAutoSubtitle: boolean,
		saveAllSubtitles: boolean,
		useLocalYtdlp: boolean,

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
			processes: [],
			maximized: false,
			closedCount: 0,

			specifyDownloadPath: store.get('specifyDownloadPath'),
			useProxy: store.get('useProxy'),
			formatFilename: store.get('formatFilename'),
			saveThumbnail: store.get('saveThumbnail'),
			saveSubtitles: store.get('saveSubtitles'),
			useCookie: store.get('useCookie'),
			useHistory: store.get('useHistory'),
			saveAutoSubtitle: store.get('saveAutoSubtitle'),
			saveAllSubtitles: store.get('saveAllSubtitles'),
			useLocalYtdlp: store.get('useLocalYtdlp'),
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
		ytdlpOptions.push('-r', '5K') //調試用降速
		// ytdlpOptions.push('--geo-verification-proxy', 'http://127.0.0.1:7890') //沒用啊...
		// ytdlpOptions.push('--print', '%(title)s', '--no-simulate') 


		this.state.specifyDownloadPath && ytdlpOptions.push('-P', this.state.destPath) //如果不加home:或temp:就是下載在一塊兒(以前就是這樣的)
		this.state.useProxy && ytdlpOptions.push('--proxy', this.state.proxyHost,)
		this.state.formatFilename && ytdlpOptions.push('-o', this.state.fileNameTemplate,)
		this.state.saveThumbnail && ytdlpOptions.push('--write-thumbnail',)
		this.state.saveSubtitles && ytdlpOptions.push('--write-subs',)
		this.state.useCookie && ytdlpOptions.push('--cookies', this.state.cookieFile)
		this.state.useHistory && ytdlpOptions.push('--download-archive', this.state.historyFile)
		this.state.contentSelector === 'skip' && ytdlpOptions.push('--skip-download')
		this.state.contentSelector === 'audio' && ytdlpOptions.push('--format', 'bestaudio/best')
		this.state.saveAutoSubtitle && ytdlpOptions.push('--write-auto-subs')
		// this.state.saveAllSubtitles && ytdlpOptions.push('')

		ytdlpOptions.push(url)
		const ytdlpCommand = this.state.useLocalYtdlp ?
			/**
			 * 使用py要比用standalone快得多
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
		}

		this.setState((state, props) => ({
			maximized: !state.maximized
		}))
	}
	handleClick = (e: React.MouseEvent) => {
		const target = e.currentTarget
		const id = target.id
		if (id === 'destPath' && this.state.specifyDownloadPath) {
			console.log('*open dir:', this.state.destPath);
			spawn('start', ['""', `"${this.state.destPath}"`], { shell: true })
		} else if (id === 'destPath' && !this.state.specifyDownloadPath) {
			const cwd = remote.process.cwd()
			console.log('*open dir:', cwd);
			spawn('start', ['""', `"${cwd}"`], { shell: true })
		} else if (id === 'historyFile') {
			// const appPath = main.app.getAppPath()
			const historyFile = this.state.historyFile
			console.log('*open historyFile:', historyFile);
			spawn('start', ['""', `"${historyFile}"`], { shell: true })
		} else if (id === 'cookieFile') {
			// const appPath = main.app.getAppPath()
			const cookieFile = this.state.cookieFile
			console.log('*open cookieFile:', cookieFile);
			spawn('start', ['""', `"${cookieFile}"`], { shell: true })
		}
	}
	render() {


		const trafficLight =
			<div className="btn-group overlay">
				<button
					tabIndex={ -1 } className='btn btn-outline-secondary' id='minimize'
					onClick={ () => { win.minimize() } }
				>
					<svg
						xmlns="http://www.w3.org/2000/svg" width="15" height="1em" fill="currentColor"
						className="bi bi-dash-lg" viewBox="0 0 16 16"
					>
						<path fillRule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z" />
					</svg>
				</button>
				{
					this.state.maximized
						?
						<button tabIndex={ -1 } className='btn btn-outline-secondary' id='unmaximize'
							onClick={ this.handleMax }
						>
							<svg
								xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
								className="bi bi-layers" viewBox="0 0 16 16"
							>
								<path d="M8.235 1.559a.5.5 0 0 0-.47 0l-7.5 4a.5.5 0 0 0 0 .882L3.188 8 .264 9.559a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882L12.813 8l2.922-1.559a.5.5 0 0 0 0-.882l-7.5-4zm3.515 7.008L14.438 10 8 13.433 1.562 10 4.25 8.567l3.515 1.874a.5.5 0 0 0 .47 0l3.515-1.874zM8 9.433 1.562 6 8 2.567 14.438 6 8 9.433z" />
							</svg>
						</button>
						:
						<button tabIndex={ -1 } className='btn btn-outline-secondary' id='maximize'
							onClick={ this.handleMax }
						>
							<svg
								xmlns="http://www.w3.org/2000/svg" width="16" height="12px" fill="currentColor"
								className="bi bi-square" viewBox="0 0 16 16"
							>
								<path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
							</svg>
						</button>

				}
				<button
					tabIndex={ -1 } className='btn rounded-0 btn-outline-secondary' id='close'
					onClick={ () => { win.close() } }
				>
					<svg
						xmlns="http://www.w3.org/2000/svg" width="16" height="1em" fill="currentColor"
						className="bi bi-x-lg" viewBox="0 0 16 16"
					>
						<path fillRule="evenodd" d="M13.854 2.146a.5.5 0 0 1 0 .708l-11 11a.5.5 0 0 1-.708-.708l11-11a.5.5 0 0 1 .708 0Z" />
						<path fillRule="evenodd" d="M2.146 2.146a.5.5 0 0 0 0 .708l11 11a.5.5 0 0 0 .708-.708l-11-11a.5.5 0 0 0-.708 0Z" />
					</svg>
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
			<div className="input-group urlBar">
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
				<button className='btnStart' tabIndex={ -1 } onClick={ this.startDownload }>Start</button>
				<button className='btnPaste' tabIndex={ -1 } onClick={ () => this.pasteUrl() }>Paste</button>

			</div>
		/**
		 * 太太太太太忍者了ござる!!!
		 * 把obj裡的key連起來變成union,但是只會連指定類型的「key對應的type」
		 */
		// type A = {
		// 	[key in keyof App['state']]: App['state'][key] extends boolean ? key : never
		// }[keyof App['state']]
		const option = (id: KeyofType<App['state'], boolean>, name?: string) => {
			if (!name) {
				name = id.replace(/([A-Z])/g, ' $1')
				name = name[0].toUpperCase() + name.slice(1)
			}
			return (
				<div className="col-12 col-sm-6 col-xl-4">
					<div className="input-group input-group-sm option">
						<input checked={ this.state[id] } onChange={ this.handleInputChange } className='btn-check' type="checkbox" id={ id } tabIndex={ -1 } />
						<label className='btn btn-outline-primary check-container' htmlFor={ id }>{ svgSuccess }</label>

						<input tabIndex={ -1 } type="text" value={ name } className="form-control form-control-sm text-primary" disabled readOnly />
					</div>

				</div>
			)
		}
		const optionWithInput = (id: KeyofType<App['state'], boolean>, textInput: KeyofType<App['state'], string>, name?: string, placeholder?: string) => {
			if (!name) {
				name = id.replace(/([A-Z])/g, ' $1')
				name = name[0].toUpperCase() + name.slice(1)
			}
			if (!placeholder) {
				placeholder = textInput.replace(/([A-Z])/g, ' $1')
				placeholder = placeholder[0].toUpperCase() + placeholder.slice(1)
			}
			/**
			 * TO\DO: make options functionable
			 * TO\DO:make options beautiful
			 */
			return (
				<div className=" col-12 col-sm-6 col-xl-4">
					<div className="input-group input-group-sm option">
						<input checked={ this.state[id] } onChange={ this.handleInputChange } className='btn-check' type="checkbox" id={ id } tabIndex={ -1 } />
						<label className='btn btn-outline-primary check-container' htmlFor={ id }>{ svgSuccess }</label>

						<button
							id={ textInput }
							type='button'
							className="btn btn-outline-primary bg-transparent"
							/* htmlFor={ id } */
							onClick={ this.handleClick }
							tabIndex={ -1 }
						>{ name }</button>

						<input tabIndex={ -1 } type="text" className="form-control form-control-sm" value={ this.state[textInput] } onChange={ this.handleInputChange } id={ textInput } placeholder={ placeholder } />
					</div>
				</div>
			)
		}
		const contentSelectorOption = (id: 'video' | 'audio' | 'skip') => {
			return <>
				<input checked={ this.state.contentSelector === id } onChange={ this.handleRadio } className='btn-check' type="radio" id={ id } name="contentSelector" value={ id } tabIndex={ -1 } />
				<label className='btn btn-outline-primary' htmlFor={ id }>{ id.toUpperCase() }</label>
			</>
		}
		const bonusSelectorOption = (id: KeyofType<App['state'], boolean>, name?: string) => {
			if (!name) {
				name = id.replace(/([A-Z])/g, ' $1')
				name = name[0].toUpperCase() + name.slice(1)
			}
			return <>
				<input checked={ this.state[id] } onChange={ this.handleInputChange } className='btn-check' type="checkbox" id={ id } tabIndex={ -1 } />
				<label className='btn btn-outline-primary' htmlFor={ id }>{ name }</label>
			</>
		}
		const contentSelector =
			<div className="contentSelector">
				<div className='btn-group btn-group-sm'>
					{ contentSelectorOption('video') }
					{ contentSelectorOption('audio') }
					{ contentSelectorOption('skip') }
				</div>
			</div>
		const bonusSelector =
			<div className="bonusSelector">
				<div className='btn-group btn-group-sm'>
					{ bonusSelectorOption('saveThumbnail', 'Thumbnail') }
					{ bonusSelectorOption('saveSubtitles', 'Subtitle') }
					{ bonusSelectorOption('saveAutoSubtitle', 'Auto Subtitle') }
				</div>
			</div>

		const options =
			<div className="control-area container">
				<div className="button-option">
					{ contentSelector }
					{ bonusSelector }
				</div>
				<div className="row">
					{ optionWithInput('specifyDownloadPath', 'destPath', 'Dir',) }
					{ optionWithInput('useProxy', 'proxyHost',) }
					{ optionWithInput('useCookie', 'cookieFile',) }
					{ optionWithInput('useHistory', 'historyFile',) }
					{ optionWithInput('formatFilename', 'fileNameTemplate') }
					{/* { option('saveThumbnail',) } */ }
					{/* { option('saveSubtitles',) } */ }
					{/* { option('notDownloadVideo',) }
					{ option('onlyDownloadAudio',) } */}
					{/* { option('saveAutoSubtitle',) } */ }
					{ option('useLocalYtdlp',) }
					{/* { option('saveAllSubtitles',) } */ }
				</div>
			</div>

		const display =
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
						{ display }
						{ options }
					</div>
				</div>
			</>
		);
	}
}

class Task extends React.Component<
	{
		timestamp: number,
		process: ChildProcess,
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
	child: ChildProcess
	constructor(props: Task['props']) {
		super(props);
		this.state = {
			// processingOutput: [],
			// thumbnailInfo: '',
			// destPath: '',
			// otherInfo: '',
			// errorInfo: '',

			status: 'downloading',
		}

		this.child = this.props.process
		this.child.stdout?.on('data', (data: Buffer) => {
			const info = decode(data, 'gbk')
			if (info.includes('[download] Destination')) {
				console.log('*downloadingInfo:', info);
				this.setState((state, props) => ({
					otherInfo: info,
					destPath: info.replace('[download] Destination: ', '').trim(),
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
					destPath: info.replace('[download] ', '').replace(' has already been downloaded', ''),
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
		this.child.stderr?.on('data', (data) => {
			let info = decode(data, 'gbk')
			console.log('*stderr:', info);
			if (info.includes('is not a valid URL') || info.includes('You must provide at least one URL')) {
				info = 'Please input a vaild url'
			}
			this.setState((state, props) => ({
				errorInfo: info
			}))
		})

		this.child.on('close', (code) => {
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
		const kill = spawn('taskkill', ['/pid', this.child.pid?.toString() ?? '', '/f', '/t',])
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
				shell.openPath(path.dirname(destPath))
			} else {
				shell.showItemInFolder(destPath)
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

		}
		const info: info = {
			status: this.state.status,

			processingOutput: this.state.processingOutput,
			other: this.state.otherInfo?.trim(),
			error: this.state.errorInfo?.trim(),
			thumbnail: this.state.thumbnailInfo?.trim(),
			title: this.props.url
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


		const progressBar =
			<div className="progress">
				<div
					className="progress-bar"
					style={ {
						width: info.percentValue + '%',
					} }
				/>
			</div>
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
