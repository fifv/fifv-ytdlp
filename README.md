## YT-dlp GUI
Self-use `yt-dlp` GUI client, written in Electron+React

## Notes: pnpm

these packages are required by `electron-acrylic-window`

```
"bindings": "^1.5.0",
"electron-acrylic-window": "^0.5.11",
"file-uri-to-path": "^1.0.0"
```

but `electron-acrylic-window` can't be bundled by esbuild (idk why, maybe it includes native codes)

so I list them under `dependencies`, so they will be copied to `dist` during build

This problem occurs after I switch to pnpm, I think pnpm's strict structure brokes it

TO\DO: figure out how electron-builder copy node_modules. See notion.


## Notes: build

Now use `Vite` to serve `renderer.tsx` and `esbuild-register` to serve `main.ts` during dev

And use `esbuild` to build production for both `renderer.tsx` and `main.ts`. It is wayyy more faster than vite
