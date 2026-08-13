/**
 * Comunicado de boas-vindas — estrutura original do gerador do Departamento
 * Tributário: as duas páginas do material são as artes originais (A4) e o
 * sistema apenas escreve o nome do cliente e do colaborador responsável nas
 * posições exatas do documento.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import pagina1 from "@/assets/bv-original-p1.jpg.asset.json";
import pagina2 from "@/assets/bv-original-p2.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Comunicado boas-vindas — HUB Tributário" },
      {
        name: "description",
        content:
          "Gere o comunicado de boas-vindas do departamento tributário informando o nome da empresa e do colaborador responsável.",
      },
      { property: "og:title", content: "Comunicado boas-vindas — HUB Tributário" },
      {
        property: "og:description",
        content:
          "Comunicado de boas-vindas personalizado com nome da empresa e colaborador responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoasVindas,
});

/** Ajusta o tamanho da fonte até o texto caber na linha da arte (como no original). */
function useTextoAjustado(texto: string, maxPx: number, minPx: number) {
  const ref = useRef<HTMLDivElement | null>(null);

  const ajustar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const largura = el.parentElement?.clientWidth ?? 794;
    const escala = largura / 794;
    let tamanho = maxPx * escala;
    const minimo = minPx * escala;
    el.style.fontSize = `${tamanho}px`;
    while (el.scrollWidth > el.clientWidth && tamanho > minimo) {
      tamanho -= 1;
      el.style.fontSize = `${tamanho}px`;
    }
  }, [maxPx, minPx]);

  useEffect(() => {
    ajustar();
  }, [ajustar, texto]);

  useEffect(() => {
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [ajustar]);

  return ref;
}

function BoasVindas() {
  const [empresa, setEmpresa] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [erro, setErro] = useState("");

  const textoCliente = empresa.trim() ? `${empresa.trim().toUpperCase()},` : "NOME DO CLIENTE,";
  const textoColaborador = colaborador.trim() || "NOME DO COLABORADOR";

  const refCliente = useTextoAjustado(textoCliente, 46, 25);
  const refColaborador = useTextoAjustado(textoColaborador, 18, 11);

  function imprimir() {
    if (!empresa.trim() || !colaborador.trim()) {
      setErro("Preencha o nome do cliente e do colaborador responsável.");
      return;
    }
    setErro("");
    setTimeout(() => window.print(), 120);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <style>{`
        .bv-page { position: relative; width: min(794px, 100%); aspect-ratio: 210 / 297; background: #fff; box-shadow: 0 12px 35px rgba(21,29,42,.16); overflow: hidden; }
        .bv-page > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; display: block; }
        .bv-cliente { position: absolute; left: 12.6%; top: 25.9%; width: 74.8%; height: 6.4%; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 800; font-family: Arial, Helvetica, sans-serif; line-height: 1; white-space: nowrap; color: #000; overflow: hidden; }
        .bv-colaborador { position: absolute; left: 60%; top: 47.14%; width: 24.7%; height: 2.45%; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 700; font-family: Arial, Helvetica, sans-serif; line-height: 1; white-space: nowrap; color: #000; overflow: hidden; }
        .bv-vazio { color: #9aa0aa; opacity: .72; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .bv-preview, .bv-preview * { visibility: visible !important; }
          .bv-preview { position: absolute; inset: 0; display: block; gap: 0; margin: 0; padding: 0; }
          .bv-page { width: 210mm; height: 297mm; aspect-ratio: auto; box-shadow: none; page-break-after: always; break-after: page; }
          .bv-page:last-child { page-break-after: auto; break-after: auto; }
        }
      `}</style>

      <aside className="space-y-4 rounded-lg border bg-card p-5">
        <div>
          <h1 className="text-xl font-semibold">Gerador de Boas-vindas</h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dois campos. A prévia é atualizada automaticamente, mantendo o visual
            original do material.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="empresa">Nome do cliente</Label>
          <Input
            id="empresa"
            autoComplete="off"
            placeholder="Ex.: Empresa Exemplo Ltda."
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="colaborador">Colaborador responsável</Label>
          <Input
            id="colaborador"
            autoComplete="off"
            placeholder="Ex.: Gabrielly Lima"
            value={colaborador}
            onChange={(e) => setColaborador(e.target.value)}
          />
        </div>

        <Button className="w-full" onClick={imprimir}>
          <Printer className="mr-2 size-4" /> Gerar PDF
        </Button>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <strong>Como salvar:</strong> clique em “Gerar PDF” e, na janela de impressão, escolha
          <strong> Salvar como PDF</strong>. O documento sai em A4, com duas páginas.
        </p>
      </aside>

      <main className="bv-preview flex flex-col items-center gap-7">
        <section aria-label="Página 1" className="bv-page">
          <img src={pagina1.url} alt="Página 1 do comunicado de boas-vindas" />
          <div
            ref={refCliente}
            className={`bv-cliente ${empresa.trim() ? "" : "bv-vazio"}`}
          >
            {textoCliente}
          </div>
          <div
            ref={refColaborador}
            className={`bv-colaborador ${colaborador.trim() ? "" : "bv-vazio"}`}
          >
            {textoColaborador}
          </div>
        </section>
        <section aria-label="Página 2" className="bv-page">
          <img src={pagina2.url} alt="Página 2 do comunicado de boas-vindas" />
        </section>
      </main>
    </div>
  );
}
