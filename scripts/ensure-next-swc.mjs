// Garantit que Next.js dispose d'un compilateur natif utilisable sous Linux x64.
//
// Le binaire « gnu » de Next.js exige glibc >= 2.30. Certains hébergeurs (dont Hostinger)
// utilisent un Linux plus ancien : le chargement échoue (« GLIBC_2.29 not found ») et le build
// s'arrête. Le binaire « musl » est lié statiquement et fonctionne sur tout Linux x64, et
// Next.js l'essaie automatiquement après la variante gnu — mais npm ne l'installe pas sur un
// système glibc. Ce script le télécharge dans node_modules quand c'est nécessaire.
//
// Lancé après `npm install` (postinstall) et avant `npm run build` (prebuild). Sans effet
// ailleurs que sous Linux x64, ou si le binaire gnu fonctionne.
//
// BARESTO_FORCE_SWC_MUSL=1 force le téléchargement (tests).

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { gunzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const force = process.env.BARESTO_FORCE_SWC_MUSL === "1";
const log = (msg) => console.log(`[ensure-next-swc] ${msg}`);

async function main() {
  if (!force && (process.platform !== "linux" || process.arch !== "x64")) return;

  if (!force) {
    try {
      require("@next/swc-linux-x64-gnu");
      return; // Le binaire gnu se charge : rien à faire.
    } catch (e) {
      log(`binaire gnu inutilisable (${String(e.message).split("\n")[0]}), passage au binaire musl.`);
    }
  }

  const version = require("next/package.json").version;
  const target = join(process.cwd(), "node_modules", "@next", "swc-linux-x64-musl");
  const installed = join(target, "package.json");
  if (existsSync(installed) && JSON.parse(readFileSync(installed, "utf8")).version === version) {
    log(`@next/swc-linux-x64-musl@${version} déjà présent.`);
    return;
  }

  const url = `https://registry.npmjs.org/@next/swc-linux-x64-musl/-/swc-linux-x64-musl-${version}.tgz`;
  log(`téléchargement de ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`téléchargement impossible (HTTP ${res.status})`);

  rmSync(target, { recursive: true, force: true });
  extractNpmTarball(gunzipSync(Buffer.from(await res.arrayBuffer())), target);

  if (process.platform === "linux") require(target); // vérifie que le binaire se charge
  log(`@next/swc-linux-x64-musl@${version} installé.`);
}

/** Extrait une archive tar npm (dossier racine « package/ ») dans `dest`, sans dépendre de `tar`. */
function extractNpmTarball(tar, dest) {
  const field = (offset, length) => {
    const raw = tar.subarray(offset, offset + length);
    const end = raw.indexOf(0);
    return raw.toString("utf8", 0, end === -1 ? raw.length : end);
  };

  for (let pos = 0; pos + 512 <= tar.length; ) {
    const name = field(pos, 100);
    if (!name) break; // blocs vides de fin d'archive
    const size = parseInt(field(pos + 124, 12).trim() || "0", 8);
    const type = field(pos + 156, 1) || "0";
    const prefix = field(pos + 345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const data = pos + 512;

    if (type === "0") {
      const relative = normalize(fullName.replace(/^package\//, ""));
      if (relative.startsWith("..")) throw new Error(`chemin invalide dans l'archive : ${fullName}`);
      const file = join(dest, relative);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, tar.subarray(data, data + size));
    }
    pos = data + Math.ceil(size / 512) * 512;
  }
}

main().catch((e) => {
  // On ne bloque pas l'installation : si le build échoue ensuite, ce message aide au diagnostic.
  console.warn(`[ensure-next-swc] échec : ${e.message}`);
});
