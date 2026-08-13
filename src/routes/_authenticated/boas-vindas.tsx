import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import pagina1 from "@/assets/boas-vindas-p1.jpg.asset.json";
import pagina2 from "@/assets/boas-vindas-p2.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Gerador de boas-vindas — HUB Tributário" },
      {
        name: "description",
        content:
          "Gere o material de boas-vindas do departamento tributário informando o nome da empresa e do colaborador responsável.",
      },
      { property: "og:title", content: "Gerador de boas-vindas — HUB Tributário" },
      {
        property: "og:description",
        content: "Material de boas-vindas personalizado com nome da empresa e colaborador responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoasVindas,
});

function useFit(texto: string, maxPx: number, minPx: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => {
      let size = maxPx;
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth && size > minPx) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };
    const id = requestAnimationFrame(ajustar);
    window.addEventListener("resize", ajustar);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", ajustar);
    };
  }, [texto, maxPx, minPx]);
  return ref;
}

function BoasVindas() {
  const [empresa, setEmpresa] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [erro, setErro] = useState("");

  const textoEmpresa = empresa.trim() ? `${empresa.trim().toUpperCase()},` : "NOME DO CLIENTE,";
  const textoColaborador = colaborador.trim() || "NOME DO COLABORADOR";

  const refEmpresa = useFit(textoEmpresa, 46, 25);
  const refColaborador = useFit(textoColaborador, 18, 11);

  function gerar() {
    if (!empresa.trim() || !colaborador.trim()) {
      setErro("Preencha o nome da empresa e do colaborador responsável.");
      return;
    }
    setErro("");
    setTimeout(() => window.print(), 120);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden !important; }
          #bv-preview, #bv-preview * { visibility: visible !important; }
          #bv-preview { position: absolute; inset: 0; margin: 0; padding: 0; display: block; }
          #bv-preview .bv-page { width: 210mm; height: 297mm; aspect-ratio: auto; box-shadow: none; page-break-after: always; }
          #bv-preview .bv-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <aside className="surface-panel h-fit p-6 print:hidden">
        <h1 className="text-xl font-semibold">Gerador de boas-vindas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o nome da empresa e do colaborador responsável. A prévia é atualizada
          automaticamente, mantendo o material original.
        </p>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Nome da empresa</Label>
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
          <Button className="w-full" onClick={gerar}>
            <Printer className="size-4" />
            Gerar PDF
          </Button>
          {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
          <p className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">
            <strong>Como salvar:</strong> clique em “Gerar PDF” e, na janela de impressão, escolha
            “Salvar como PDF”. O documento sai em A4, com duas páginas.
          </p>
        </div>
      </aside>

      <main id="bv-preview" className="flex flex-col items-center gap-7">
        <section
          aria-label="Página 1"
          className="bv-page relative w-full overflow-hidden bg-white shadow-lg"
          style={{ aspectRatio: "210 / 297" }}
        >
          <img
            src={pagina1.url}
            alt="Página 1 do material de boas-vindas"
            className="absolute inset-0 block size-full"
            style={{ objectFit: "fill" }}
          />
          <div
            ref={refEmpresa}
            className="absolute flex items-center justify-center whitespace-nowrap text-center font-bold leading-none"
            style={{
              left: "12.6%",
              top: "25.9%",
              width: "74.8%",
              height: "6.4%",
              fontFamily: "Arial, Helvetica, sans-serif",
              color: "#000",
              opacity: empresa.trim() ? 1 : 0.55,
            }}
          >
            {textoEmpresa}
          </div>
        </section>

        <section
          aria-label="Página 2"
          className="bv-page relative w-full overflow-hidden bg-white shadow-lg"
          style={{ aspectRatio: "210 / 297" }}
        >
          <img
            src={pagina2.url}
            alt="Página 2 do material de boas-vindas"
            className="absolute inset-0 block size-full"
            style={{ objectFit: "fill" }}
          />
          <div
            ref={refColaborador}
            className="absolute flex items-center justify-center overflow-hidden whitespace-nowrap text-center font-bold leading-none"
            style={{
              left: "60%",
              top: "47.14%",
              width: "24.7%",
              height: "2.45%",
              fontFamily: "Arial, Helvetica, sans-serif",
              color: "#000",
              opacity: colaborador.trim() ? 1 : 0.55,
            }}
          >
            {textoColaborador}
          </div>
        </section>
      </main>
    </div>
  );
}
