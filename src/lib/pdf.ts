/**
 * Geração de PDF no navegador a partir de um bloco HTML.
 * Usa um iframe isolado com folha de estilo própria e a caixa de impressão
 * do navegador ("Salvar como PDF"), evitando dependências de canvas que
 * falham com conteúdo HTML vindo do GOB.
 */

export async function baixarHtmlComoPdf(elemento: HTMLElement, nomeArquivo: string) {
  const titulo = nomeArquivo.replace(/\.pdf$/i, "");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const janela = iframe.contentWindow;
  if (!doc || !janela) {
    iframe.remove();
    throw new Error("Não foi possível preparar a impressão nesta janela.");
  }

  doc.open();
  doc.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>${titulo.replace(/[<>&]/g, "")}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #fff; color: #111827;
    font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.6;
  }
  h1, h2, h3 { color: #0f172a; margin: 0 0 8px; }
  p { margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
  ul, ol { margin: 0 0 10px 20px; }
  img { max-width: 100%; }
  a { color: #1d4ed8; word-break: break-word; }
  * { color: inherit !important; background: transparent !important; }
</style></head><body></body></html>`);
  doc.close();

  doc.body.appendChild(doc.importNode(elemento, true));

  await new Promise<void>((resolve) => {
    if (doc.readyState === "complete") resolve();
    else janela.addEventListener("load", () => resolve(), { once: true });
    setTimeout(resolve, 600);
  });

  try {
    janela.focus();
    janela.print();
  } finally {
    setTimeout(() => iframe.remove(), 1000);
  }
}
