import fs from "node:fs";
import path from "node:path";

// Banner do Setembro Amarelo: usa a foto salva em public/setembro/ (jpg, png ou webp), se existir.
export function setembroHero() {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const file = `voce-nao-esta-sozinho.${ext}`;
    if (fs.existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), "public", "setembro", file))) return `/setembro/${file}`;
  }
  return "";
}
