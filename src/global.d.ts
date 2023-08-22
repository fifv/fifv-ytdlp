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
    var app: Electron.App
}

/**
 * OHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
 * THIS WORKS!!!!!!!!!!!!!!!!!!
 * 
 * recap:
 * First, I use export { } at file beginning, so this file (global.d.ts) becomes a File Module instead of a Global Module
 * (see: https://basarat.gitbook.io/typescript/project/modules)
 * To step into the global world, I need declare global { }
 * (see: https://basarat.gitbook.io/typescript/type-system/lib.d.ts#example-string-redux)
 * Use F12 on main.ts' `global`, found it is `module globalThis`
 * "You can declare a module globally for your project by using declare module 'somePath' and then imports will resolve magically to that path"
 * (see: https://basarat.gitbook.io/typescript/project/modules/external-modules#overturning-dynamic-lookup-just-for-types)
 * so I declare module globalThis { }
 * I seem to remember TS' official doc says that multipul `declare module` can be merged
 * (maybe, but I can't understand this: https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
 * Finally, I can declare variable in it
 * IDK why, but `const` not works, only `var` works
 */
declare global {
    /* `declare namespace globalThis` also works, the same thing? */
    declare module globalThis {
        var win: Electron.CrossProcessExports.BrowserWindow
        var app: Electron.App
    }
}