const HomeScreen = () => {
  return (
    <div className="flex  w-full justify-center px-4 py-12">
      <div className="w-full max-w-7xl space-y-8 rounded-3xl bg-black p-8 shadow-2xl border border-zinc-800 gap-y-2">
        <h1 className="text-3xl font-bold text-white">Üdvözlünk a SpendFox-ban!</h1>
        <p className="text-zinc-400">Ez a kezdőképernyő. Itt jelenik meg a felhasználói tartalom.</p>
      </div>
    </div>
  );
}

export default HomeScreen;