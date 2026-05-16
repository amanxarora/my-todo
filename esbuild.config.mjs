import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const vaultPluginDir = "H:/Mi unidad/Obsidian/.obsidian/plugins/my-todo";

esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  outfile: "main.js",
  logLevel: "info",
}).then(() => {
  if (!fs.existsSync(vaultPluginDir)) {
    fs.mkdirSync(vaultPluginDir, { recursive: true });
  }
  
  fs.copyFileSync("main.js", path.join(vaultPluginDir, "main.js"));
  fs.copyFileSync("manifest.json", path.join(vaultPluginDir, "manifest.json"));
  fs.copyFileSync("styles.css", path.join(vaultPluginDir, "styles.css"));
  
  console.log("Successfully compiled and synced to Obsidian vault!");
}).catch(() => process.exit(1));