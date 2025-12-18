import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get git commit hash and build time
function getGitCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getGitCommitMessage() {
  try {
    return execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf-8' }).trim()
  } catch {
    return 'Latest build'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(Date.now()),
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(getGitCommitHash()),
    'import.meta.env.VITE_COMMIT_NAME': JSON.stringify(getGitCommitMessage()),
  },
})
