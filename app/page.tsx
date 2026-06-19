import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a3b52] via-[#073143] to-[#04161f] px-6 text-center">
      {/* soft light shafts */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(60%_50%_at_50%_-10%,#7fe3df_0%,transparent_60%)]" />

      <h1 className="relative bg-gradient-to-b from-white to-[#9fe7e2] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
        Seagrass Stories
      </h1>
      <p className="relative mt-4 max-w-md text-base text-[#bfe6ef] sm:text-lg">
        Dive in, plant seagrass, and bring a shared underwater meadow back to
        life — together.
      </p>

      <Link
        href="/play"
        className="relative mt-10 rounded-full bg-gradient-to-r from-[#19c6c6] to-[#2e7dd1] px-10 py-4 text-lg font-bold text-[#04121f] shadow-lg shadow-cyan-900/40 transition active:scale-95"
      >
        Start Play
      </Link>

      <p className="relative mt-6 text-xs text-[#6f97a6]">
        Make your diver, then plant a meadow.
      </p>
    </main>
  );
}
