import { exec } from "child_process";
exec('yt-dlp https://www.youtube.com/watch?v=RMZNjFkJK7E', (error, stdout, stderr)=>{
	console.log('*error:',error);
	console.log('*stdout:',stdout);
	console.log('*stderr:',stderr);
})
console.log('here');