import { exec, spawn } from "child_process";
// console.log(process.env,process.cwd());
const child = spawn(
	// 'yt-dlp',
	// 'D:/usr/python310/Scripts/yt-dlp.exe',
	// 'D:/Program Files/python39/Scripts/yt-dlp.exe',
	// 'D:/Downloads/浏览器/yt-dlp (1).exe',
	'D:/usr/bin/yt-dlp#.exe',
	// 'py',
	[
		// "D:/Documents/_JavaScript/try-javascript/try-electron/try-queuer/playground/something.py",
		// 'D:/Downloads/浏览器/yt-dlp',
		// '-J',
		// '-r', '5K',
		// '--progress-template', '"downloading-%(progress._percent_str)s-%(progress._total_bytes_str)s-%(progress._speed_str)s-%(progress._eta_str)s"',
		// '--proxy', '127.0.0.1:7890',
		// 'https://www.youtube.com/watch?v=RMZNjFkJK7E',
		'w',
	],
	{

		/**
		 * true了shell之後能殺的也殺不掉了
		 */
		// shell: true,
		// detached: true,
	},
)
// child.stdout.on('readable', (data) => {
// 	console.log('*stdout:', data);

// })
child.stdout.on('data', (data) => {
	console.log('*stdout:', data.toString());

})
// child.stderr.on('readable', (data) => {
// 	console.log('*stderr:', data);
// })
child.stderr.on('data', (data) => {
	console.log('*stderr:', data.toString());
})

child.on('close', (code) => {
	console.log('*close:', code);
})
child.on('exit', (code) => {
	console.log('*exit:', code);
})

console.log('*pid:', child.pid);
setTimeout(() => {
	console.log('*午時已到');
	// const killcode = child.kill()
	// console.log('*killcode',killcode);
	// process.kill(child.pid)
	spawn(
		'taskkill',
		['/pid', child.pid?.toString(), '/f', '/t',]
	)

}, 300);
/**
 * taskkill強制結束是 1,
 * is not a valid URL 1,
 * You must provide at least one URL. 2,
 */