import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const design = JSON.parse(fs.readFileSync(path.join(root, "design-reference/figma/design-archive.json"), "utf8"));
const ids = JSON.parse(fs.readFileSync(path.join(root, "figma-node-ids.json"), "utf8"));

function walk(node, fn) {
  fn(node);
  for (const child of node.children ?? []) walk(child, fn);
}

const entries = design.screens.map((screen) => {
  const device = screen.device.toLowerCase();
  const actions = [];
  const components = new Set();
  walk(screen.tree, (node) => {
    if (node.kind === "instance") components.add(node.ref.split("/").slice(0, node.ref.startsWith("Button/") ? 2 : 1).join("/"));
    if (node.target) actions.push({ label: node.over?.Label ?? node.name, destination: node.target });
  });
  const historical = ["senha", "senha-enviada"].includes(screen.key);
  return {
    figmaName: `${screen.device} / ${screen.key} / ${screen.title}`,
    nodeId: ids[`${device}/${screen.key}`] ?? null,
    device,
    slug: screen.key,
    title: screen.title,
    dimensions: device === "desktop" ? { width: 1440, height: 1024 } : { width: 390, height: 844 },
    mainComponents: [...components],
    entryFlow: [],
    actions,
    actionDestinations: [...new Set(actions.map((x) => x.destination))],
    equivalent: ids[`${device === "desktop" ? "mobile" : "desktop"}/${screen.key}`] ?? null,
    notes: historical
      ? "Referência histórica; recuperação de senha excluída do produto funcional."
      : "A hierarquia foi confirmada nos metadados do Figma. Ações e componentes foram complementados pelo pacote local anterior; conferir no Figma atual quando disponível.",
  };
});

for (const entry of entries) {
  entry.entryFlow = [...new Set(entries
    .filter((candidate) => candidate.device === entry.device && candidate.actionDestinations.includes(entry.slug))
    .map((candidate) => candidate.slug))];
}

fs.mkdirSync(path.join(root, "docs/figma"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/figma/manifest.json"), JSON.stringify({
  fileKey: "CIuyCGVPdM8SENYRHQ9eHh",
  pageId: "0:1",
  connection: "david",
  physicalScreenFrames: 105,
  canonicalScreens: entries.length,
  sourceLimit: "MCP Starter rate limit after hierarchy audit and seven detailed design contexts",
  screens: entries,
}, null, 2) + "\n");
fs.writeFileSync(path.join(root, "docs/figma/screens.md"),
  "# Telas canônicas\n\n85 entradas únicas: 42 desktop e 43 mobile. As quatro entradas de recuperação de senha são históricas.\n\n" +
  "| Dispositivo | Slug | Título | Node ID |\n| --- | --- | --- | --- |\n" +
  entries.map((e) => `| ${e.device} | ${e.slug} | ${e.title} | ${e.nodeId} |`).join("\n") + "\n");
console.log(`Geradas ${entries.length} entradas.`);
