import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Anchor, ShieldAlert, Zap, Map as MapIcon, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("ws-operator");
    if (stored) {
      // already logged in — offer quick access, but don't auto-redirect
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) return setError("Informe seu nome completo.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError("E-mail inválido.");
    localStorage.setItem(
      "ws-operator",
      JSON.stringify({ name: trimmedName, email: trimmedEmail, since: new Date().toISOString() }),
    );
    navigate({ to: "/patio" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="grad-navy text-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <Anchor className="w-7 h-7" />
          <h1 className="text-lg md:text-xl font-semibold">
            Sistema de Armazenamento de Conteiners de Cargas IMO
          </h1>
          <span className="ml-auto text-xs md:text-sm opacity-80 hidden sm:block">Wilson, Sons</span>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-10 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-turquoise-soft/60 px-3 py-1 text-xs font-medium text-navy-deep">
              <ShieldAlert className="w-3.5 h-3.5" /> Gestão IMO • Estaleiro Wilson, Sons
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-navy-deep leading-tight">
              Sistema de Armazenamento de <span className="text-turquoise">Cargas IMO</span>
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Visualize o pátio em tempo real, receba sugestões de posições otimizadas por
              segurança, deslocamento e consumo energético das empilhadeiras — e registre cada
              movimentação com um clique.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <li className="glass rounded-xl p-3 flex items-start gap-2">
                <MapIcon className="w-4 h-4 mt-0.5 text-turquoise" />
                Mapa funcional do pátio
              </li>
              <li className="glass rounded-xl p-3 flex items-start gap-2">
                <Zap className="w-4 h-4 mt-0.5 text-turquoise" />
                Eficiência energética
              </li>
              <li className="glass rounded-xl p-3 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 text-turquoise" />
                Biossegurança IMO
              </li>
            </ul>
            <div className="pt-2">
              <a href="#login" className="inline-flex items-center gap-2 rounded-lg grad-navy text-white px-5 py-3 text-sm font-semibold shadow-lg hover:opacity-95 transition">
                <LogIn className="w-4 h-4" /> Login e Senha
              </a>
            </div>
          </div>

          <form
            id="login"
            onSubmit={handleLogin}
            className="glass rounded-2xl p-6 md:p-8 shadow-xl scroll-mt-24"
          >
            <h3 className="text-xl font-semibold text-navy-deep">Acesso do Operador</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Informe seu nome e e-mail funcional para acessar o mapa do pátio.
            </p>
            <label className="block text-sm font-medium mb-1">Nome do funcionário</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: João da Silva"
              className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-ring"
              autoComplete="name"
            />
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operador@wilsonsons.com.br"
              className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 mb-2 outline-none focus:ring-2 focus:ring-ring"
              autoComplete="email"
            />
            {error && <p className="text-destructive text-sm mb-2">{error}</p>}
            <button
              type="submit"
              className="mt-3 w-full rounded-lg grad-navy text-white py-2.5 font-semibold hover:opacity-95 transition"
            >
              Entrar no mapa do pátio
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Dados armazenados localmente apenas para registrar suas escolhas.
            </p>
          </form>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-4">
          {[
            { t: "Ótimo / Bom / Médio", d: "Classificação por deslocamento e consumo energético." },
            { t: "Área IMO segura", d: "Zonas com distanciamento adequado para riscos IMO." },
            { t: "Saída Rápida 24h", d: "Slots reservados para cargas com saída urgente." },
          ].map((c) => (
            <div key={c.t} className="glass rounded-xl p-5">
              <h4 className="font-semibold text-navy-deep mb-1">{c.t}</h4>
              <p className="text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="grad-navy text-white/90">
        <div className="max-w-6xl mx-auto px-6 py-5 text-sm text-center">
          Projeto desenvolvido para fins educativos na KODIE Academy.
        </div>
      </footer>
    </div>
  );
}
