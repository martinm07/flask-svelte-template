import path, { resolve, dirname, parse } from "node:path";
import { promises, readFile, readFileSync, write, writeFile } from "node:fs";
import { createHash } from "crypto";
// import { createFilter } from "@rollup/pluginutils";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import {
  ManualChunksOption,
  NullValue,
  GetModuleInfo,
} from "rollup/dist/rollup.d.ts";
import { generateAssetFileName } from "rollup/dist/shared/rollup.js";

const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

const root = resolve(_dirname, "src");
const outDir = resolve(_dirname, "dist");

const entryPoints = {
  home: resolve(root, "intro/home/index.html"),
  about: resolve(root, "intro/about/index.html"),
  privacy: resolve(root, "intro/privacy/index.html"),
};

// Small string hasher, taken from https://stackoverflow.com/a/52171480/11493659
const hashCode = (s: string) => {
  for (var i = 0, h = 9; i < s.length; )
    h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9);
  return Math.abs(h ^ (h >>> 9)).toString(16);
};
/**
 * Maps e.g. `C:/Users/marti/OneDrive/Desktop/Martin/projects/misc/svelte-5-flask-demo/svelte3/src/intro/home/index.html` -> `intro/home`
 */
const getEntryName = (entryPoint: string) =>
  entryPoint.split("/").slice(-3, -1).join("/");

const mapHashName = new Map<string, string>();

const manualChunks: ManualChunksOption = (id, { getModuleInfo }) => {
  return;
};
let firstManualChunksCall = true;
const manualChunksMap = new Map<string, string | NullValue>();
function findDependentEntryPoints(id: string, getModuleInfo: GetModuleInfo) {
  const dependentEntryPoints: string[] = [];
  let isDynamic: boolean = false;

  const { isEntry, dynamicImporters, importers } = getModuleInfo(id)!;
  if (isEntry) dependentEntryPoints.push(id);
  const idsToHandle = new Set([...dynamicImporters, ...importers]);
  // Even if we know it has a dynamic import, and thus won't be grouped with anything
  //  else, to be able to place it under the file hierarchy's sections we need
  //  all the dependent entry points to see if they share a common section.
  if (dynamicImporters.length > 0) isDynamic = true;

  for (const moduleId of idsToHandle) {
    const { isEntry, dynamicImporters, importers } = getModuleInfo(moduleId)!;
    if (isEntry) dependentEntryPoints.push(moduleId);

    for (const importerId of [...dynamicImporters, ...importers])
      idsToHandle.add(importerId);

    if (dynamicImporters.length > 0) isDynamic = true;
  }
  return { dependentEntryPoints, isDynamic };
}

function getChunkName(
  id: string,
  getModuleInfo: GetModuleInfo
): { hash: string | null; name_: string } | undefined {
  const { dependentEntryPoints, isDynamic } = findDependentEntryPoints(
    id,
    getModuleInfo
  );

  // console.log(dependentEntryPoints);
  if (dependentEntryPoints.length === 0) return;
  if (dependentEntryPoints.length === 1) {
    if (isDynamic) {
      const hash = hashCode(id);
      const sec = dependentEntryPoints[0].split("/").at(-3);
      const name = id.split("/").at(-1)?.split(".")[0];
      // mapHashName.set(hash, `${sec}/${name}`);
      return { hash, name_: `${sec}/${name}` };
    }
    return {
      hash: null,
      name_: getEntryName(dependentEntryPoints[0]),
    };
  }

  let hash: string;
  if (isDynamic) hash = hashCode(id);
  else {
    // Group this CSS file with all others who share the same entry points
    const entryNames = dependentEntryPoints.map((entry) => getEntryName(entry));
    // Sort the list so that order doesn't matter in the hash
    entryNames.sort();

    hash = hashCode(entryNames.join(""));
  }
  // To have a more reasonable name, we create mapping of the dependencies hash to the file name,
  //  to be substituted in at the assetFileNames() function
  let fileName = id.split("/").at(-1)?.split(".")[0]!;
  // If all the dependencies are under the same section of the folder hierarchy, we can place
  //  the bundle under that section
  const commonSection = dependentEntryPoints
    .map((id) => id.split("/").at(-3))
    .reduce((p, c) => (p === c ? p : undefined));
  // prettier-ignore
  // mapHashName.set(hash, `${commonSection ? commonSection + "/" : ""}${fileName}`);
  return {hash, name_: `${commonSection ? commonSection + "/" : ""}${fileName}`};
}

