import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.scss'
import { spawn, ChildProcess } from 'child_process'
import { decode } from 'iconv-lite';
import { ipcRenderer, clipboard } from 'electron';
import ElectronStore from 'electron-store';
import path from 'path';

const store = new ElectronStore({
	defaults: {
		specifyDownloadPath: true,
		useProxy: true,
		formatFilename: true,
		saveThumbnail: true,
		saveSubtitles: false,
		useCookie: true,
		useHistory: false,
		notDownloadVideo: false,
		onlyDownloadAudio: false,
		saveAutoSubtitle: false,
		saveAllSubtitles: false,

		proxyHost: 'http://127.0.0.1:1081',
		cookieFile: 'cookiejar.txt',
		historyFile: 'history.txt',

		destPath: 'D:\\Downloads\\CRTubeGet Downloaded\\youtube-dl',
		tempPath: 'D:\\Downloads\\CRTubeGet Downloaded\\youtube-dl\\temp',
	}
})

export default class App extends React.Component<
	{},
	{
		url: string,
		processInfo: string[],
		thumbnailInfo: string,
		downloadingInfo: string,
		titleInfo: string,
		otherInfo: string,
		errorInfo: string,
		process: ChildProcess | null,
		maximized: boolean,

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
			processInfo: [],
			thumbnailInfo: '',
			downloadingInfo: '',
			titleInfo: '',
			otherInfo: '',
			errorInfo: '',
			process: null,
			maximized: false,

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

			proxyHost: store.get('proxyHost'),
			cookieFile: store.get('cookieFile'),
			historyFile: store.get('historyFile'),

			destPath: store.get('destPath'),
			tempPath: store.get('tempPath'),
			// specifyDownloadPath: true,
			// useProxy: true,
			// formatFilename: true,
			// saveThumbnail: true,
			// saveSubtitles: false,
			// useCookie: true,
			// useHistory: false,
			// notDownloadVideo: false,
			// onlyDownloadAudio: false,
			// saveAutoSubtitle: false,
			// saveAllSubtitles: false,

			// proxyHost: 'http://127.0.0.1:1081',
			// cookieFile: 'cookiejar.txt',
			// historyFile: 'history.txt',

			// destPath: 'D:\\Downloads\\CRTubeGet Downloaded\\youtube-dl',
			// tempPath: 'D:\\Downloads\\CRTubeGet Downloaded\\youtube-dl\\temp',
		}
		ipcRenderer.on('moved-unmaximize', () => {
			this.setState((state, props) => ({
				maximized: false,
			}))
		})
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
		this.setState((state, props) => ({
			thumbnailInfo: '',
			downloadingInfo: '',
			otherInfo: '',
			processInfo: [],
			errorInfo: '',
		}), () => {


			console.log('*start download');
			let url = this.state.url
			if (url === '') {
				url = clipboard.readText()
				console.log('*url:', url);
				this.setState((state, props) => ({
					url: url,
				}))
			}
			let ytdlpOptions: string[] = [];
			ytdlpOptions.push('--progress-template', '"[download process]|%(progress._percent_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(info.title)s|"',)
			// ytdlpOptions.push('-P', 'temp:'+this.state.tempPath)
			// ytdlpOptions.push('-r', '50K') //調試用降速
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



			// console.log(__dirname,'yt-dlp.exe');
			const child = spawn(
				/**
				 * 太奇怪了,用yt-dlp.exe直接沒法停止...為什麼會這樣...?
				 * 但是用yt-dlp_min.exe好像就正常
				 */
				// path.join(__dirname,'yt-dlp.exe'),
				'yt-dlp',
				ytdlpOptions,
			)
			this.setState({
				process: child,
			})
			child.stdout.on('data', (data: Buffer) => {
				let info = decode(data, 'gbk')
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
						titleInfo: processInfo[5],
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
				} else if (info.includes('Downloading video thumbnail')) {
					console.log('*otherinfo:', info);
				} else {
					this.setState((state, props) => ({
						otherInfo: info
					}))
				}
			})
			child.stderr.on('data', (data) => {
				let info = decode(data, 'gbk')
				console.log('*stderr:', info);
				if (info.includes('is not a valid URL') || info.includes('You must provide at least one URL')) {
					info = 'Please input a vaild url'
				}
				this.setState((state, props) => ({
					errorInfo: info
				}))
			})

			child.on('close', (code) => {
				console.log('*process close:', code);
				this.setState((state, props) => ({
					// infos: state.infos.concat('[Download Stopped]'),
					process: null,
				}))
			})
		})

	}
	stopDownload = () => {
		const success = this.state.process?.kill()
		if (success) {
			this.setState({
				process: null,
			})
		}
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
	handleClick = (e: React.MouseEvent) => {
		const target = e.currentTarget
		const id = target.id
		ipcRenderer.invoke(id)
	}
	handleMax = (e: React.MouseEvent) => {
		const target = e.currentTarget
		const id = target.id
		ipcRenderer.invoke(id)
		this.setState((state, props) => ({
			maximized: !state.maximized
		}))
	}
	render() {
		'"downloading-%(progress._percent_str)s-%(progress._total_bytes_str)s-%(progress._speed_str)s-%(progress._eta_str)s"'
		const processInfo = this.state.processInfo
		const otherInfo = this.state.otherInfo
		const errorInfo = this.state.errorInfo
		const titleInfo = this.state.titleInfo

		const percent = parseFloat(processInfo[1])
		// const infomation = () =>
		// 	<div className="thumbnail">
		// 		<div className="text-success d-flex align-items-center" role="alert">
		// 			<svg xmlns="http://www.w3.org/2000/svg" className="bi flex-shrink-0 me-3" width="14" height="14" role="img" fill="currentColor" viewBox="0 0 16 16">
		// 				<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
		// 			</svg>
		// 			<div>
		// 				Thumbnail Downloaded
		// 			</div>
		// 		</div>
		// 	</div>
		const speed =
			processInfo.length > 0
				?
				<ul className="btn-group btn-group-sm">
					<li className="btn btn-outline-primary">{ processInfo[1] }</li>
					<li className="btn btn-outline-primary">{ processInfo[2] }</li>
					{
						processInfo[3] !== 'NA' &&
						<li className="btn btn-outline-primary">{ processInfo[3] }</li>
					}
					{
						processInfo[4] !== 'NA' &&
						<li className="btn btn-outline-primary">{ processInfo[4] }</li>
					}
				</ul>
				:
				<>
					<br />
					<br />
				</>

		const thumbnail =
			this.state.thumbnailInfo /* || 1 */
				?
				<div className="thumbnail">
					<div className="text-success d-flex align-items-center" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" className="bi flex-shrink-0 me-3" width="14" height="14" role="img" fill="currentColor" viewBox="0 0 16 16">
							<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
						</svg>
						<div>
							Thumbnail Downloaded
						</div>
					</div>
				</div>
				:
				<br />
		// console.log('this.state.downloadingInfo:',this.state.downloadingInfo);
		const downloading =
			percent === 100
				?
				<div className="downloading">
					<div className="text-success d-flex align-items-center" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-check-circle-fill flex-shrink-0 me-3" viewBox="0 0 16 16">
							<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
						</svg>
						<div>
							Downloading Finished: { titleInfo }
						</div>
					</div>
				</div>
				:
				this.state.downloadingInfo /* || 1 */
					?
					<div className="downloading">
						<div className="text-primary d-flex align-items-center" role="alert">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-arrow-right-circle-fill flex-shrink-0 me-3" viewBox="0 0 16 16">
								<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z" />
							</svg>
							<div>
								Content Downloading: { titleInfo }
							</div>
						</div>
					</div>
					:
					<br />
		const notice =
			otherInfo/*  || 1 */
				?
				<div className="downloading">
					<div className="text-primary d-flex align-items-center" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-info-circle-fill flex-shrink-0 me-3" viewBox="0 0 16 16">
							<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
						</svg>
						<div>
							{ otherInfo }
						</div>
					</div>
				</div>
				:
				<br />
		const error =
			errorInfo/*  || 1 */
				?
				<div className="downloading">
					<div className="text-danger d-flex align-items-center" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-exclamation-triangle-fill flex-shrink-0 me-3" viewBox="0 0 16 16">
							<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
						</svg>
						<div>
							{ errorInfo }
						</div>
					</div>
				</div>
				:
				<br />


		const trafficLight =
			<div className="btn-group overlay">
				<button tabIndex={ -1 } className='btn btn-outline-secondary' id='minimize' onClick={ this.handleClick }>
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="1em" fill="currentColor" className="bi bi-dash-lg" viewBox="0 0 16 16">
						<path fillRule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z" />
					</svg>
				</button>
				{
					this.state.maximized
						?
						<button tabIndex={ -1 } className='btn btn-outline-secondary' id='unmaximize' onClick={ this.handleMax }>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-layers" viewBox="0 0 16 16">
								<path d="M8.235 1.559a.5.5 0 0 0-.47 0l-7.5 4a.5.5 0 0 0 0 .882L3.188 8 .264 9.559a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882L12.813 8l2.922-1.559a.5.5 0 0 0 0-.882l-7.5-4zm3.515 7.008L14.438 10 8 13.433 1.562 10 4.25 8.567l3.515 1.874a.5.5 0 0 0 .47 0l3.515-1.874zM8 9.433 1.562 6 8 2.567 14.438 6 8 9.433z" />
							</svg>
						</button>
						:
						<button tabIndex={ -1 } className='btn btn-outline-secondary' id='maximize' onClick={ this.handleMax }>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12px" fill="currentColor" className="bi bi-square" viewBox="0 0 16 16">
								<path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
							</svg>
						</button>

				}
				<button tabIndex={ -1 } className='btn rounded-0 btn-outline-secondary' id='close' onClick={ this.handleClick }>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="1em" fill="currentColor" className="bi bi-x-lg" viewBox="0 0 16 16">
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
						e.key === 'Enter' && !this.state.process && this.startDownload()
					} }
					className='input-url form-control'
					placeholder='Input a videopage url'
					type='text'
					id='url'
					value={ this.state.url }
					onChange={ this.handleInputChange }
				/>
				{
					this.state.process/* ||1 */ &&
					<div className='input-group-text bg-white loading'>
						<div className="spinner-border spinner-border-sm text-info" />
					</div>
				}
				{
					this.state.process
						?
						<button className='btn btn-danger' tabIndex={ -1 } onClick={ this.stopDownload }>Stop</button>
						:
						<button className='btn btn-primary' tabIndex={ -1 } onClick={ this.startDownload }>Start</button>
				}

				<button className='btn btn-secondary' tabIndex={ -1 } onClick={ () => this.pasteUrl() }>Paste</button>

			</div>
		/**
		 * 太太太太太忍者了ござる!!!
		 * 把obj裡的key連起來變成union,但是只會連指定類型的「key對應的type」
		 */
		type KeyofType<OBJ, TYPE> = {
			[key in keyof OBJ]: OBJ[key] extends TYPE ? key : never
		}[keyof OBJ]
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
			return (
				<div className="form-check form-switch col-12 col-sm-6  col-xl-4">
					<input tabIndex={ -1 } className="form-check-input" type="checkbox" role="switch" id={ id } checked={ this.state[id] } onChange={ this.handleInputChange } />
					<div className="input-group input-group-sm">
						<label className="form-check-label input-group-text bg-transparent" htmlFor={ id }>{ name }</label>
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
					{/* { option('saveAllSubtitles',) } */ }
				</div>
			</div>
		return (
			<div className="container">
				{ trafficLight }
				{ urlBar }
				{ options }
				<div className="display-area">
					<div className="progress" style={ {
						height: 10,
						marginLeft: 2,
						marginRight: 115.5,
						borderRadius: 4,
						marginTop: -8,
						zIndex: 100
					} }>
						<div className="progress-bar" role="progressbar"
							style={ { width: percent + "%" } }
						/>
					</div>
					<br />
					{ speed }
					{ notice }
					<br />
					{ thumbnail }
					<br />
					{ downloading }
					<br />
					{ error }
				</div>
			</div>
		);
	}
}
