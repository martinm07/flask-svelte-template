import { resolve, dirname, parse, sep } from "node:path";
import { promises } from "node:fs";
import { createHash } from "crypto";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import {
  ManualChunksOption,
  NullValue,
  GetModuleInfo,
} from "rollup/dist/rollup.d.ts";

const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

const root = resolve(_dirname, "src");
const outDir = resolve(_dirname, "dist");

// IMP: Set the build's entry points here.
const entryPoints = {
  home: resolve(root, "intro/home/index.html"),
  about: resolve(root, "intro/about/index.html"),
  privacy: resolve(root, "intro/privacy/index.html"),
};

// IMP: Want to extend output.manualChunks? Do so here!
const manualChunks: ManualChunksOption = (
  id,
  { getModuleInfo, getModuleIds }
) => {
  return;
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
  //  to be substituted in at the output.assetFileNames() method
  let fileName = parse(id).name;
  // If all the dependencies are under the same section of the folder hierarchy, we can place
  //  the bundle under that section
  const commonSection = dependentEntryPoints
    .map((id) => id.split("/").at(-3))
    .reduce((p, c) => (p === c ? p : undefined));
  return {
    hash,
    name_: `${commonSection ? commonSection + "/" : ""}${fileName}`,
  };
}

function isMediaFile(name: string) {
  const path = parse(name);
  const ext = path.ext ? path.ext.replace(".", "") : name.replace(".", "");
  return /png|jpe?g|svg|gif|tiff|bmp|ico|webm|mkv|flv|vob|ogv|ogg|drc|mp4|m4p|m4v/i.test(
    ext
  );
}

const HASH_SIZE = 8;
function addFileHash(id: string, data: Uint8Array) {
  const hash = createHash("sha256")
    .update(data)
    .digest("hex")
    .slice(0, HASH_SIZE);
  const path = parse(id);
  return `${path.dir}/${path.name}${hash}${path.ext}`;
}
function removeFileHash(id: string) {
  const path = parse(id);
  return `${path.dir}/${path.name.slice(0, -HASH_SIZE)}${path.ext}`;
}

const mapHashName = new Map<string, string>();
const mediaFiles = new Set<string>();
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
      name: "get-media-section-info",
      apply: "build",
      // Vite requires we use "enfore: pre" to hook into resolveId
      enforce: "pre",
      // Collect all media files
      async resolveId(source, importer, options) {
        const resolution = await this.resolve(source, importer, options);
        if (resolution?.id && isMediaFile(resolution.id)) {
          // If the hash for this exact file has already been computed (because resolveId works
          //  not on modules but the source code import statements this can happen) then return that.
          const precomputedId = [...mediaFiles].find(
            (id) => removeFileHash(id) === resolution.id
          );
          if (precomputedId) return precomputedId;

          // Rename file to include content hash such that output.assetFileNames can distinguish
          //  between files of an otherwise identical name in the "mediaSections" lookup
          const data = await promises.readFile(resolution.id);
          const id = addFileHash(resolution.id, data);
          await promises.rename(resolution.id, id);

          mediaFiles.add(id);
          return id;
        }
      },
      // Find sections of media files in buildEnd, which is executed before output.assetFileNames,
      //  but just after the point getModuleInfo().importers/dynamicImporters are fully resolved,
      //  allowing getChunkName() (or rather, findDependentEntryPoints()) to work.
      buildEnd() {
        for (const id of mediaFiles) {
          const chunkName = getChunkName(id, this.getModuleInfo);
          if (!chunkName || !chunkName.name_.includes("/")) return;
          mediaSections.set(parse(id).base, chunkName.name_.split("/")[0]);
        }
      },
      // Revert the file renames
      closeBundle() {
        for (const id of mediaFiles) {
          promises.rename(id, removeFileHash(id));
        }
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: entryPoints,
      output: {
        manualChunks: (id, { getModuleInfo, getModuleIds }) => {
          // The first thing we do is generate all the outputs from the user's manualChunks
          //  function. This is because for each module we need to know ALL the modules it's
          //  forced to group with that we may determine a common section (or not).
          if (firstManualChunksCall) {
            for (const id of getModuleIds()) {
              manualChunksMap.set(
                id,
                manualChunks(id, { getModuleInfo, getModuleIds })
              );
            }
            firstManualChunksCall = false;
          }

          const userChunk = manualChunksMap.get(id);
          if (userChunk) {
            // Get all module IDs of the same chunk
            const idsGroup = [...manualChunksMap.entries()]
              .filter(([_, v]) => v === userChunk)
              .map(([k, _]) => k);

            // A Set because we almost certainly will face an importer
            //  importing multiple modules and we don't want duplicates.
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

          // Only worry about files under src/
          if (!resolve(id).includes(resolve(root))) return;

          // This also includes the style tag of Svelte files, which are emitted seperately and
          //  end with "?svelte&type=style&lang.css"
          if (id.endsWith(".css")) {
            // This generates a hash that will group all CSS modules that have the same dependencies
            //   (account for how dynamic imports don't allow grouping).
            // It also generates a sensible file name (one chosen arbitrarily from the bundle)
            //   and under a common section if there is one. This better name can be mapped to from the
            //   hash in the output.assetFileNames method.
            // NOTE, Because CSS files engage in code splitting,
            //   the assetFileNames method for CSS modules must execute after these manualChunks calls.
            //   However, no other asset I'm aware of does this by Rollup/Vite, and so assetFileNames executes BEFORE.
            //   That's why they can't be handled here and must be done with a custom plugin.
            const chunkName = getChunkName(id, getModuleInfo);
            if (!chunkName) return;
            const { hash, name_ } = chunkName;
            if (!hash) return name_;
            mapHashName.set(hash, name_);
            return hash;
          }
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            console.warn("Asset without a name. Received object: " + assetInfo);
            return "[name]-[hash][extname]";
          }

          let extType = parse(assetInfo.name).ext.slice(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = "img";
          } else if (
            /webm|mkv|flv|vob|ogv|ogg|drc|mp4|m4p|m4v/i.test(extType)
          ) {
            extType = "vid";
          }

          if (isMediaFile(assetInfo.name)) {
            const sec = mediaSections.get(assetInfo.name) || "shared";
            const origName = parse(removeFileHash(assetInfo.name)).name;

            return `static/${sec}/${extType}/${origName}-[hash][extname]`;
          }

          let mapReturn = mapHashName.get(parse(assetInfo.name).name);
          if (!mapReturn && extType === "css") mapReturn = assetInfo.name;
          if (mapReturn) {
            const sec = parse(mapReturn).dir || "shared";
            const origName = parse(mapReturn).name;

            return `static/${sec}/${extType}/${origName}-[hash][extname]`;
          }

          console.log(assetInfo.name);
          return "[name]-[hash][extname]";
        },
        chunkFileNames: (chunkInfo) => {
          if (
            chunkInfo.moduleIds.some(
              (id) =>
                resolve(id) ===
                resolve(_dirname, "node_modules", "svelte/src/version.js")
            )
          )
            return "static/shared/js/svelte-[hash].js";

          return "static/shared/js/[name]-[hash].js";
        },
        entryFileNames: (entryInfo) => {
          const sec = entryPoints[entryInfo.name].split(sep).at(-3);
          const name = entryPoints[entryInfo.name].split(sep).at(-2);
          return `static/${sec}/js/${name}-[hash].js`;
        },
      },
    },
  },
});
