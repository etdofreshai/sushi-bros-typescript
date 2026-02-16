import { defineConfig } from 'vite'
import { execSync } from 'child_process'

const commitSha = execSync('git rev-parse --short HEAD').toString().trim()
const branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __COMMIT_SHA__: JSON.stringify(commitSha),
    __BRANCH_NAME__: JSON.stringify(branchName),
  },
})
