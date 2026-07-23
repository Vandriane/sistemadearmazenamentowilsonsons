import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Anchor, LogOut, Truck, ShieldAlert, Clock, Zap, CheckCircle2, RefreshCw, Database, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/patio")({
  component: Patio,
});

type ZoneType = "otimo" | "bom" | "medio" | "imo" | "ocupado" | "saida";

type Cell = {
  id: string;
  row: number;
  col: number;
  zone: ZoneType;
  containerCode?: string;
};

type Placement = {
  cellId: string;
  containerCode: string;
  operator: { name: string; email: string };
  forklift: string;
  imoRisk: string;
  entryDate: string;
  exitDate: string;
  observation: string;
  timestamp: string;
  zone: ZoneType;
  weight: number;
};

const COLS = 10;
const ROWS = 8;

const WEBHOOK = "https://hook.us2.make.com/umplnpq6f21h9rbqh9gntcers1gm1jog";
const SHEETS_API = "https://script.google.com/macros/s/AKfycbwr5D-kAxjhhTof7faj6D23SjqA27yXAMKidJT_fMj8Jvq4iCrobrteUvEEZlrgu3l_qw/exec";

type SheetRecord = {
  ID?: string | number;
  Contêiner?: string;
  "Entrada da Carga"?: string;
  "Saída da Carga"?: string;
  "Risco Químico"?: string | boolean;
  "Risco Biológico"?: string | boolean;
  "Risco Físico"?: string | boolean;
  "Risco Ambiental"?: string | boolean;
  "Empilhadeira Elétrica"?: string | boolean;
  "Empilhadeira a Gás"?: string | boolean;
  Status?: string;
  [key: string]: unknown;
};

const FORKLIFTS = [
  { id: "eletrica", label: "Empilhadeira elétrica", energy: 1 },
  { id: "glp", label: "Empilhadeira a gás GLP", energy: 2 },
];

const IMO_RISKS = [
  "Risco Químico",
  "Risco Biológico",
  "Risco Físico",
  "Risco Ambiental",
  "Risco Operacional",
];

const RISK_COLORS: Record<string, string> = {
  "Risco Biológico": "#dc2626",
  "Risco Químico": "#ea580c",
  "Risco Físico": "#9333ea",
  "Risco Ambiental": "#16a34a",
  "Risco Operacional": "#0f766e",
};

function weightCategory(w: number) {
  if (w <= 10) return { label: "Leve (0–10 t)", color: "#16a34a", short: "Leve" };
  if (w <= 20) return { label: "Médio (10–20 t)", color: "#eab308", short: "Médio" };
  if (w <= 28) return { label: "Pesado (20–28 t)", color: "#ea580c", short: "Pesado" };
  return { label: "Próximo do limite (>28 t)", color: "#dc2626", short: "Limite" };
}

function recommendForklift(w: number) {
  if (w <= 10) return { id: "eletrica", label: "Empilhadeira Elétrica", note: "Consumo mínimo, ideal para cargas leves.", alert: false };
  if (w <= 20) return { id: "eletrica", label: "Preferência: Elétrica", note: "Elétrica preferida; GLP como alternativa.", alert: false };
  if (w <= 28) return { id: "glp", label: "Empilhadeira a Gás GLP", note: "Peso exige empilhadeira GLP.", alert: false };
  return { id: "glp", label: "GLP · Alerta operacional", note: "Peso próximo do limite — atenção redobrada.", alert: true };
}

const ZONE_META: Record<ZoneType, { label: string; color: string; desc: string }> = {
  otimo:   { label: "Ótimo",           color: "bg-zone-otimo",   desc: "Menor deslocamento e consumo" },
  bom:     { label: "Bom",             color: "bg-zone-bom",     desc: "Bom equilíbrio" },
  medio:   { label: "Médio",           color: "bg-zone-medio",   desc: "Maior gasto energético" },
  imo:     { label: "Risco IMO",       color: "bg-zone-imo",     desc: "Área dedicada IMO" },
  ocupado: { label: "Zona Ocupada",    color: "bg-zone-ocupado", desc: "Slot em uso" },
  saida:   { label: "Saída Rápida 24h",color: "bg-zone-saida",   desc: "Reservada para saída urgente" },
};

