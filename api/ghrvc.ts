import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = (req.query.user as string)?.trim()
  const repo = (req.query.repo as string)?.trim()
  const label = (req.query.label as string)?.trim()

  if (!user || !repo || !label) {
    res.status(400).send('Usage: /ghrvc?user=<username>&repo=<repository>&label=Repository Views')
    return
  }

  const ghToken = process.env.GITHUB_TOKEN
  if (!ghToken) {
    res.status(500).send('Server misconfigured: GITHUB_TOKEN not set')
    return
  }

  const apiUrl = `https://api.github.com/repos/${user}/${repo}/traffic/views`
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${ghToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  }

  const ghResp = await fetch(apiUrl, { headers })
  if (!ghResp.ok) {
    res.status(ghResp.status).send(`GitHub API error: ${await ghResp.text()}`)
    return
  }

  const data = await ghResp.json()
  const views = data.count || 0
  const uniques = data.uniques || 0

  // Simple SVG badge
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="20">
  <rect width="150" height="20" fill="#555"/>
  <rect x="70" width="80" height="20" fill="#09D"/>
  <text x="5" y="14" fill="#fff" font-size="11" font-family="Verdana">${label}</text>
  <text x="75" y="14" fill="#fff" font-size="11" font-family="Verdana">${views}</text>
</svg>`

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'max-age=3600')
  res.status(200).send(svg)
}
