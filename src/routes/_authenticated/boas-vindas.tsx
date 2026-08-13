import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Aviso,
  CabecalhoMarca,
  CONTATO,
  EstilosDocumento,
  FaixaSecao,
  LOGO_URL,
  MARCA,
  RodapeDocumento,
} from "@/components/documento";
import amanda from "@/assets/equipe-amanda.png.asset.json";
import gabrielly from "@/assets/equipe-gabrielly.png.asset.json";
import leticia from "@/assets/equipe-leticia.png.asset.json";
import matheus from "@/assets/equipe-matheus.png.asset.json";

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
        content: "Comunicado de boas-vindas personalizado com nome da empresa e colaborador responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoasVindas,
});

const EQUIPE = [
  {
    nome: "Gabrielly Lima",
    foto: gabrielly.url,
    email: "gabriellylima.tributario@escritoriologica.com.br",
    ramal: "Ramal 230",
    celular: "(19) 99742-8429",
  },
  {
    nome: "Letícia Neres",
    foto: leticia.url,
    email: "leticiapeder.tributario@escritoriologica.com.br",
    ramal: "Ramal 361",
    celular: "(19) 99742-8429",
  },
  {
    nome: "Matheus Neves",
    foto: matheus.url,
    email: "matheusneves.tributario@escritoriologica.com.br",
    ramal: "Ramal 331",
    celular: "(19) 99742-8429",
  },
];

const ROTINAS = [
  "Levantamento de débitos;",
  "Recálculo de guias;",
  "Acompanhamento e envio de guias de parcelamentos;",
  "Emissão de Certidões Negativas de Débitos (CND);",
  "Simulação e adesão a parcelamentos;",
  "Suporte no acompanhamento da Caixa de Mensagens do e-CAC.",
];

const ESPECIALIZADAS = [
  "Restituições e Compensações via PER/DCOMP;",
  "Atendimento de intimações e despachos decisórios;",
  "Ressarcimentos e Compensações via E-Credac;",
  "Estudos de parcelamentos especiais;",
  "Abertura e acompanhamento de Processos Administrativos Municipais, Estaduais e Federais;",
  "Atendimento e acompanhamento de Fiscalizações.",
];

