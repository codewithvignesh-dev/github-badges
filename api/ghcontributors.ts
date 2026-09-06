import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {

    const user = (req.query.user as string)?.trim()
    const repo = (req.query.repo as string)?.trim()

    if (!user || !repo) {
        res.status(400).send(
            'Usage: /ghcontributors?user=<username>&repo=<repository>'
        )
        return
    }

    const ghToken = process.env.GITHUB_TOKEN

    if (!ghToken) {
        res.status(500).send(
            'Server misconfigured: GITHUB_TOKEN not set'
        )
        return
    }

    const apiUrl =
        `https://api.github.com/repos/${user}/${repo}/contributors?per_page=100`

    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2026-03-10',
    }

    try {

        const ghResp = await fetch(apiUrl, { headers })

        if (!ghResp.ok) {
            res
                .status(ghResp.status)
                .send(`GitHub API error: ${await ghResp.text()}`)
            return
        }

        const contributors = await ghResp.json()

        if (!Array.isArray(contributors) || contributors.length === 0) {
            res.status(404).send('No contributors found')
            return
        }

        const total = contributors.reduce(
            (sum: number, contributor: any) =>
                sum + (contributor.contributions || 0),
            0
        )

        if (total === 0) {
            res.status(404).send('No contribution data found')
            return
        }

        const data = contributors.map((contributor: any) => ({
            login: contributor.name || contributor.login || 'Unknown',
            avatar: contributor.avatar_url || '',
            url: contributor.html_url || '#',
            contributions: contributor.contributions || 0,
            percentage:
                ((contributor.contributions || 0) / total) * 100,
        }))

        /*
         * Limit chart to top 8 contributors.
         * Remaining contributors are grouped as "Others".
         */
        const MAX_CONTRIBUTORS = 8

        let chartData = data.slice(0, MAX_CONTRIBUTORS)

        if (data.length > MAX_CONTRIBUTORS) {

            const others = data
                .slice(MAX_CONTRIBUTORS)
                .reduce(
                    (sum: number, contributor: any) =>
                        sum + contributor.percentage,
                    0
                )

            chartData.push({
                login: 'Others',
                avatar: '',
                url: '#',
                contributions: 0,
                percentage: others,
            })
        }

        /*
         * SVG PIE CHART
         */

        const width = 700
        const height = 420

        const cx = 210
        const cy = 210
        const radius = 150

        const colors = [
            '#0969da',
            '#8250df',
            '#1a7f37',
            '#bf8700',
            '#cf222e',
            '#0550ae',
            '#6639ba',
            '#116329',
            '#57606a',
        ]

        const polarToCartesian = (
            centerX: number,
            centerY: number,
            radius: number,
            angle: number
        ) => {

            const angleInRadians =
                (angle - 90) * Math.PI / 180

            return {
                x: centerX + radius * Math.cos(angleInRadians),
                y: centerY + radius * Math.sin(angleInRadians),
            }
        }

        const describeArc = (
            startAngle: number,
            endAngle: number
        ) => {

            const start =
                polarToCartesian(
                    cx,
                    cy,
                    radius,
                    endAngle
                )

            const end =
                polarToCartesian(
                    cx,
                    cy,
                    radius,
                    startAngle
                )

            const largeArcFlag =
                endAngle - startAngle <= 180
                    ? '0'
                    : '1'

            return [
                `M ${cx} ${cy}`,
                `L ${start.x} ${start.y}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
                'Z'
            ].join(' ')
        }

        let currentAngle = 0

        const slices = chartData
            .map((contributor: any, index: number) => {

                const startAngle = currentAngle

                const sliceAngle =
                    contributor.percentage * 3.6

                const endAngle =
                    currentAngle + sliceAngle

                currentAngle = endAngle

                const path =
                    describeArc(
                        startAngle,
                        endAngle
                    )

                return `
                    <path
                        d="${path}"
                        fill="${colors[index % colors.length]}"
                        stroke="#ffffff"
                        stroke-width="3"
                    >
                        <title>${contributor.login}: ${contributor.percentage.toFixed(2)}%</title>
                    </path>
                `
            })
            .join('')

        /*
         * LEGEND
         */

        const legend = chartData
            .map((contributor: any, index: number) => {

                const y =
                    55 + index * 38

                const percentage =
                    contributor.percentage.toFixed(2)
            })
            .join('')

        const svg = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
>

    <rect
        width="100%"
        height="100%"
        rx="12"
        fill="#ffffff"
    />

    <text
        x="350"
        y="32"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="20"
        font-weight="bold"
        fill="#24292f"
    >
        Contributors
    </text>

    ${slices}

    ${legend}

</svg>
`

        res.setHeader(
            'Content-Type',
            'image/svg+xml'
        )

        res.setHeader(
            'Cache-Control',
            'public, max-age=3600'
        )

        res.status(200).send(svg)

    } catch (error) {

        console.error(error)

        res
            .status(500)
            .send('Failed to fetch contributor data')
    }
}
