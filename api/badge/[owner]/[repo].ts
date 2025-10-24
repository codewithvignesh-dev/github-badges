import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { owner, repo } = req.query

  if (!owner || !repo)
    return res.status(400).send("Usage: /api/badge/<owner>/<repo>.svg")

  const ghToken = process.env.GITHUB_TOKEN
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/traffic/views`

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${ghToken}`,
    "X-GitHub-Api-Version": "2022-11-28"
  }

  const resp = await fetch(apiUrl, { headers })
  if (!resp.ok) {
    return res.status(resp.status).send(`GitHub API error: ${await resp.text()}`)
  }

  const data = await resp.json()
  const views = data.count || 0
  const uniques = data.uniques || 0

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="20">
  <rect width="150" height="20" fill="#555"/>
  <rect x="70" width="80" height="20" fill="#4c1"/>
  <text x="5" y="14" fill="#fff" font-size="11" font-family="Verdana">views</text>
  <text x="75" y="14" fill="#fff" font-size="11" font-family="Verdana">${views}</text>
</svg>`

  res.setHeader("Content-Type", "image/svg+xml")
  res.setHeader("Cache-Control", "max-age=3600")
  res.send(svg)
}
