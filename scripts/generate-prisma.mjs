import { spawnSync } from "node:child_process";
import path from "node:path";

const root=process.cwd();
const env={...process.env,DATABASE_URL:process.env.DATABASE_URL||"file:../data/proz-saude.sqlite"};
if(process.platform==="win32"){
  env.PRISMA_QUERY_ENGINE_LIBRARY ||= path.join(root,"node_modules","@prisma","engines","query_engine-windows.dll.node");
  env.PRISMA_SCHEMA_ENGINE_BINARY ||= path.join(root,"node_modules","@prisma","engines","schema-engine-windows.exe");
}
const cli=path.join(root,"node_modules","prisma","build","index.js");
const result=spawnSync(process.execPath,[cli,"generate"],{cwd:root,env,stdio:"inherit"});
process.exit(result.status||0);
