/** Geração de PDF no navegador a partir de um bloco HTML. */

export async function baixarHtmlComoPdf(elemento: HTMLElement, nomeArquivo: string) {
  const { default: html2pdf } = (await import("html2pdf.js")) as unknown as {
    default: (
      ...args: unknown[]
    ) => {
      set: (o: unknown) => { from: (e: HTMLElement) => { save: () => Promise<void> } };
    };
  };

  await html2pdf()
    .set({
      margin: 12,
      filename: nomeArquivo,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(elemento)
    .save();
}
