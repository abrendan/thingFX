import axios from 'axios'

// thingFX does not have its own release channel yet.
// Set this to 'https://api.github.com/repos/<owner>/<repo>/releases/latest'
// once a thingFX GitHub repository with releases exists.
const RELEASES_API_URL: string | null = null

export async function getLatestVersion() {
  if (!RELEASES_API_URL) return null

  const res = await axios.get(RELEASES_API_URL, {
    validateStatus: () => true
  })

  if (res.status !== 200) return null

  return {
    version: res.data.tag_name,
    downloadUrl: res.data.html_url
  }
}
