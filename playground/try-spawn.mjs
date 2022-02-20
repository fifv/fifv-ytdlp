import { spawn } from "child_process";
import JSON5 from 'json5'
const thisIsProgressTemplate = {
	'status': 'downloading',
	'downloaded_bytes': 41504875,
	'total_bytes': 56587310,
	'tmpfilename': 'RAINBOW���ǎ��錄�᡾original�� [RMZNjFkJK7E].f248.webm.part',
	'filename': 'RAINBOW���ǎ��錄�᡾original�� [RMZNjFkJK7E].f248.webm',
	// 'eta': None,
	// 'speed': None,
	'elapsed': 1.3156368732452393,
	// 'ctx_id': None,
	'_eta_str': 'Unknown',
	'_percent_str': ' 73.3%',
	'_speed_str': 'Unknown speed',
	'_total_bytes_str': '53.97MiB',
	'_default_template': ' 73.3% of 53.97MiB at Unknown speed ETA Unknown'
}

const child = spawn(
	'yt-dlp',
	[
		// '-J',
		'-r','5K',
		'--progress-template', '"downloading-%(progress._percent_str)s-%(progress._total_bytes_str)s-%(progress._speed_str)s-%(progress._eta_str)s"',
		'--proxy', '127.0.0.1:7890',
		'https://www.youtube.com/watch?v=RMZNjFkJK7E'
	]
,)
child.stdout.on('data', (data) => {
	if (data.includes('*downloading')) {
		// for (const key in data) {
		// 	console.log(key,data[key]);
		// }
		// const progressObj = JSON5.parse(eval(data.toString()))
		// const progressData = JSON5.parse(progressObj)
		// console.log(typeof progressObj,progressObj._percent_str);
		console.log(data.toString().replace(/(\r)|(')|(")/g, '').split('-').map((str) => str.trim()));
	} else {
		console.log('*stdout:', data.toString());
	}
})
child.stderr.on('data', (data) => {
	console.log('*stderr:', data.toString());
})

child.on('close', (code) => {
	console.log('*close:', code);
})
