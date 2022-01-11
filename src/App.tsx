import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.scss'
import { spawn, ChildProcess } from 'child_process'
import { decode } from 'iconv-lite';
import { ipcRenderer, clipboard } from 'electron';
import ElectronStore from 'electron-store';
import path from 'path';
import * as remote from '@electron/remote'
const win = remote.getCurrentWindow()
const main = {
	console: remote.require('console'),
	app: remote.app,
}
console.log('*ty-dlp bin path:',path.join(__dirname, '..', '..', 'app.asar.unpacked', 'build', 'yt-dlp.exe'));
type KeyofType<OBJ, TYPE> = {
	[key in keyof OBJ]: OBJ[key] extends TYPE ? key : never
}[keyof OBJ]

const svgInfo =
	<svg xmlns="http://www.w3.org/2000/svg" className="bi bi-info-circle-fill flex-shrink-0 me-3" fill="currentColor" viewBox="0 0 16 16">
		<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
	</svg>
const svgError =
	<svg xmlns="http://www.w3.org/2000/svg" className="bi bi-exclamation-triangle-fill flex-shrink-0 me-3" fill="currentColor" viewBox="0 0 16 16">
		<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
	</svg>
const svgContinue =
	<svg xmlns="http://www.w3.org/2000/svg" className="bi bi-arrow-right-circle-fill flex-shrink-0 me-3" fill="currentColor" viewBox="0 0 16 16">
		<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z" />
	</svg>
const svgSuccess =
	<svg xmlns="http://www.w3.org/2000/svg" className="bi flex-shrink-0 me-3" fill="currentColor" viewBox="0 0 16 16">
		<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
	</svg>

