import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/**
 * Writes the list of the build's files, and a version that changes whenever
 * any of them does, into the built public/sw.js, which caches them on install
 * so the installed app opens offline. The published grader (grader/) is left
 * out: src/grader/loadGrader.ts caches the version it uses itself.
 */
function precacheBuild(): Plugin {
  const PLACEHOLDER = 'const BUILD = { version: "dev", files: [] };'
  return {
    name: 'precache-build',
    apply: 'build',
    writeBundle({ dir }) {
      if (!dir) return
      const worker = join(dir, 'sw.js')
      const files = readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(dir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
        .filter((path) => path !== 'sw.js' && !path.startsWith('grader/'))
        .sort()
      const hash = createHash('sha256')
      for (const path of files) hash.update(path).update(readFileSync(join(dir, path)))
      const build = { version: hash.digest('hex').slice(0, 16), files }
      const source = readFileSync(worker, 'utf8')
      if (!source.includes(PLACEHOLDER)) throw new Error(`public/sw.js no longer has the line "${PLACEHOLDER}" for the build's file list`)
      writeFileSync(worker, source.replace(PLACEHOLDER, `const BUILD = ${JSON.stringify(build)};`))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheBuild()],
})