function Marcador() {
  return (
    <span
      aria-hidden="true"
      style={{
        marginTop: "0.45em",
        display: "inline-block",
        width: "0.42em",
        height: "0.42em",
        flex: "0 0 auto",
        borderRadius: "999px",
        background: MARCA.dourado,
      }}
    />
  );
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul style={{ listStyle: "none", margin: "0 0 1em", padding: 0, display: "grid", gap: "0.35em" }}>
      {itens.map((item) => (
        <li key={item} style={{ display: "flex", gap: "0.6em", alignItems: "flex-start" }}>
          <Marcador />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function BoasVindas() {
  const [empresa, setEmpresa] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [erro, setErro] = useState("");

  const nomeEmpresa = empresa.trim() ? empresa.trim().toUpperCase() : "NOME DO CLIENTE";
  const nomeColaborador = colaborador.trim() || "NOME DO COLABORADOR";
  const preenchido = Boolean(empresa.trim() && colaborador.trim());

  function gerar() {
    if (!preenchido) {
      setErro("Preencha o nome da empresa e do colaborador responsável.");
      return;
    }
    setErro("");
    setTimeout(() => window.print(), 120);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <EstilosDocumento />

      <aside className="surface-panel h-fit p-6 print:hidden">
        <h1 className="text-xl font-semibold">Comunicado boas-vindas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o nome da empresa e do colaborador responsável. A prévia é atualizada
          automaticamente e o comunicado sai em A4, com duas páginas.
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
            “Salvar como PDF”.
          </p>
        </div>
      </aside>

      <main className="doc-preview">
        {/* Página 1 — capa/comunicado */}
        <section aria-label="Página 1" className="doc-page">
          <div className="doc-body">
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(120% 60% at 85% -10%, ${MARCA.douradoSuave} 0%, transparent 60%), linear-gradient(180deg, #fff 0%, ${MARCA.creme} 55%, ${MARCA.cinza} 100%)`,
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "2.4%",
                background: `linear-gradient(180deg, ${MARCA.dourado}, ${MARCA.douradoEscuro})`,
              }}
            />

            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "9% 10% 0 12%",
              }}
            >
              <img src={LOGO_URL} alt="Lógica Assessoria Contábil" style={{ width: "44%", alignSelf: "center" }} />

              <p
                style={{
                  marginTop: "9%",
                  fontSize: "0.95em",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: MARCA.douradoEscuro,
                  fontWeight: 600,
                }}
              >
                Departamento Tributário
              </p>

              <h1
                style={{
                  margin: "0.5em 0 0",
                  fontFamily: '"Space Grotesk", Arial, sans-serif',
                  fontSize: "2.9em",
                  lineHeight: 1.05,
                  fontWeight: 700,
                  wordBreak: "break-word",
                  opacity: empresa.trim() ? 1 : 0.5,
                }}
              >
                {nomeEmpresa},
              </h1>
              <p
                style={{
                  margin: "0.35em 0 0",
                  fontFamily: '"Space Grotesk", Arial, sans-serif',
                  fontSize: "2.1em",
                  fontWeight: 500,
                  color: MARCA.douradoEscuro,
                }}
              >
                seja muito bem-vindo(a)!
              </p>

              <div
                style={{
                  marginTop: "7%",
                  alignSelf: "flex-start",
                  borderRadius: "999px",
                  background: `linear-gradient(90deg, ${MARCA.dourado}, ${MARCA.douradoSuave})`,
                  padding: "0.7em 1.6em",
                  fontSize: "1.05em",
                  fontWeight: 600,
                }}
              >
                Sabemos que sua empresa é muito mais do que um <strong>CNPJ</strong>
              </div>

              <div
                style={{
                  marginTop: "6%",
                  background: "#fff",
                  border: `1px solid ${MARCA.cinza}`,
                  borderTop: `3px solid ${MARCA.dourado}`,
                  padding: "6% 6% 5%",
                  fontSize: "1.15em",
                  lineHeight: 1.75,
                }}
              >
                <p style={{ margin: "0 0 1em" }}>
                  Ela representa dedicação, trabalho e muitos sonhos construídos ao longo do caminho.
                </p>
                <p style={{ margin: "0 0 1.2em" }}>
                  Por isso, a equipe do Tributário estará ao seu lado, oferecendo suporte, cuidado e
                  orientação para que o seu negócio continue crescendo com segurança.
                </p>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "1.1em",
                    color: MARCA.grafite,
                  }}
                >
                  Conte conosco em cada etapa dessa jornada!
                </p>
              </div>
            </div>

            <RodapeDocumento pagina={1} total={2} />
          </div>
        </section>

        {/* Página 2 — equipe e atendimento */}
        <section aria-label="Página 2" className="doc-page">
          <div className="doc-body" style={{ background: "#fff" }}>
            <CabecalhoMarca titulo="Comunicado de boas-vindas" />

            <div style={{ padding: "3% 8% 0", fontSize: "1em", lineHeight: 1.6 }}>
              <FaixaSecao>
                Conheça a equipe do Departamento Tributário e o responsável pelo seu atendimento
              </FaixaSecao>

              <div style={{ textAlign: "center", marginBottom: "3%" }}>
                <img
                  src={amanda.url}
                  alt="Amanda Alves, coordenadora do Departamento Tributário"
                  style={{
                    width: "18%",
                    borderRadius: "999px",
                    border: `3px solid ${MARCA.dourado}`,
                    background: "#fff",
                  }}
                />
                <p style={{ margin: "0.5em 0 0.15em", fontWeight: 700 }}>Amanda Alves (Coordenadora)</p>
                <p style={{ margin: 0, fontSize: "0.8em", color: MARCA.grafiteClaro }}>
                  {CONTATO.email} · {CONTATO.telefone} — Ramal 302 · (19) 99767-0445
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3%" }}>
                {EQUIPE.map((pessoa) => (
                  <div key={pessoa.nome} style={{ textAlign: "center" }}>
                    <img
                      src={pessoa.foto}
                      alt={pessoa.nome}
                      style={{
                        width: "58%",
                        borderRadius: "999px",
                        border: `3px solid ${MARCA.dourado}`,
                        background: "#fff",
                      }}
                    />
                    <p style={{ margin: "0.45em 0 0.15em", fontWeight: 700, fontSize: "0.92em" }}>
                      {pessoa.nome}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.68em",
                        lineHeight: 1.45,
                        color: MARCA.grafiteClaro,
                        wordBreak: "break-word",
                      }}
                    >
                      {pessoa.email}
                      <br />
                      {CONTATO.telefone} — {pessoa.ramal}
                      <br />
                      {pessoa.celular}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "4%" }}>
                <FaixaSecao>Seu atendimento no Departamento Tributário</FaixaSecao>
                <p style={{ margin: "0 0 0.9em" }}>
                  O seu contato principal no Departamento Tributário será{" "}
                  <strong
                    style={{
                      color: MARCA.douradoEscuro,
                      opacity: colaborador.trim() ? 1 : 0.55,
                    }}
                  >
                    {nomeColaborador}
                  </strong>
                  , profissional responsável pelo acompanhamento das demandas rotineiras da sua
                  empresa e pelo suporte direto sempre que necessário.
                </p>
                <p style={{ margin: "0 0 0.6em", fontWeight: 600 }}>
                  Entre as principais atividades sob sua responsabilidade estão:
                </p>
                <Lista itens={ROTINAS} />

                <FaixaSecao>Demandas Especializadas</FaixaSecao>
                <p style={{ margin: "0 0 0.6em" }}>
                  Para demandas que exigem análise técnica específica, a responsável será{" "}
                  <strong>Letícia Neres</strong>, que atuará diretamente nos seguintes assuntos:
                </p>
                <Lista itens={ESPECIALIZADAS} />

                <Aviso titulo="Nossa equipe está à sua disposição">
                  Garantimos um atendimento ágil, seguro e eficiente, com o acompanhamento adequado
                  das demandas da sua empresa.
                </Aviso>
              </div>
            </div>

            <RodapeDocumento pagina={2} total={2} />
          </div>
        </section>
      </main>
    </div>
  );
}
