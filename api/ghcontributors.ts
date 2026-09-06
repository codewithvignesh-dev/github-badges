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
        `https://api.github.com/repos/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/contributors?per_page=100&anon=true`

    const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2026-03-10'
    }

    const escapeXml = (value: unknown) =>
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')

    try {
        const ghResp = await fetch(apiUrl, { headers })

        if (!ghResp.ok) {
            const errorText = await ghResp.text()

            console.error(
                `GitHub API ${ghResp.status}:`,
                errorText
            )

            res
                .status(ghResp.status)
                .send(`GitHub API error: ${errorText}`)

            return
        }

        const contributors = await ghResp.json()

        if (!Array.isArray(contributors) || contributors.length === 0) {
            res.status(404).send('No contributors found')
            return
        }

        const myIdentities = new Set([
            'tg-darkespyt',
            'Vigneshwaran',
            'Vigneshwaran P',
            'codewithvignesh-dev'
        ])

        const mergedContributors = new Map<string, any>()

        for (const contributor of contributors) {
            const identity =
                contributor.login ||
                contributor.name ||
                'Someone'

            const isMyIdentity =
                myIdentities.has(identity)

            const displayName =
                isMyIdentity
                    ? 'codewithvignesh-dev'
                    : identity

            const contributions =
                Number(contributor.contributions) || 0

            if (mergedContributors.has(displayName)) {
                const existing =
                    mergedContributors.get(displayName)

                existing.contributions += contributions
            } else {
                mergedContributors.set(displayName, {
                    login: displayName,
                    contributions,
                    avatar:
                        isMyIdentity
                            ? 'https://github.com/codewithvignesh-dev.png?size=128'
                            : contributor.avatar_url || (contributor.name ? `https://github.com/${contributor.name}.png?size=128` : contributor.login ? `https://github.com/${contributor.login}.png?size=128` : '')
                    url:
                        isMyIdentity
                            ? 'https://github.com/codewithvignesh-dev'
                            : contributor.html_url || (contributor.name ? `https://github.com/${contributor.name}` : contributor.login ? `https://github.com/${contributor.login}` : '') '#'
                })
            }
        }

        const mergedData =
            Array.from(mergedContributors.values())

        mergedData.sort(
            (a, b) =>
                b.contributions - a.contributions
        )

        const total =
            mergedData.reduce(
                (sum: number, contributor: any) =>
                    sum + contributor.contributions,
                0
            )

        if (total <= 0) {
            res.status(404).send(
                'No contribution data found'
            )
            return
        }

        const topContributors =
            mergedData.slice(0, 3)

        const data =
            topContributors.map(
                (contributor: any) => ({
                    ...contributor,
                    percentage:
                        contributor.contributions /
                        total *
                        100
                })
            )

        if (mergedData.length > 3) {
            const othersContributions =
                mergedData
                    .slice(3)
                    .reduce(
                        (sum: number, contributor: any) =>
                            sum + contributor.contributions,
                        0
                    )

            data.push({
                login: 'Others',
                contributions: othersContributions,
                percentage:
                    othersContributions /
                    total *
                    100,
                avatar: '',
                url: '#'
            })
        }

        const width = 900
        const height = 560

        const chartColors = [
            '#0ea5ff',
            '#a855f7',
            '#22c55e',
            '#f59e0b'
        ]

        const chartX = 205
        const chartY = 315
        const radius = 145
        const innerRadius = 90

        const polarToCartesian = (
            centerX: number,
            centerY: number,
            radius: number,
            angle: number
        ) => {
            const radians =
                (angle - 90) *
                Math.PI /
                180

            return {
                x:
                    centerX +
                    radius *
                    Math.cos(radians),
                y:
                    centerY +
                    radius *
                    Math.sin(radians)
            }
        }

        const createSlice = (
            startAngle: number,
            endAngle: number,
            color: string
        ) => {
            const start =
                polarToCartesian(
                    chartX,
                    chartY,
                    radius,
                    endAngle
                )

            const end =
                polarToCartesian(
                    chartX,
                    chartY,
                    radius,
                    startAngle
                )

            const largeArc =
                endAngle - startAngle > 180
                    ? '1'
                    : '0'

            const path =
                [
                    `M ${chartX} ${chartY}`,
                    `L ${start.x} ${start.y}`,
                    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
                    'Z'
                ].join(' ')

            return `
<path
    d="${path}"
    fill="${color}"
    stroke="#071326"
    stroke-width="4"
>
    <title>${escapeXml(data[data.findIndex((item: any) => item.percentage * 3.6 === endAngle - startAngle)]?.login || '')}</title>
</path>`
        }

        let currentAngle = 0
        let slices = ''

        data.forEach((contributor: any, index: number) => {
            const startAngle = currentAngle
            const sliceAngle =
                contributor.percentage * 3.6

            const endAngle =
                startAngle + sliceAngle

            currentAngle = endAngle

            const color =
                chartColors[
                    index %
                    chartColors.length
                ]

            const start =
                polarToCartesian(
                    chartX,
                    chartY,
                    radius,
                    endAngle
                )

            const end =
                polarToCartesian(
                    chartX,
                    chartY,
                    radius,
                    startAngle
                )

            const largeArc =
                sliceAngle > 180
                    ? '1'
                    : '0'

            const path =
                [
                    `M ${chartX} ${chartY}`,
                    `L ${start.x} ${start.y}`,
                    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
                    'Z'
                ].join(' ')

            slices += `
<path
    d="${path}"
    fill="${color}"
    stroke="#071326"
    stroke-width="4"
>
    <title>${escapeXml(contributor.login)}: ${contributor.percentage.toFixed(2)}%</title>
</path>`
        })

        let cards = ''

        data.slice(0, 3).forEach(
            (contributor: any, index: number) => {
                const cardX = 390
                const cardY =
                    145 +
                    index * 112

                const cardWidth = 465
                const cardHeight = 92

                const isFirst =
                    index === 0

                const isSecond =
                    index === 1

                const accent =
                    isFirst
                        ? '#fbbf24'
                        : isSecond
                            ? '#c084fc'
                            : '#34d399'

                const border =
                    isFirst
                        ? '#fbbf24'
                        : '#1e335b'

                const percentage =
                    contributor.percentage.toFixed(2)

                const progress =
                    Math.min(
                        315,
                        Math.max(
                            6,
                            contributor.percentage /
                            100 *
                            315
                        )
                    )

                let avatar = ''

                if (contributor.avatar) {
                    avatar = `
<clipPath id="avatarClip${index}">
    <circle
        cx="${cardX + 48}"
        cy="${cardY + 46}"
        r="28"
    />
</clipPath>

<image
    href="${escapeXml(contributor.avatar)}"
    xlink:href="${escapeXml(contributor.avatar)}"
    x="${cardX + 20}"
    y="${cardY + 18}"
    width="56"
    height="56"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#avatarClip${index})"
/>`
                } else {
                    avatar = `
<circle
    cx="${cardX + 48}"
    cy="${cardY + 46}"
    r="28"
    fill="${accent}"
    opacity="0.22"
/>

<circle
    cx="${cardX + 48}"
    cy="${cardY + 38}"
    r="9"
    fill="${accent}"
/>

<path
    d="M ${cardX + 31} ${cardY + 62}
       Q ${cardX + 48} ${cardY + 44}
       ${cardX + 65} ${cardY + 62}"
    fill="${accent}"
/>`
                }

                const crown =
                    isFirst
                        ? `
<text
    x="${cardX + 28}"
    y="${cardY + 9}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22"
>
    &#128081;
</text>`
                        : ''

                cards += `
<rect
    x="${cardX}"
    y="${cardY}"
    width="${cardWidth}"
    height="${cardHeight}"
    rx="18"
    fill="${isFirst ? '#211d13' : '#0e1d37'}"
    stroke="${border}"
    stroke-width="${isFirst ? 2 : 1.5}"
/>

${crown}

<circle
    cx="${cardX + 48}"
    cy="${cardY + 46}"
    r="31"
    fill="#071326"
    stroke="${accent}"
    stroke-width="2"
/>

${avatar}

<circle
    cx="${cardX + 70}"
    cy="${cardY + 70}"
    r="13"
    fill="${accent}"
/>

<text
    x="${cardX + 70}"
    y="${cardY + 75}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="12"
    font-weight="700"
    fill="#071326"
>
    ${index + 1}
</text>

<text
    x="${cardX + 92}"
    y="${cardY + 32}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    font-weight="700"
    fill="#f8fafc"
>
    ${escapeXml(contributor.login)}
</text>

<text
    x="${cardX + 92}"
    y="${cardY + 52}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    font-weight="600"
    letter-spacing="1"
    fill="${accent}"
>
    ${isFirst ? 'TOP CONTRIBUTOR' : 'CONTRIBUTOR'}
</text>

<rect
    x="${cardX + 92}"
    y="${cardY + 65}"
    width="315"
    height="7"
    rx="4"
    fill="#243653"
/>

<rect
    x="${cardX + 92}"
    y="${cardY + 65}"
    width="${progress}"
    height="7"
    rx="4"
    fill="${accent}"
/>

<text
    x="${cardX + 430}"
    y="${cardY + 38}"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="18"
    font-weight="700"
    fill="${accent}"
>
    ${percentage}%
</text>`
            }
        )

        const svg = `
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
>

<defs>

<linearGradient
    id="background"
    x1="0"
    y1="0"
    x2="1"
    y2="1"
>
    <stop
        offset="0%"
        stop-color="#061329"
    />
    <stop
        offset="50%"
        stop-color="#0b1b38"
    />
    <stop
        offset="100%"
        stop-color="#11164b"
    />
</linearGradient>

<radialGradient
    id="blueGlow"
>
    <stop
        offset="0%"
        stop-color="#2563eb"
        stop-opacity="0.35"
    />
    <stop
        offset="100%"
        stop-color="#2563eb"
        stop-opacity="0"
    />
</radialGradient>

</defs>

<rect
    width="900"
    height="560"
    rx="28"
    fill="url(#background)"
/>

<circle
    cx="70"
    cy="120"
    r="190"
    fill="url(#blueGlow)"
/>

<circle
    cx="850"
    cy="500"
    r="200"
    fill="url(#blueGlow)"
/>

<path
    d="M0 485
       C160 445 290 520 440 480
       C600 438 740 510 900 425
       L900 560
       L0 560 Z"
    fill="#121b50"
    opacity="0.55"
/>

<circle
    cx="48"
    cy="54"
    r="22"
    fill="#f8fafc"
/>

<path
    d="M35 50
       C35 40 60 39 61 50
       C61 59 52 66 48 69
       C44 66 35 59 35 50Z"
    fill="#0b1830"
/>

<text
    x="84"
    y="58"
    font-family="Arial, Helvetica, sans-serif"
    font-size="30"
    font-weight="700"
    fill="#f8fafc"
>
    Contributors
</text>

<text
    x="86"
    y="83"
    font-family="Arial, Helvetica, sans-serif"
    font-size="12"
    fill="#8fa7cf"
>
    Amazing people who make this project better
</text>

<text
    x="820"
    y="55"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    font-weight="700"
    letter-spacing="1"
    fill="#8fa7cf"
>
    TOGETHER
</text>

<text
    x="820"
    y="76"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="14"
    font-weight="700"
    fill="#a78bfa"
>
    WE BUILD &#10022;
</text>

<circle
    cx="${chartX}"
    cy="${chartY}"
    r="${radius + 8}"
    fill="none"
    stroke="#14294b"
    stroke-width="4"
/>

${slices}

<circle
    cx="${chartX}"
    cy="${chartY}"
    r="${innerRadius}"
    fill="#09172f"
    stroke="#14294b"
    stroke-width="3"
/>

<text
    x="${chartX}"
    y="${chartY - 12}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    font-weight="600"
    fill="#8fa7cf"
>
    TOTAL
</text>

<text
    x="${chartX}"
    y="${chartY + 17}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="27"
    font-weight="700"
    fill="#f8fafc"
>
    100%
</text>

<text
    x="${chartX}"
    y="${chartY + 39}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    fill="#7188ad"
>
    contribution share
</text>

${cards}

<text
    x="48"
    y="526"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    fill="#7f96bb"
>
    Open Source
</text>

<circle
    cx="126"
    cy="522"
    r="2"
    fill="#64748b"
/>

<text
    x="138"
    y="526"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    fill="#7f96bb"
>
    Build Together
</text>

<text
    x="850"
    y="526"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    font-weight="600"
    letter-spacing="1"
    fill="#516a94"
>
    GITHUB CONTRIBUTORS
</text>

</svg>
`

        res.setHeader(
            'Content-Type',
            'image/svg+xml; charset=utf-8'
        )

        res.setHeader(
            'Cache-Control',
            'public, max-age=3600'
        )

        res.status(200).send(svg)
    } catch (error) {
        console.error(
            'Contributor SVG Error:',
            error instanceof Error
                ? error.stack
                : error
        )

        res
            .status(500)
            .send('Failed to fetch contributor data')
    }
}
