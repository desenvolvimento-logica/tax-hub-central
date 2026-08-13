/** Formatação e helpers visuais do módulo PERDCOMP. */

export function moeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataHora(valor: string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(+d) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function dataCurta(valor: string | null | undefined): string {
  if (!valor) return "—";
  const so = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (so) return `${so[3]}/${so[2]}/${so[1]}`;
  const d = new Date(valor);
  return Number.isNaN(+d) ? "—" : d.toLocaleDateString("pt-BR");
}

export function documento(valor: string | null | undefined): string {
  const d = (valor ?? "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return valor || "—";
}

export function emAnalise(situacao: string | null | undefined): boolean {
  return /an[áa]lise|processament|pendente|aguard/i.test(situacao ?? "");
}

export function tomSituacao(situacao: string | null | undefined): string {
  const s = situacao ?? "";
  if (/deferid|homolog|encerrad.*integral/i.test(s))
    return "border-success/30 bg-success/10 text-success";
  if (/indeferid|n[ãa]o homolog|cancel/i.test(s))
    return "bg-destructive/10 text-destructive border-destructive/30";
  if (/parcial|retific/i.test(s))
    return "border-warning/30 bg-warning/15 text-warning";
  if (emAnalise(s)) return "border-info/30 bg-info/10 text-info";
  return "bg-secondary text-secondary-foreground border-border";
}

/** Dias até o prazo: negativo = vencido, null = sem prazo. */
export function diasRestantes(prazo: string | null | undefined): number | null {
  if (!prazo) return null;
  const alvo = new Date(`${prazo.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(+alvo)) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((+alvo - +hoje) / 86_400_000);
}

export function abrirPdf(base64: string, nome: string, mime = "application/pdf") {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
