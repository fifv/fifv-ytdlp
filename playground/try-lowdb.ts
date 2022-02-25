import path from "path";
import { Low, JSONFile } from 'lowdb'
import { fileURLToPath } from 'url'

/**
 * 初見的神奇搞法
 * __dirname用不了
 * import.meta.url指向這個腳本(是url)
 * fileURLToPath()轉換為path
 * dirname()去掉basename,流下dirname
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log(__dirname);
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
const db = new Low<Data>(new JSONFile(path.join(__dirname, 'db.json')))

await db.read()

db.data ||= {
	histories: [
		
	]
}
const { histories } = db.data
histories.push({
	"timestamp": 1645690864011,
	"url": "https://www.youtube.com/playlist?list=PL_i2uYKhN9y3qOFj4177ZsINvyS_KUDgb",
	"status": "finished",
})
console.log(db.data.histories);
await db.write()