function isMediaFile(name: string) {
  const path = parse(name);
  const ext = path.ext ? path.ext.replace(".", "") : name.replace(".", "");
  // console.log(ext);
  return /png|jpe?g|svg|gif|tiff|bmp|ico|webm|mkv|flv|vob|ogv|ogg|drc|mp4|m4p|m4v/i.test(
    ext
  );
}
const mediaAssets = new Map();
const mediaFiles: string[] = [];
const mediaSections = new Map<string, string>();

export default defineConfig({
  root,
  plugins: [
    svelte({
      compilerOptions: {
        runes: true,
      },
    }),
    {
      name: "defer-asset-processing",
      enforce: "pre",
      // load(id) {
      //   // console.log(isMediaFile(id));
      //   if (isMediaFile(id)) mediaAssets.set(id, null);
      //   return null;
      // },
      // resolveFileUrl({ fileName, relativePath }) {
      //   console.log(fileName);
      //   if (isMediaFile(fileName)) {
      //     mediaAssets.set(fileName, relativePath);
      //   }
      //   return null;
      // },
      async resolveId(source, importer, options) {
        // console.log("🎈🎈🎈");
        const resolution = await this.resolve(source, importer, options);
        // writeFile(
        //   "resolveIDOut.txt",
        //   `${resolution?.id}\n`,
        //   { flag: "a" },
        //   (err) => true
        // );
        if (resolution?.id && isMediaFile(resolution.id)) {
          // const source = await promises.readFile(resolution.id);
          // mediaAssets.set(resolution.id, source);
          // await this.load(resolution);
          const data = await promises.readFile(resolution.id);
          const hash = createHash("sha256")
            .update(data)
            .digest("hex")
            .slice(0, 8);
          // const { dependentEntryPoints } = findDependentEntryPoints(
          //   resolution.id,
          //   this.getModuleInfo
          // );
          const id = `${resolution.id.split(".")[0]}${hash}.${
            resolution.id.split(".")[1]
          }`;
          await promises.rename(resolution.id, id);
          // mediaSections.set(id, "");
          mediaFiles.push(id);
          return id;
          // return false;
        }
        // resolution.
        // resolution.
        // console.log(resolution?.id);
        // if (resolution?.id && isMediaFile(resolution.id)) mediaAssets.set()
      },
      buildEnd() {
        const id = Array.from(mediaSections.keys())[0];
        // const { dependentEntryPoints } = findDependentEntryPoints(
        //   id,
        //   this.getModuleInfo
        // );
        // console.log(id);
        // const moduleInfo = this.getModuleInfo(id);
        // console.log(moduleInfo);
        // console.log(dependentEntryPoints);
        for (const id of mediaFiles) {
          const chunkName = getChunkName(id, this.getModuleInfo);
          // console.log(id, chunkName);
          if (!chunkName || !chunkName.name_.includes("/")) return;
          mediaSections.set(
            id.split("/").at(-1)!,
            chunkName.name_.split("/")[0]
          );
        }
      },
      closeBundle() {
        for (const id of mediaFiles) {
          promises.rename(
            id,
            `${id.split(".")[0].slice(0, -8)}.${id.split(".")[1]}`
          );
        }
      },
      // load(id) {
      //   writeFile("loadIDOut.txt", `${id}\n`, { flag: "a" }, (err) => true);
      // },

      // generateBundle(outputOptions, bundle) {
      //   const originalAssetFileNames = outputOptions.assetFileNames;
      //   // console.log(mediaAssets);

      //   // for (const [id, source] of mediaAssets.entries()) {
      //   //   console.log(id, source);
      //   //   console.log(this.getModuleInfo(<string>id));
      //   //   this.emitFile({
      //   //     type: "asset",
      //   //     name: id.split("/").at(-1),
      //   //     source,
      //   //   });
      //   // }

      //   // Collect asset information
      //   const assets = {};
      //   for (const [fileName, info] of Object.entries(bundle)) {
      //     if (info.type === "asset" && isMediaFile(info.name!)) {
      //       assets[fileName] = info;

      //       bundle[fileName].fileName = String(Math.random()).replace(".", "");
      //       // delete bundle[fileName];
      //       // generateAssetFileName(info.name, info.source, )
      //       // this.emitFile({
      //       //   type: "asset",
      //       //   name: "NEW.png",
      //       //   source: "",
      //       // });
      //     }
      //   }
      //   // console.log(assets);

      //   // Defer the naming until after code splitting
      //   // outputOptions.assetFileNames = (assetInfo) => {
      //   //   console.log("BOO");
      //   //   const originalFileName = assetInfo.name || "asset";
      //   //   const asset = assets[originalFileName];

      //   //   // if (typeof originalAssetFileNames === 'function') {
      //   //   //   return originalAssetFileNames(assetInfo);
      //   //   // }
      //   //   const userNameStr =
      //   //     typeof originalAssetFileNames === "function"
      //   //       ? originalAssetFileNames(assetInfo)
      //   //       : originalAssetFileNames;

      //   //   // Apply any naming convention needed
      //   //   const hash = createHash("sha256")
      //   //     .update(asset.source)
      //   //     .digest("hex")
      //   //     .slice(0, 8);
      //   //   return userNameStr
      //   //     .replace("[name]", originalFileName)
      //   //     .replace("[hash]", hash);
      //   // };
      // },

      // generateBundle(outputOptions, bundle) {
      //   // console.log("HELLO", bundle);
      //   for (const [fileName, relativePath] of mediaAssets.entries()) {
      //     if (typeof outputOptions.assetFileNames === "string") break;

      //     const name = path.basename(fileName);
      //     const filepath = path.dirname(fileName);

      //     const newFileName = outputOptions.assetFileNames({
      //       name,
      //       source: "",
      //       type: "asset",
      //     });
      //     const asset = bundle[fileName];
      //     delete bundle[fileName];
      //     asset.fileName = path.join(filepath, newFileName);
      //     bundle[asset.fileName] = asset;
      //     console.log("🎈🎈🎈", newFileName);
      //     // this.emitFile({
      //     //   type: "asset",
      //     //   fileName: newFileName,
      //     //   source: asset,
      //     // });
      //   }
      // },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: entryPoints,
      output: {
        manualChunks: (id, { getModuleInfo, getModuleIds }) => {
          mediaSections.set("poopypooppooraceconditions", "actuallynvm");
          if (firstManualChunksCall) {
            for (const id of getModuleIds()) {
              manualChunksMap.set(
                id,
                manualChunks(id, { getModuleInfo, getModuleIds })
              );
            }
            // console.log(Array.from(getModuleIds()));
            firstManualChunksCall = false;
          }
          // console.log(id);
          // console.log("🎈🎈🎈");
          if (!resolve(id).includes(resolve(root))) return;
          // console.log("🎈🎈🎈", id.split("svelte-5-flask-demo/")[1]);

          const userChunk = manualChunksMap.get(id);
          if (userChunk) {
            const idsGroup = [...manualChunksMap.entries()]
              .filter(([_, v]) => v === userChunk)
              .map(([k, _]) => k);

            const allEntryPointsSet = new Set<string>();
            for (const id of idsGroup) {
              const { dependentEntryPoints } = findDependentEntryPoints(
                id,
                getModuleInfo
              );
              dependentEntryPoints.forEach((entry) =>
                allEntryPointsSet.add(entry)
              );
            }
            const dependentEntryPoints = [...allEntryPointsSet];

            if (dependentEntryPoints.length === 0) return userChunk;
            const commonSec = dependentEntryPoints
              .map((id) => id.split("/").at(-3))
              .reduce((p, c) => (p === c ? p : undefined));
            if (!commonSec) return userChunk;
            return `${commonSec}/${userChunk}`;
          }

          const extType = id.split(".").at(-1)!;
          const isMedia =
            /png|jpe?g|svg|gif|tiff|bmp|ico|webm|mkv|flv|vob|ogv|ogg|drc|mp4|m4p|m4v/i.test(
              extType
            );
          // console.log("💎💎💎", extType, isMedia);

          // This also includes the style tag of Svelte files, which are emitted seperately and
          //  end with "?svelte&type=style&lang.css"
          if (id.endsWith(".css")) {
            const chunkName = getChunkName(id, getModuleInfo);
            if (!chunkName) return;
            const { hash, name_ } = chunkName;
            if (!hash) return name_;
            mapHashName.set(hash, name_);
            return hash;
          } else if (isMedia) {
            const chunkName = getChunkName(id, getModuleInfo);
            if (!chunkName) return;
            // const data = readFileSync(id);
            // // console.log(JSON.stringify(data));
            // const name = id.split("/").at(-1)!.split(".")[0];
            // // writeFile(
            // //   `manualChunksOut${name}.txt`,
            // //   JSON.stringify(data),
            // //   (err) => true
            // // );
            // console.log(chunkName.name_, mediaSections);
            // mediaSections.set(JSON.stringify(data), chunkName.name_);
            // mediaSections.set(
            //   JSON.stringify(data).slice(0, 100),
            //   chunkName.name_
            // );
            mediaSections.set("poopypooppooraceconditions", chunkName.name_);
            // console.log(mediaSections);
          }

          //
          //
          // if (!id.includes("node_modules")) {
          // if (id.includes("inkling_pink")) {
          //   const info = getModuleInfo(id)!;
          //   console.log(info);
          //   console.log("AST:", info.ast);
          //   console.log(
          //     "Dynamically Imported ID Resolutions:",
          //     info.dynamicallyImportedIdResolutions
          //   );
          //   console.log("Dynamic Importers:", info.dynamicImporters);
          //   console.log("Exported Bindings:", info.exportedBindings);
          //   console.log("Exports:", info.exports);
          //   console.log("Has Default Export:", info.hasDefaultExport);
          //   console.log(
          //     "implicitlyLoadedAfterOneOf:",
          //     info.implicitlyLoadedAfterOneOf
          //   );
          //   console.log("implicitlyLoadedBefore:", info.implicitlyLoadedBefore);
          //   console.log("importedIdResolutions:", info.importedIdResolutions);
          //   console.log("importedIds:", info.importedIds);
          //   console.log("importers:", info.importers);
          //   console.log("isIncluded", info.isIncluded);
          // }
          // } else if (id.includes("svelte-5-flask-demo/"))
          //     console.log("🎈🎈🎈", id.split("svelte-5-flask-demo/")[1]);
          //   else console.log("🎈🎈🎈", id);
          // }
          // if (id.includes("node_modules")) {
          //   return "vendor";
          // }

          // const dependentEntryPoints: string[] = [];
          // const idsToHandle = new Set(getModuleInfo(id)?.dynamicImporters);

          // for (const moduleId of idsToHandle) {
          //   const { isEntry, dynamicImporters, importers } =
          //     getModuleInfo(moduleId)!;
          //   if (isEntry || dynamicImporters.length > 0)
          //     dependentEntryPoints.push(moduleId);

          //   for (const importerId of importers) idsToHandle.add(importerId);
          // }
        },
        assetFileNames: (assetInfo) => {
          // console.log("💎💎💎");
          // assetInfo.source;
          // console.log(`Name: "${assetInfo.name}"  Type: "${assetInfo.type}"`);
          // const extType = assetInfo.name!.split(".").at(-1)!;
          // const isMedia =
          //   /png|jpe?g|svg|gif|tiff|bmp|ico|webm|mkv|flv|vob|ogv|ogg|drc|mp4|m4p|m4v/i.test(
          //     extType
          //   );
          if (assetInfo.name && isMediaFile(assetInfo.name)) {
            console.log("💎💎💎");
            console.log(mediaSections, mediaSections.get(assetInfo.name));
            console.log(assetInfo.name);
            // console.log("HELLO!");
            // const data = readFileSync(
            //   "C:/Users/marti/OneDrive/Desktop/Martin/projects/misc/svelte-5-flask-demo/svelte3/src/intro/about/inkling_pink.jpg"
            // );
            // console.log(data.buffer.slice(0, 100));
            // console.log(assetInfo.source.slice(0, 100));
            // console.log(data.equals(<Uint8Array>assetInfo.source));
            // console.log(mediaSections);
            // writeFile(
            //   `assetFileNamesOut${assetInfo.name?.split(".")[0]}.txt`,
            //   JSON.stringify(Array.from(mediaSections.entries())),
            //   (err) => true
            // );
            // console.log(JSON.stringify(assetInfo.source));
            // console.log(mediaSections.get(JSON.stringify(assetInfo.source)));
            const secName = mediaSections.get(assetInfo.name);
            const origName = assetInfo.name.split(".")[0].slice(0, -8);
            return `${secName ? secName + "/" : ""}${origName}-[hash][extname]`;
          }
          if (assetInfo.name && mapHashName.get(assetInfo.name.split(".")[0]))
            return `${mapHashName.get(
              assetInfo.name.split(".")[0]
            )}-[hash][extname]`;
          return "[name]-[hash][extname]";
        },
        chunkFileNames: (chunkInfo) => {
          // console.log(chunkInfo);
          if (
            chunkInfo.moduleIds.some(
              (id) =>
                resolve(id) ===
                resolve(_dirname, "node_modules", "svelte/src/version.js")
            )
          )
            return "svelte-[hash].js";
          // console.log(chunkInfo);
          return "[name].js";
        },
      },
    },
  },
});
