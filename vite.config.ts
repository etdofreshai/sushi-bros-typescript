import { defineConfig } from 'vite'
import { execSync } from 'child_process'

const commitSha = execSync('git rev-parse --short HEAD').toString().trim()
const branchName = (() => {
  const abbrev = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  if (abbrev !== 'HEAD') return abbrev
  // Detached HEAD — try common CI env vars, then fall back to git branch --contains
  if (process.env.BRANCH_NAME) return process.env.BRANCH_NAME
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME
  try {
    const branches = execSync('git branch -r --contains HEAD').toString().trim()
    const match = branches.match(/origin\/(\S+)/)
    if (match) return match[1]
  } catch {}
  return 'main'
})()
const repoName = (() => { try { const url = execSync('git config --get remote.origin.url').toString().trim(); const m = url.match(/\/([^/]+?)(?:\.git)?$/); return m ? m[1] : 'unknown'; } catch { return 'unknown'; } })()

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __COMMIT_SHA__: JSON.stringify(commitSha),
    __BRANCH_NAME__: JSON.stringify(branchName),
    __REPO_NAME__: JSON.stringify(repoName),
  },
})
