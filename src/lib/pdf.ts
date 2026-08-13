/** Geração de PDF no navegador a partir de um bloco HTML. */

export async function baixarHtmlComoPdf(elemento: HTMLElement, nomeArquivo: string) {
  const { default: html2pdf } = (await import("html2pdf.js")) as unknown as {
    default: (
      ...args: unknown[]
    ) => {
      set: (o: unknown) => { from: (e: HTMLElement) => { save: () => Promise<void> } };
    };
  };

  // Renderiza em um clone claro (fundo branco/texto escuro) para o PDF ficar legível.
  const palco = document.createElement("div");
  palco.style.cssText =
    "position:fixed;left:-10000px;top:0;width:760px;background:#ffffff;color:#111827;" +
    "font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;padding:8px;";
  const clone = elemento.cloneNode(true) as HTMLElement;
  clone.style.color = "#111827";
  clone.style.background = "#ffffff";
  palco.appendChild(clone);
  document.body.appendChild(palco);

  try {
    await html2pdf()
      .set({
        margin: 12,
        filename: nomeArquivo,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(palco)
      .save();
  } finally {
    palco.remove();
  }
}
