export { }

// declare namespace NodeJS {
//     interface globalThis {
//         win: Electron.CrossProcessExports.BrowserWindow
//         app: Electron.App
//     }
// }
// declare global {

//     namespace NodeJS {
//         interface Global {
//             win: Electron.CrossProcessExports.BrowserWindow
//             app: Electron.App
//         }
//     }
// }
// declare namespace NodeJS {
//     var global
// }

// declare global {
//     const win: Electron.CrossProcessExports.BrowserWindow
//     const app: Electron.App
// }
/* FIXME: not works */
declare namespace globalThis {
    const win: Electron.CrossProcessExports.BrowserWindow
    const app: Electron.App
}