function buildInitialGrid(): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let zone: ZoneType = "medio";
      // portão de acesso no lado esquerdo (col 0). Custo energético cresce com distância.
      if (c <= 1) zone = "otimo";
      else if (c <= 3) zone = "bom";
      else if (c >= 8) zone = "medio";
      // faixa IMO (afastada, mas acessível) — colunas 5-6, linhas 0-3
      if ((c === 5 || c === 6) && r <= 3) zone = "imo";
      // saída rápida 24h — última linha, colunas 0-3
      if (r === ROWS - 1 && c <= 3) zone = "saida";
      // algumas células já ocupadas
      const preOccupied = new Set(["1-2", "2-3", "3-1", "4-7", "5-5", "6-8"]);
      const id = `${r}-${c}`;
      if (preOccupied.has(id)) zone = "ocupado";
      cells.push({ id, row: r, col: c, zone });
    }
  }
  return cells;
}

function Patio() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<{ name: string; email: string } | null>(null);
  const [grid, setGrid] = useState<Cell[]>(buildInitialGrid);
  const [selected, setSelected] = useState<Cell | null>(null);
  const [containerCode, setContainerCode] = useState("");
  const [forklift, setForklift] = useState(FORKLIFTS[0].id);
  const [imoRisk, setImoRisk] = useState(IMO_RISKS[0]);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exitDate, setExitDate] = useState("");
  const [observation, setObservation] = useState("");
  const [weight, setWeight] = useState<number>(8);
  const [detailPlacement, setDetailPlacement] = useState<Placement | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [records, setRecords] = useState<SheetRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    setApiError(null);
    try {
      const res = await fetch(SHEETS_API, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: SheetRecord[] = Array.isArray(data)
        ? data
        : Array.isArray((data as { records?: unknown }).records)
          ? ((data as { records: SheetRecord[] }).records)
          : Array.isArray((data as { data?: unknown }).data)
            ? ((data as { data: SheetRecord[] }).data)
            : [];
      const sorted = [...list].sort((a, b) => {
        const idA = a.ID ?? "";
        const idB = b.ID ?? "";
        const numA = typeof idA === "number" ? idA : Number.parseFloat(String(idA));
        const numB = typeof idB === "number" ? idB : Number.parseFloat(String(idB));
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numB - numA;
        return String(idB).localeCompare(String(idA));
      });
      setRecords(sorted);
    } catch (err) {
      console.error(err);
      setApiError("Não foi possível carregar os registros da planilha. Verifique sua conexão e tente novamente.");
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    const t = setInterval(fetchRecords, 30000);
    return () => clearInterval(t);
  }, [fetchRecords]);

  useEffect(() => {
    const raw = localStorage.getItem("ws-operator");
    if (!raw) {
      navigate({ to: "/" });
      return;
    }
    try {
      setOperator(JSON.parse(raw));
    } catch {
      navigate({ to: "/" });
    }
    const p = localStorage.getItem("ws-placements");
    if (p) {
      try {
        const parsed = JSON.parse(p) as Placement[];
        setPlacements(parsed);
        setGrid((g) =>
          g.map((c) => {
            const pl = parsed.find((x) => x.cellId === c.id);
            return pl ? { ...c, zone: "ocupado", containerCode: pl.containerCode } : c;
          }),
        );
      } catch {}
    }
  }, [navigate]);

  const suggestion = useMemo(() => {
    // Sugerir com base no risco IMO + urgência da saída + gasto energético
    const isUrgent = exitDate && (new Date(exitDate).getTime() - Date.now()) / 36e5 <= 24;
    const forkliftEnergy = FORKLIFTS.find((f) => f.id === forklift)?.energy ?? 2;

    const available = grid.filter((c) => c.zone !== "ocupado");
    if (available.length === 0) return null;

    const scored = available.map((c) => {
      let score = 0;
      // distância do portão (col 0) — quanto mais perto, melhor (menos energia)
      score += (COLS - c.col) * (forkliftEnergy >= 3 ? 3 : 2);
      if (isUrgent) {
        if (c.zone === "saida") score += 50;
        else score -= 20;
      } else {
        if (c.zone === "saida") score -= 10; // preservar saída rápida
      }
      // IMO exige área IMO
      if (c.zone === "imo") score += 40;
      else score -= 15;
      if (c.zone === "otimo") score += 10;
      if (c.zone === "bom") score += 5;
      if (c.zone === "medio") score -= 5;
      return { cell: c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].cell;
  }, [grid, forklift, exitDate]);

  function logout() {
    localStorage.removeItem("ws-operator");
    navigate({ to: "/" });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function confirmPlacement() {
    if (!selected || !operator) return;
    if (!containerCode.trim()) {
      showToast("Informe o código do contêiner.");
      return;
    }
    if (selected.zone === "ocupado") {
      showToast("Slot já ocupado.");
      return;
    }
    setSubmitting(true);
    const placement: Placement = {
      cellId: selected.id,
      containerCode: containerCode.trim().toUpperCase(),
      operator,
      forklift: FORKLIFTS.find((f) => f.id === forklift)?.label ?? forklift,
      imoRisk,
      entryDate,
      exitDate,
      observation: observation.trim(),
      timestamp: new Date().toISOString(),
      zone: selected.zone,
    };

    const recordId = `WS-${Date.now()}`;
    const sheetPayload = {
      ID: recordId,
      "Contêiner": placement.containerCode,
      "Entrada da Carga": placement.entryDate,
      "Saída da Carga": placement.exitDate,
      "Risco Químico": placement.imoRisk === "Risco Químico" ? "Sim" : "Não",
      "Risco Biológico": placement.imoRisk === "Risco Biológico" ? "Sim" : "Não",
      "Risco Físico": placement.imoRisk === "Risco Físico" ? "Sim" : "Não",
      "Risco Ambiental": placement.imoRisk === "Risco Ambiental" ? "Sim" : "Não",
      "Empilhadeira Elétrica": forklift === "eletrica" ? "Sim" : "Não",
      "Empilhadeira a Gás": forklift === "glp" ? "Sim" : "Não",
      Status: "Armazenado",
      Observação: placement.observation,
      Slot: placement.cellId,
      Operador: operator.name,
      Email: operator.email,
      Timestamp: placement.timestamp,
    };

    let apiOk = true;
    try {
      const res = await fetch(SHEETS_API, {
        method: "POST",
        // text/plain evita preflight CORS no Apps Script
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(sheetPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error(err);
      apiOk = false;
    }

    try {
      await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...placement, sheetId: recordId }),
      });
    } catch {
      // webhook falhou; ainda registra localmente
    }

    const updated = [...placements, placement];
    setPlacements(updated);
    localStorage.setItem("ws-placements", JSON.stringify(updated));
    setGrid((g) =>
      g.map((c) => (c.id === selected.id ? { ...c, zone: "ocupado", containerCode: placement.containerCode } : c)),
    );
    setSelected(null);
    setContainerCode("");
    setObservation("");
    setExitDate("");
    setSubmitting(false);
    showToast(
      apiOk
        ? `Contêiner ${placement.containerCode} registrado (ID ${recordId}).`
        : `Registrado localmente. Falha ao gravar na planilha — verifique a conexão.`,
    );
    fetchRecords();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="grad-navy text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <Anchor className="w-6 h-6" />
          <h1 className="text-sm md:text-lg font-semibold truncate">
            Sistema de Armazenamento de Conteiners de Cargas IMO
          </h1>
          <div className="ml-auto flex items-center gap-3 text-xs md:text-sm">
            {operator && (
              <span className="hidden sm:inline opacity-90">
                {operator.name} · <span className="opacity-70">{operator.email}</span>
              </span>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 transition"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-turquoise" />
              <h2 className="font-semibold text-navy-deep">Mapa do Pátio · Wilson, Sons</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                Portão de acesso ⟵ à esquerda (menor gasto energético)
              </span>
            </div>

            <div className="overflow-x-auto">
              <div
                className="grid gap-1.5 min-w-[560px]"
                style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
              >
                {grid.map((cell) => {
                  const meta = ZONE_META[cell.zone];
                  const isSuggested = suggestion?.id === cell.id && cell.zone !== "ocupado";
                  const isSelected = selected?.id === cell.id;
                  const disabled = cell.zone === "ocupado";
                  return (
                    <button
                      key={cell.id}
                      disabled={disabled}
                      onClick={() => setSelected(cell)}
                      title={`${meta.label} · slot ${cell.id}${cell.containerCode ? ` · ${cell.containerCode}` : ""}`}
                      className={[
                        "aspect-square rounded-md text-[10px] font-semibold text-navy-deep/90 relative transition",
                        meta.color,
                        disabled ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.04] hover:shadow-md",
                        isSelected ? "ring-4 ring-primary" : "",
                        isSuggested ? "ring-2 ring-turquoise animate-pulse" : "",
                      ].join(" ")}
                    >
                      <span className="absolute top-1 left-1 opacity-70">{cell.id}</span>
                      {cell.containerCode && (
                        <span className="absolute bottom-1 right-1 opacity-90 text-[9px]">
                          {cell.containerCode.slice(-4)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {(Object.keys(ZONE_META) as ZoneType[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block w-3.5 h-3.5 rounded ${ZONE_META[k].color}`}></span>
                  <span className="text-muted-foreground">{ZONE_META[k].label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <InfoCard icon={<Zap className="w-4 h-4" />} title="Eficiência" text="Slots próximos ao portão consomem menos energia da empilhadeira." />
            <InfoCard icon={<ShieldAlert className="w-4 h-4" />} title="Segurança IMO" text="Cargas IMO devem ir para a faixa vermelha dedicada." />
            <InfoCard icon={<Clock className="w-4 h-4" />} title="Saída em 24h" text="Priorize a zona roxa para saídas urgentes." />
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-turquoise" />
              <h2 className="font-semibold text-navy-deep">Registros da planilha</h2>
              <span className="text-xs text-muted-foreground">
                {records.length} {records.length === 1 ? "registro" : "registros"}
              </span>
              <button
                onClick={fetchRecords}
                disabled={loadingRecords}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRecords ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>

            {apiError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2.5 text-xs mb-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Contêiner</th>
                    <th className="py-2 pr-3">Entrada</th>
                    <th className="py-2 pr-3">Saída</th>
                    <th className="py-2 pr-3">Riscos</th>
                    <th className="py-2 pr-3">Empilhadeira</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && !loadingRecords && !apiError && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                  {records.map((r, i) => {
                    const isYes = (v: unknown) =>
                      v === true || (typeof v === "string" && /^(sim|true|1|yes)$/i.test(v.trim()));
                    const risks = [
                      isYes(r["Risco Químico"]) && "Químico",
                      isYes(r["Risco Biológico"]) && "Biológico",
                      isYes(r["Risco Físico"]) && "Físico",
                      isYes(r["Risco Ambiental"]) && "Ambiental",
                    ].filter(Boolean).join(", ") || "—";
                    const fork = [
                      isYes(r["Empilhadeira Elétrica"]) && "Elétrica",
                      isYes(r["Empilhadeira a Gás"]) && "Gás GLP",
                    ].filter(Boolean).join(", ") || "—";
                    const status = String(r.Status ?? "—");
                    const statusColor = /armazen/i.test(status)
                      ? "bg-zone-bom/60 text-navy-deep"
                      : /sa[ií]da|liber/i.test(status)
                        ? "bg-zone-saida/60 text-white"
                        : /risco|alert/i.test(status)
                          ? "bg-zone-imo/70 text-white"
                          : "bg-muted text-muted-foreground";
                    return (
                      <tr key={String(r.ID ?? i)} className="border-b border-border/50 hover:bg-muted/40">
                        <td className="py-2 pr-3 font-mono">{String(r.ID ?? "—")}</td>
                        <td className="py-2 pr-3 font-medium">{String(r["Contêiner"] ?? "—")}</td>
                        <td className="py-2 pr-3">{String(r["Entrada da Carga"] ?? "—")}</td>
                        <td className="py-2 pr-3">{String(r["Saída da Carga"] ?? "—")}</td>
                        <td className="py-2 pr-3">{risks}</td>
                        <td className="py-2 pr-3">{fork}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>


        <aside className="glass rounded-xl p-4 h-max sticky top-24">
          <h3 className="font-semibold text-navy-deep mb-1">Registrar armazenagem</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {selected
              ? `Slot selecionado: ${selected.id} · ${ZONE_META[selected.zone].label}`
              : "Selecione um quadrado no mapa."}
          </p>

          {suggestion && !selected && (
            <button
              onClick={() => setSelected(suggestion)}
              className="w-full mb-3 rounded-lg border border-turquoise bg-turquoise-soft/50 text-navy-deep py-2 text-sm font-medium hover:bg-turquoise-soft transition"
            >
              💡 Sugestão do sistema: slot {suggestion.id} ({ZONE_META[suggestion.zone].label})
            </button>
          )}

          <label className="text-xs font-medium">Código do contêiner</label>
          <input
            value={containerCode}
            onChange={(e) => setContainerCode(e.target.value.toUpperCase())}
            placeholder="Ex.: MSCU1234567"
            className="w-full rounded-md border border-border bg-background/70 px-2.5 py-2 text-sm mb-2 outline-none focus:ring-2 focus:ring-ring"
          />

          <label className="text-xs font-medium">Empilhadeira</label>
          <select
            value={forklift}
            onChange={(e) => setForklift(e.target.value)}
            className="w-full rounded-md border border-border bg-background/70 px-2.5 py-2 text-sm mb-2"
          >
            {FORKLIFTS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>

          <label className="text-xs font-medium">Risco IMO</label>
          <select
            value={imoRisk}
            onChange={(e) => setImoRisk(e.target.value)}
            className="w-full rounded-md border border-border bg-background/70 px-2.5 py-2 text-sm mb-2"
          >
            {IMO_RISKS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Entrada</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background/70 px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Saída prevista</label>
              <input
                type="datetime-local"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background/70 px-2 py-2 text-sm"
              />
            </div>
          </div>

          <label className="text-xs font-medium mt-2 block">Observação</label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={2}
            placeholder="Ex.: manuseio com EPI completo"
            className="w-full rounded-md border border-border bg-background/70 px-2.5 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            disabled={!selected || submitting}
            onClick={confirmPlacement}
            className="w-full rounded-lg grad-navy text-white py-2.5 text-sm font-semibold disabled:opacity-50 hover:opacity-95 transition"
          >
            {submitting ? "Enviando..." : "Confirmar posição do contêiner"}
          </button>

          {placements.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-navy-deep mb-1">Últimos registros</h4>
              <ul className="text-xs space-y-1 max-h-40 overflow-y-auto pr-1">
                {placements.slice().reverse().slice(0, 6).map((p) => (
                  <li key={p.timestamp} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-turquoise mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{p.containerCode}</span> · slot {p.cellId} · {p.imoRisk}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-lg grad-navy text-white px-4 py-2.5 text-sm shadow-xl">
          {toast}
        </div>
      )}

      <footer className="grad-navy text-white/90">
        <div className="max-w-7xl mx-auto px-6 py-4 text-sm text-center">
          Projeto desenvolvido para fins educativos na KODIE Academy.
        </div>
      </footer>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 text-navy-deep font-semibold text-sm">
        {icon}{title}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{text}</p>
    </div>
  );
}
