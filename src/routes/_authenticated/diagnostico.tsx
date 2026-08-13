import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { FileUp, Loader2, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSessao, formatarData } from "@/lib/hub";
import {
  AMBITOS,
  AVISO_ESTADUAL,
  AVISO_IPVA,
  AVISO_SINDICAL,
  MENSAGEM_FINAL_PADRAO,
  MENSAGEM_INICIAL_PADRAO,
  SITUACAO_AMBITO_LABEL,
  SITUACAO_DEBITO_LABEL,
  dadosVazios,
  debitoVazio,
  declaracaoVazia,
  moeda,
  pendenciasObrigatorias,
  temDebitoEstadual,
  temIpva,
  totalAmbito,
  totalGeral,
  tudoRegular,
  type Ambito,
  type AmbitoChave,
  type DadosDiagnostico,
  type SituacaoAmbito,
  type SituacaoDebito,
} from "@/lib/diagnostico";
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
import capa from "@/assets/capa-fiscal.jpg";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico Fiscal — HUB Tributário" },
      {
        name: "description",
        content:
          "Anexe relatórios de débito e certidões municipais, estaduais e federais e gere o relatório de diagnóstico fiscal do cliente.",
      },
      { property: "og:title", content: "Diagnóstico Fiscal — HUB Tributário" },
      {
        property: "og:description",
        content: "Levantamento de débitos e geração do relatório de diagnóstico fiscal ao cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiagnosticoPagina;
});

function DiagnosticoPagina() {
  return null;
}
