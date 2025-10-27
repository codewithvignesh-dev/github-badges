import Head from "next/head"

export default function Home() {
  const endpoints = [
    { path: "/ghrvc", name: "Repository View Count", desc: "Returns a badge showing repository views" },
    { path: "/ghpvc", name: "Profile View Count", desc: "Displays your GitHub profile view counter" },
    { path: "/ghflwcnt", name: "Followers Count", desc: "Shows your GitHub followers count badge" },
    { path: "/ghfc", name: "Fork Count", desc: "Displays total forks on a repository" },
    { path: "/ghsc", name: "Star Count", desc: "Shows total stars received on a repository" },
  ]

  return (
    <>
      <Head>
        <title>GitHub Badges API</title>
        <meta name="description" content="A simple API for dynamic GitHub badges built by Vigneshwaran P" />
      </Head>

      <main className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col items-center py-16 px-6">
        <h1 className="text-4xl font-bold text-white mb-4">⚡ GitHub Badges API</h1>
        <p className="text-gray-400 mb-10 text-center max-w-xl">
          A collection of endpoints to generate live GitHub metrics badges — hosted on Vercel.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {endpoints.map((ep) => (
            <a
              key={ep.path}
              href={ep.path}
              className="bg-[#161b22] p-5 rounded-xl border border-gray-800 hover:border-blue-500 transition-all hover:-translate-y-1 hover:shadow-lg duration-200"
            >
              <h2 className="text-lg font-semibold text-blue-400">{ep.name}</h2>
              <p className="text-gray-400 text-sm mt-1 mb-3">{ep.desc}</p>
              <div className="text-sm font-mono bg-[#0d1117] border border-gray-700 px-3 py-2 rounded-lg">
                <span className="text-gray-500">GET </span>
                <span className="text-blue-400">{ep.path}</span>
              </div>
            </a>
          ))}
        </div>

        <footer className="mt-16 text-gray-500 text-sm text-center">
          Built with 💙 using <span className="text-white">Next.js</span> & <span className="text-white">TypeScript</span>
          <br />
          <span className="text-gray-600">© {new Date().getFullYear()} Vigneshwaran P</span>
        </footer>
      </main>
    </>
  )
          }
