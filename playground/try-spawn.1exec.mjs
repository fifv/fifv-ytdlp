/**
 * 兩個詭異的問題:
 * 1. py3.10裡的沒法用spawn
 * 		3.9的可以,standalone也可以,裝好3.9後調用3.10裡的也可以.
 * 2. 無法kill
 * 		這個直接用taskkill解決
 */
import { exec, spawn, spawnSync } from "child_process";
// console.log(process.env,process.cwd());
const child = exec(
	'yt-dlp',
	// 'D:/usr/python310/Scripts/yt-dlp.exe',
	// 'D:/Program Files/python39/Scripts/yt-dlp.exe',
	// 'D:/Downloads/浏览器/yt-dlp (1).exe',
	// 'D:/usr/bin/yt-dlp#.exe',
	// {shell:true},
	(error, stdout, stderr,) => {
		// console.log(error, stdout, stderr,);
		console.log('*error:',error,);
		console.log('*stdout:',stdout,);
		console.log('*stderr:',stderr,);
	},
	// 'py',
)
// child.stdout.on('readable', (data) => {
// 	console.log('*stdout:', data);

// })
// console.log(child);
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