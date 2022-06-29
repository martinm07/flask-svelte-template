import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

const root = resolve(_dirname, "src");
const outDir = resolve(_dirname, "dist");

const entryPoints = {
  home: resolve(root, "intro/home/index.html"),
  about: resolve(root, "intro/about/index.html"),
};

Object.entries(entryPoints).forEach(
  ([key, val]) => (entryPoints[key] = val.replace(/\\/g, "/"))
);
export default defineConfig({
  root,
  plugins: [svelte()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: entryPoints,
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split(".").at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = "img";
          } else if (
            /webm|mkv|flv|vob|ogv|ogg|drc|mp4|m4p|m4v/i.test(extType)
          ) {
            extType = "vid";
          }

          let webSec = getSection(assetInfo.name, extType !== "css");

          return `assets/${webSec}/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/shared/js/[name]-[hash].js",
        entryFileNames: (entryInfo) => {
          let webSec = getSection(entryInfo.name, false);
          return `assets/${webSec}/js/[name]-[hash].js`;
        },
      },
    },
  },
});

function getSection(name, pathAlreadyFull = true) {
  const assetName = name.split(".").at(0);
  const path = pathAlreadyFull
    ? name.split("/")
    : [
        // css/js files are auto-generated and don't have a full path, just their filename,
        // but we can use its name and "entryPoints" to figure out what it would be.
        ...entryPoints[assetName].split("/").slice(0, -1),
        "assets",
        name,
      ];
  const secRoot = path.findIndex((dirName) => dirName === "assets") - 2;
  if (secRoot < 0)
    throw new Error(
      `Asset "${path.at(
        -1
      )}" somehow not inside "assets" directory. Full path: ${path.join("/")}`
    );
  return path[secRoot];
}
