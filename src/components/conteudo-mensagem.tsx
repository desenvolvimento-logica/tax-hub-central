import DOMPurify from "dompurify";
import { useMemo } from "react";

/** Renderiza o conteúdo da mensagem exatamente como no GOB (HTML sanitizado). */
export function ConteudoMensagem({
  html,
  id,
  className,
}: {
  html: string;
  id?: string;
  className?: string;
}) {
  const limpo = useMemo(() => {
    if (typeof window === "undefined") return "";
    return DOMPurify.sanitize(html, { FORBID_TAGS: ["script", "style", "iframe"] });
  }, [html]);

  if (!html.trim()) {
    return <p className="text-sm text-muted-foreground">Mensagem sem conteúdo no GOB.</p>;
  }

  return (
    <div
      id={id}
      className={`conteudo-gob text-sm leading-relaxed ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: limpo }}
    />
  );
}
