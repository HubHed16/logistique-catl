import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "..", "public");

const iconSvg = await readFile(resolve(publicDir, "icon.svg"));
const maskableSvg = await readFile(resolve(publicDir, "icon-maskable.svg"));

const BG = "#e67e22";

const targets = [
  { src: iconSvg, name: "icon-192.png", size: 192 },
  { src: iconSvg, name: "icon-512.png", size: 512 },
  { src: maskableSvg, name: "icon-512-maskable.png", size: 512 },
  { src: iconSvg, name: "apple-icon.png", size: 180, flatten: true },
  { src: iconSvg, name: "favicon-32.png", size: 32 },
  { src: iconSvg, name: "favicon-16.png", size: 16 },
];

for (const t of targets) {
  let pipeline = sharp(t.src, { density: 512 }).resize(t.size, t.size, {
    fit: "contain",
    background: BG,
  });
  if (t.flatten) {
    pipeline = pipeline.flatten({ background: BG });
  }
  const buf = await pipeline.png().toBuffer();
  await writeFile(resolve(publicDir, t.name), buf);
  console.log(`wrote public/${t.name} (${t.size}x${t.size})`);
}

const ico32 = await sharp(iconSvg, { density: 256 })
  .resize(32, 32, { fit: "contain", background: BG })
  .png()
  .toBuffer();
await writeFile(resolve(publicDir, "favicon.ico"), ico32);
console.log("wrote public/favicon.ico (32x32 png-in-ico)");
