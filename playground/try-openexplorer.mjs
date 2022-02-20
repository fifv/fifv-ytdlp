import { execSync, spawnSync } from "child_process";

spawnSync(
	`explorer`,
	[`/select,`, `"D:\\Downloads\\CRTubeGet Downloaded\\youtube-dl\\[20211113]ユーフォリア _ 牧野由依 covered by nayuta-VDwDtH6ko54.webp"`],
	// ['/select,', '"D:\\Downloads\\CRTubeGet Downloaded\\youtube-dl\\[20211113]ユーフォリア _ 牧野由依 covered by nayuta-VDwDtH6ko54.webp"',],
	/**
	 * 一定要加!!!不然不會定位到指定的位置
	 */
	{ shell: true, },
)

execSync('explorer /select, "D:\\Downloads\\CRTubeGet Downloaded\\youtube-dl\\[20211113]ユーフォリア _ 牧野由依 covered by nayuta-VDwDtH6ko54.webp"')