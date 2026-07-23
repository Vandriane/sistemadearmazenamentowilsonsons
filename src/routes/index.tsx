import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Zap, ShieldAlert, Truck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

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

  const fatores = [
    {
      icon: <Zap className="w-7 h-7" style={{ color: "#f5c518" }} strokeWidth={2.5} />,
      title: "Eficiência energética",
      desc: "Consumo estimado da empilhadeira por deslocamento até a célula.",
    },
    {
      icon: <ShieldAlert className="w-7 h-7 text-navy-deep" strokeWidth={2.5} />,
      title: "Segurança IMO",
      desc: "Zonas dedicadas para cargas químicas, biológicas, físicas e ambientais.",
    },
    {
      icon: <Truck className="w-7 h-7" style={{ color: "#e5484d" }} strokeWidth={2.5} />,
      title: "Otimização de saída",
      desc: "Corredor de saída rápida para contêineres com prazo ≤ 24h.",
    },
  ];

  const zonas = [
    { color: "var(--zone-otimo)", title: "Ótimo", desc: "Mínimo gasto energético" },
    { color: "var(--zone-bom)", title: "Bom", desc: "Equilíbrio acesso/custo" },
    { color: "var(--zone-medio)", title: "Médio", desc: "Requer mais deslocamento" },
    { color: "var(--zone-saida)", title: "Saída Rápida 24h", desc: "Corredor de urgência" },
    { color: "var(--zone-imo)", title: "Risco IMO", desc: "Cargas perigosas" },
    { color: "var(--zone-ocupado)", title: "Zona Ocupada", desc: "Célula com contêiner" },
    { color: "#dc2626", title: "Risco Biológico", desc: "Agentes patogênicos e biocontaminantes" },
    { color: "#ea580c", title: "Risco Químico", desc: "Substâncias corrosivas ou tóxicas" },
    { color: "#9333ea", title: "Risco Físico", desc: "Materiais radioativos ou pressurizados" },
    { color: "#16a34a", title: "Risco Ambiental", desc: "Poluentes marinhos e ecotóxicos" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="grad-navy text-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-navy-deep text-lg" style={{ background: "var(--turquoise)" }}>
            W
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-semibold leading-tight truncate">
              Sistema de Armazenamento de Conteiners de Cargas IMO
            </h1>
            <p className="text-[11px] md:text-xs tracking-[0.15em] opacity-80 mt-0.5">
              WILSON SONS · ESTALEIRO
            </p>
          </div>
          <nav className="flex items-center gap-4 md:gap-6">
            <a href="#sobre" className="text-sm hover:text-white/80 hidden sm:inline">Sobre</a>
            <a
              href="#acessar"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-navy-deep hover:opacity-90 transition"
              style={{ background: "var(--turquoise)" }}
            >
              Acessar Pátio
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section id="sobre" className="max-w-6xl mx-auto px-6 pt-14 md:pt-20 pb-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-deep">Fatores críticos monitorados</h2>
          <p className="text-muted-foreground mt-3">Cada célula do mapa é classificada considerando três eixos.</p>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-5">
          {fatores.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 shadow-sm">
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-semibold text-navy-deep text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="max-w-6xl mx-auto px-6 pt-10 pb-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-deep">Zonas do pátio</h2>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-5">
          {zonas.map((z) => (
            <div key={z.title} className="glass rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <span
                className="w-11 h-11 rounded-lg shrink-0 border border-black/5"
                style={{ background: z.color }}
                aria-hidden
              />
              <div>
                <h4 className="font-semibold text-navy-deep">{z.title}</h4>
                <p className="text-sm text-muted-foreground">{z.desc}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="acessar" className="max-w-6xl mx-auto px-6 pb-20 scroll-mt-24">
          <form onSubmit={handleLogin} className="glass rounded-2xl p-6 md:p-8 shadow-xl max-w-xl mx-auto">
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
          </form>
        </section>
      </main>

      <footer className="grad-navy text-white/90">
        <div className="max-w-6xl mx-auto px-6 py-5 text-sm text-center">
          Projeto desenvolvido para fins educativos na <span className="font-semibold text-white">KODIE Academy</span>.
        </div>
      </footer>
    </div>
  );
}