const store = new ElectronStore({
	defaults: {
		specifyDownloadPath: true,
		useProxy: false,
		formatFilename: true,
		saveThumbnail: true,
		saveSubtitles: false,
		useCookie: true,
		useHistory: false,
		notDownloadVideo: false,
		onlyDownloadAudio: false,
		saveAutoSubtitle: false,
		saveAllSubtitles: false,
		useLocalYtdlp: false,

		proxyHost: 'http://127.0.0.1:1080',
		cookieFile: 'cookiejar.txt',
		historyFile: 'history.txt',

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
		}[],
		closedCount: number,


		specifyDownloadPath: boolean,
		useProxy: boolean,
		formatFilename: boolean,
		saveThumbnail: boolean,
		saveSubtitles: boolean,
		useCookie: boolean,
		useHistory: boolean,
		notDownloadVideo: boolean,
		onlyDownloadAudio: boolean,
		saveAutoSubtitle: boolean,
		saveAllSubtitles: boolean,
		useLocalYtdlp: boolean,

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
			notDownloadVideo: store.get('notDownloadVideo'),
			onlyDownloadAudio: store.get('onlyDownloadAudio'),
			saveAutoSubtitle: store.get('saveAutoSubtitle'),
			saveAllSubtitles: store.get('saveAllSubtitles'),
			useLocalYtdlp: store.get('useLocalYtdlp'),

			proxyHost: store.get('proxyHost'),
			cookieFile: store.get('cookieFile'),
			historyFile: store.get('historyFile'),
			destPath: store.get('destPath'),
			tempPath: store.get('tempPath'),
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
		// ytdlpOptions.push('--print', '%(title)s', '--no-simulate') 


		this.state.specifyDownloadPath && ytdlpOptions.push('-P', this.state.destPath) //如果不加home:或temp:就是下載在一塊兒(以前就是這樣的)
		this.state.useProxy && ytdlpOptions.push('--proxy', this.state.proxyHost,)
		this.state.formatFilename && ytdlpOptions.push('-o', '[%(upload_date)s]%(title)s-%(id)s.%(ext)s',)
		this.state.saveThumbnail && ytdlpOptions.push('--write-thumbnail',)
		this.state.saveSubtitles && ytdlpOptions.push('--write-subs',)
		this.state.useCookie && ytdlpOptions.push('--cookies', this.state.cookieFile)
		this.state.useHistory && ytdlpOptions.push('--download-archive', this.state.historyFile)
		this.state.notDownloadVideo && ytdlpOptions.push('--skip-download')
		this.state.onlyDownloadAudio && ytdlpOptions.push('--format', 'bestaudio/best')
		this.state.saveAutoSubtitle && ytdlpOptions.push('--write-auto-subs')
		// this.state.saveAllSubtitles && ytdlpOptions.push('')

		ytdlpOptions.push(url)
		const ytdlpCommand = this.state.useLocalYtdlp ?
			'yt-dlp'
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
		)
		this.setState((state, props) => ({
			processes: state.processes.concat({
				timestamp: Date.now(),
				process: child,
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

		const urlBar =
			<div className="input-group url-area">
				<input
					autoFocus
					onKeyPress={ (e) => {
						e.key === 'Enter' /* && !this.state.process */ && this.startDownload()
					} }
					className='input-url form-control'
					placeholder='Input a videopage url'
					type='text'
					id='url'
					value={ this.state.url }
					onChange={ this.handleInputChange }
				/>
				{
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
					<div className='loading'>
						<div className="spinner-border spinner-border-sm text-info" />
					</div>
				}
				{
					/**
					 * 單個模式下要Stop好像有點麻煩
					 */
					<button className='btn btn-primary' tabIndex={ -1 } onClick={ this.startDownload }>Start</button>
				}

				<button className='btn btn-secondary' tabIndex={ -1 } onClick={ () => this.pasteUrl() }>Paste</button>

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
				<div className="form-check form-switch col-12 col-sm-6  col-xl-4">
					<input tabIndex={ -1 } className="form-check-input" type="checkbox" role="switch" id={ id } checked={ this.state[id] } onChange={ this.handleInputChange } />
					<label className="form-check-label" htmlFor={ id }>{ name }</label>
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
			 * TODO: make options beautiful and functionable
			 */
			return (
				<div className="form-check form-switch col-12 col-sm-6  col-xl-4">
					<input tabIndex={ -1 } className="form-check-input" type="checkbox" role="switch" id={ id } checked={ this.state[id] } onChange={ this.handleInputChange } />
					<div className="input-group input-group-sm">
						<label
							id={ textInput }
							className="form-check-label input-group-text bg-transparent"
							/* htmlFor={ id } */
							onClick={ this.handleClick }
						>{ name }</label>
						<input tabIndex={ -1 } type="text" className="form-control form-control-sm" value={ this.state[textInput] } onChange={ this.handleInputChange } id={ textInput } placeholder={ placeholder } />
					</div>
				</div>
			)
		}
		const options =
			<div className="control-area container">
				<div className="row">
					{ optionWithInput('specifyDownloadPath', 'destPath', 'Dir',) }
					{ optionWithInput('useProxy', 'proxyHost',) }
					{ option('formatFilename',) }
					{ option('saveThumbnail',) }
					{ option('saveSubtitles',) }
					{ optionWithInput('useCookie', 'cookieFile',) }
					{ optionWithInput('useHistory', 'historyFile',) }
					{ option('notDownloadVideo',) }
					{ option('onlyDownloadAudio',) }
					{ option('saveAutoSubtitle',) }
					{ option('useLocalYtdlp',) }
					{/* { option('saveAllSubtitles',) } */ }
				</div>
			</div>

		const display =
			<div className="display-area">
				{
					this.state.processes.map(({ timestamp, process }) => {
						return (
							<Task
								timestamp={ timestamp }
								process={ process }
								key={ timestamp }
								handleStop={ (timestamp) => this.handleStop(timestamp) }
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
		handleStop: (timestamp: number) => void
	},
	{
		processInfo: string[],
		thumbnailInfo: string,
		downloadingInfo: string,
		otherInfo: string,
		errorInfo: string,

		status: "finished" | "stopped" | "downloading" | "error",

	}
> {
	child: ChildProcess
	constructor(props: Task['props']) {
		super(props);
		this.state = {
			processInfo: [],
			thumbnailInfo: '',
			downloadingInfo: '',
			otherInfo: '',
			errorInfo: '',

			status: 'downloading',
		}

		this.child = this.props.process
		this.child.stdout?.on('data', (data: Buffer) => {
			const info = decode(data, 'gbk')
			if (info.includes('[download] Destination')) {
				console.log('*downloadingInfo:', info);
				this.setState((state, props) => ({
					downloadingInfo: info,
				}))
			} else if (info.includes('[download process]')) {
				const processInfo = info.replace(/(\r)|(')|(")/g, '').split('|').map((str) => str.trim())
				console.log('*processinfo:', info);
				this.setState((state, props) => ({
					processInfo: processInfo,
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

			} else if (info.includes('idk')) {
				/* empty */
			} else if (info.includes('Downloading video thumbnail')) {
				console.log('*otherinfo:', info);
			} else {
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
			this.props.handleStop(this.props.timestamp)
			/**
			 * seems that 0 === finished
			 * null === kill()
			 * 1 === error
			 */
			switch (code) {
				case 0:
					this.setState((state, props) => ({
						status: "finished"
					}))
					break;
				case 1:
					this.setState((state, props) => ({
						status: "error"
					}))
					break;
				case null:
					this.setState((state, props) => ({
						status: "stopped"
					}))
					break;

				default:
					break;
			}
		})

	}
	handleStop = () => {
		this.child.kill()
	}
	render() {
		'"downloading-%(progress._percent_str)s-%(progress._total_bytes_str)s-%(progress._speed_str)s-%(progress._eta_str)s"'
		const processInfo = this.state.processInfo
		const otherInfo = this.state.otherInfo
		const errorInfo = this.state.errorInfo
		const thumbnailInfo = this.state.thumbnailInfo

		const percent = parseFloat(processInfo[1])
		/**
		 * TODO: progress bar
		 */

		let status = <div className="click-stop" onClick={ this.handleStop }>Downloading</div>
		switch (this.state.status) {
			case 'stopped':
				status = <div className="info-stopped">{ /* svgError */ } <span>Stopped</span> </div>
				break;
			case 'finished':
				status = <div className="info-finished">{ /* svgSuccess */ } <span>Finished</span> </div>
				break;
			case 'error':
				status = <div className="info-erroroccured">{ /* svgError */ } <span>Error</span> </div>
				break;

			default:
				break;
		}
		const task =
			<div className="multimode-task">
				<div className="upperrow">
					{ !!thumbnailInfo && <div className="info-thumbnail">{ svgSuccess } <span>Thumbnail</span> </div> }
					{ !!otherInfo && <div className="info-other">{ svgInfo } <span>{ otherInfo }</span> </div> }
					{ !!errorInfo && <div className="info-error">{ svgError } <span> { errorInfo }</span></div> }
					{ status }
				</div>

				{ processInfo.length > 0 &&
					<div className="lowerrow">
						{ !!processInfo[1] && processInfo[1] !== 'NA' && processInfo[1] !== 'Unknown' && <div className="info-percent"><span>{ processInfo[1] }</span></div> }
						{ !!processInfo[3] && processInfo[3] !== 'NA' && processInfo[3] !== 'Unknown' && <div className="info-speed"><span>{ processInfo[3] }</span></div> }
						{ !!processInfo[2] && processInfo[2] !== 'NA' && processInfo[2] !== 'Unknown' && <div className="info-size"><span>{ processInfo[2] }</span></div> }
						{ !!processInfo[4] && processInfo[4] !== 'NA' && processInfo[4] !== 'Unknown' && <div className="info-eta"><span>{ processInfo[4] }</span></div> }
						{ !!processInfo[5] && processInfo[5] !== 'NA' && processInfo[5] !== 'Unknown' && <div className="info-title">{ svgContinue } <span> { processInfo[5] }</span></div> }
					</div>
				}
			</div>
		return (
			task
		);
	}
}
