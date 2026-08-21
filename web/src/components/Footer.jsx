const Footer = () => {
  return (
    <footer className="mx-auto mt-8 w-[min(92rem,calc(100%-2rem))] pb-8">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-6 text-sm font-semibold text-slate-500 md:flex-row">
        <p>&copy; 2026 SpendFox. Minden jog fenntartva.</p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <a className="transition hover:text-blue-600" href="/legal/privacy">Adatvédelem</a>
          <a className="transition hover:text-blue-600" href="/legal/terms">Általános Szerződési Feltételek</a>
          <a className="transition hover:text-blue-600" href="/settings">Beállítások</a>
        </div>
      </div>
    </footer>   
  )
}

export default Footer
