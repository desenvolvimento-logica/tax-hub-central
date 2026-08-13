export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      acoes: {
        Row: {
          colaborador_id: string
          data_acao: string
          id: string
          mensagem_id: string
          observacao: string | null
          sub_tipo: string | null
          tipo_acao: string
        }
        Insert: {
          colaborador_id: string
          data_acao?: string
          id?: string
          mensagem_id: string
          observacao?: string | null
          sub_tipo?: string | null
          tipo_acao: string
        }
        Update: {
          colaborador_id?: string
          data_acao?: string
          id?: string
          mensagem_id?: string
          observacao?: string | null
          sub_tipo?: string | null
          tipo_acao?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      acompanhamentos: {
        Row: {
          aviso_pagamento: boolean
          aviso_pagamento_data: string | null
          aviso_pagamento_prazo: string | null
          compensacao_oficio: boolean
          compensacao_oficio_opcao: string
          compensacao_oficio_prazo: string | null
          declaracao_id: string
          encerrado: boolean
          encerrado_em: string | null
          intimacao: boolean
          intimacao_prazo: string | null
          observacao: string
          ordem_servico: string
          pagamento_confirmado: boolean
          pagamento_confirmado_em: string | null
          responsavel_id: string | null
          terceiro: boolean
          updated_at: string
        }
        Insert: {
          aviso_pagamento?: boolean
          aviso_pagamento_data?: string | null
          aviso_pagamento_prazo?: string | null
          compensacao_oficio?: boolean
          compensacao_oficio_opcao?: string
          compensacao_oficio_prazo?: string | null
          declaracao_id: string
          encerrado?: boolean
          encerrado_em?: string | null
          intimacao?: boolean
          intimacao_prazo?: string | null
          observacao?: string
          ordem_servico?: string
          pagamento_confirmado?: boolean
          pagamento_confirmado_em?: string | null
          responsavel_id?: string | null
          terceiro?: boolean
          updated_at?: string
        }
        Update: {
          aviso_pagamento?: boolean
          aviso_pagamento_data?: string | null
          aviso_pagamento_prazo?: string | null
          compensacao_oficio?: boolean
          compensacao_oficio_opcao?: string
          compensacao_oficio_prazo?: string | null
          declaracao_id?: string
          encerrado?: boolean
          encerrado_em?: string | null
          intimacao?: boolean
          intimacao_prazo?: string | null
          observacao?: string
          ordem_servico?: string
          pagamento_confirmado?: boolean
          pagamento_confirmado_em?: string | null
          responsavel_id?: string | null
          terceiro?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acompanhamentos_declaracao_id_fkey"
            columns: ["declaracao_id"]
            isOneToOne: true
            referencedRelation: "declaracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acompanhamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          criado_em: string
          declaracao_id: string
          id: string
          mensagem: string
          prioridade: string
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string
          declaracao_id: string
          id?: string
          mensagem: string
          prioridade?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo: string
        }
        Update: {
          criado_em?: string
          declaracao_id?: string
          id?: string
          mensagem?: string
          prioridade?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_declaracao_id_fkey"
            columns: ["declaracao_id"]
            isOneToOne: false
            referencedRelation: "declaracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_achados: {
        Row: {
          codigo: string
          criado_em: string
          declaracao_id: string
          descricao: string
          id: string
          revisado: boolean
          revisado_em: string | null
          revisado_por: string | null
          severidade: string
        }
        Insert: {
          codigo: string
          criado_em?: string
          declaracao_id: string
          descricao: string
          id?: string
          revisado?: boolean
          revisado_em?: string | null
          revisado_por?: string | null
          severidade?: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          declaracao_id?: string
          descricao?: string
          id?: string
          revisado?: boolean
          revisado_em?: string | null
          revisado_por?: string | null
          severidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_achados_declaracao_id_fkey"
            columns: ["declaracao_id"]
            isOneToOne: false
            referencedRelation: "declaracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_achados_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      declaracoes: {
        Row: {
          ajuda_situacao: string | null
          arquivo_documento_id: string | null
          arquivo_documento_nome: string | null
          arquivo_recibo_id: string | null
          arquivo_recibo_nome: string | null
          cnpj: string | null
          codigo_receita: string | null
          credito_atualizado: number | null
          dados: Json
          data_transmissao: string | null
          gob_id: string
          grupo_tributo: string | null
          id: string
          nome: string | null
          numero_perdcomp: string | null
          numero_recibo: string | null
          periodo_apuracao: string | null
          primeira_sincronizacao: string
          processo_administrativo: string | null
          processo_habilitacao: string | null
          processo_judicial: string | null
          razao_social: string | null
          responsavel_cpf: string | null
          responsavel_crc: string | null
          responsavel_email: string | null
          responsavel_extraido_em: string | null
          responsavel_nome: string | null
          saldo_credito_original: number | null
          saldo_restante: number | null
          situacao: string | null
          tipo_credito: string | null
          tipo_documento: string | null
          total_debitos: number | null
          ultima_sincronizacao: string
          ultimo_registro: boolean
          updated_at: string
          valor_total_credito: number | null
          valor_utilizado: number | null
        }
        Insert: {
          ajuda_situacao?: string | null
          arquivo_documento_id?: string | null
          arquivo_documento_nome?: string | null
          arquivo_recibo_id?: string | null
          arquivo_recibo_nome?: string | null
          cnpj?: string | null
          codigo_receita?: string | null
          credito_atualizado?: number | null
          dados?: Json
          data_transmissao?: string | null
          gob_id: string
          grupo_tributo?: string | null
          id?: string
          nome?: string | null
          numero_perdcomp?: string | null
          numero_recibo?: string | null
          periodo_apuracao?: string | null
          primeira_sincronizacao?: string
          processo_administrativo?: string | null
          processo_habilitacao?: string | null
          processo_judicial?: string | null
          razao_social?: string | null
          responsavel_cpf?: string | null
          responsavel_crc?: string | null
          responsavel_email?: string | null
          responsavel_extraido_em?: string | null
          responsavel_nome?: string | null
          saldo_credito_original?: number | null
          saldo_restante?: number | null
          situacao?: string | null
          tipo_credito?: string | null
          tipo_documento?: string | null
          total_debitos?: number | null
          ultima_sincronizacao?: string
          ultimo_registro?: boolean
          updated_at?: string
          valor_total_credito?: number | null
          valor_utilizado?: number | null
        }
        Update: {
          ajuda_situacao?: string | null
          arquivo_documento_id?: string | null
          arquivo_documento_nome?: string | null
          arquivo_recibo_id?: string | null
          arquivo_recibo_nome?: string | null
          cnpj?: string | null
          codigo_receita?: string | null
          credito_atualizado?: number | null
          dados?: Json
          data_transmissao?: string | null
          gob_id?: string
          grupo_tributo?: string | null
          id?: string
          nome?: string | null
          numero_perdcomp?: string | null
          numero_recibo?: string | null
          periodo_apuracao?: string | null
          primeira_sincronizacao?: string
          processo_administrativo?: string | null
          processo_habilitacao?: string | null
          processo_judicial?: string | null
          razao_social?: string | null
          responsavel_cpf?: string | null
          responsavel_crc?: string | null
          responsavel_email?: string | null
          responsavel_extraido_em?: string | null
          responsavel_nome?: string | null
          saldo_credito_original?: number | null
          saldo_restante?: number | null
          situacao?: string | null
          tipo_credito?: string | null
          tipo_documento?: string | null
          total_debitos?: number | null
          ultima_sincronizacao?: string
          ultimo_registro?: boolean
          updated_at?: string
          valor_total_credito?: number | null
          valor_utilizado?: number | null
        }
        Relationships: []
      }
      diagnosticos: {
        Row: {
          atualizado_em: string
          cnpj: string | null
          concluido_em: string | null
          criado_em: string
          dados: Json
          data_levantamento: string
          empresa: string
          id: string
          observacoes: string | null
          perfil_id: string
          responsavel: string | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          cnpj?: string | null
          concluido_em?: string | null
          criado_em?: string
          dados?: Json
          data_levantamento?: string
          empresa: string
          id?: string
          observacoes?: string | null
          perfil_id: string
          responsavel?: string | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          cnpj?: string | null
          concluido_em?: string | null
          criado_em?: string
          dados?: Json
          data_levantamento?: string
          empresa?: string
          id?: string
          observacoes?: string | null
          perfil_id?: string
          responsavel?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosticos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      log_alteracoes: {
        Row: {
          campo: string
          criado_em: string
          declaracao_id: string | null
          id: string
          usuario_id: string | null
          usuario_nome: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          criado_em?: string
          declaracao_id?: string | null
          id?: string
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          criado_em?: string
          declaracao_id?: string | null
          id?: string
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_alteracoes_declaracao_id_fkey"
            columns: ["declaracao_id"]
            isOneToOne: false
            referencedRelation: "declaracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_alteracoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          arquivada: boolean
          assunto: string
          ativo: boolean
          atualizado_em: string
          cnpj_contribuinte: string
          conteudo: string
          criado_em: string
          data_leitura_gob: string | null
          data_recebimento: string
          exibicao_ate: string | null
          gob_id: string | null
          id: string
          importante: boolean
          leitor_gob: string | null
          leitura_gob: boolean
          ni: string | null
          nome_contribuinte: string
          organizacao: string | null
          orgao: string
          primeira_leitura_gob: string | null
          protocolo: string
          remetente: string | null
          status_geral: string
          tag: string | null
          tipo: string | null
          triagem: string
        }
        Insert: {
          arquivada?: boolean
          assunto: string
          ativo?: boolean
          atualizado_em?: string
          cnpj_contribuinte: string
          conteudo?: string
          criado_em?: string
          data_leitura_gob?: string | null
          data_recebimento?: string
          exibicao_ate?: string | null
          gob_id?: string | null
          id?: string
          importante?: boolean
          leitor_gob?: string | null
          leitura_gob?: boolean
          ni?: string | null
          nome_contribuinte: string
          organizacao?: string | null
          orgao: string
          primeira_leitura_gob?: string | null
          protocolo: string
          remetente?: string | null
          status_geral?: string
          tag?: string | null
          tipo?: string | null
          triagem?: string
        }
        Update: {
          arquivada?: boolean
          assunto?: string
          ativo?: boolean
          atualizado_em?: string
          cnpj_contribuinte?: string
          conteudo?: string
          criado_em?: string
          data_leitura_gob?: string | null
          data_recebimento?: string
          exibicao_ate?: string | null
          gob_id?: string | null
          id?: string
          importante?: boolean
          leitor_gob?: string | null
          leitura_gob?: boolean
          ni?: string | null
          nome_contribuinte?: string
          organizacao?: string | null
          orgao?: string
          primeira_leitura_gob?: string | null
          protocolo?: string
          remetente?: string | null
          status_geral?: string
          tag?: string | null
          tipo?: string | null
          triagem?: string
        }
        Relationships: []
      }
      papeis: {
        Row: {
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      perfil_papeis: {
        Row: {
          papel_id: string
          perfil_id: string
        }
        Insert: {
          papel_id: string
          perfil_id: string
        }
        Update: {
          papel_id?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_papeis_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_papeis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          cargo: string | null
          criado_em: string
          email: string
          id: string
          nome_completo: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          criado_em?: string
          email?: string
          id?: string
          nome_completo?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          criado_em?: string
          email?: string
          id?: string
          nome_completo?: string
          user_id?: string
        }
        Relationships: []
      }
      sincronizacoes_gob: {
        Row: {
          atualizadas: number
          concluido_em: string | null
          criado_em: string
          erro: string | null
          id: string
          iniciado_em: string
          novas: number
          situacao: string
        }
        Insert: {
          atualizadas?: number
          concluido_em?: string | null
          criado_em?: string
          erro?: string | null
          id?: string
          iniciado_em?: string
          novas?: number
          situacao?: string
        }
        Update: {
          atualizadas?: number
          concluido_em?: string | null
          criado_em?: string
          erro?: string | null
          id?: string
          iniciado_em?: string
          novas?: number
          situacao?: string
        }
        Relationships: []
      }
      sistema_papeis: {
        Row: {
          papel_id: string
          sistema_id: string
        }
        Insert: {
          papel_id: string
          sistema_id: string
        }
        Update: {
          papel_id?: string
          sistema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistema_papeis_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sistema_papeis_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas"
            referencedColumns: ["id"]
          },
        ]
      }
      sistemas: {
        Row: {
          ativo: boolean
          criado_em: string
          descricao: string | null
          icone: string
          id: string
          nome: string
          ordem: number
          url: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          icone?: string
          id?: string
          nome: string
          ordem?: number
          url: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          url?: string
        }
        Relationships: []
      }
      status_historico: {
        Row: {
          declaracao_id: string
          id: string
          registrado_em: string
          situacao_anterior: string | null
          situacao_nova: string
        }
        Insert: {
          declaracao_id: string
          id?: string
          registrado_em?: string
          situacao_anterior?: string | null
          situacao_nova: string
        }
        Update: {
          declaracao_id?: string
          id?: string
          registrado_em?: string
          situacao_anterior?: string | null
          situacao_nova?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_historico_declaracao_id_fkey"
            columns: ["declaracao_id"]
            isOneToOne: false
            referencedRelation: "declaracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      visualizacoes: {
        Row: {
          colaborador_id: string
          data_visualizacao: string
          id: string
          mensagem_id: string
        }
        Insert: {
          colaborador_id: string
          data_visualizacao?: string
          id?: string
          mensagem_id: string
        }
        Update: {
          colaborador_id?: string
          data_visualizacao?: string
          id?: string
          mensagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visualizacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visualizacoes_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_primeiro_admin: { Args: never; Returns: boolean }
      e_colaborador: { Args: { _user_id: string }; Returns: boolean }
      e_gestor: { Args: { _user_id: string }; Returns: boolean }
      meu_perfil_id: { Args: never; Returns: string }
      tem_papel: { Args: { _nome: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
