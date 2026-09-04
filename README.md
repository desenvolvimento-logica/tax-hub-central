# Tributary Hub

specificação Técnica — HUB do Departamento Tributário

Documento de briefing para desenvolvimento no Lovable

1. Objetivo

Criar um portal centralizador (HUB) que reúna o acesso a todos os sistemas do departamento tributário — hoje o PERDCOMP e o novo Acompanhamento de Mensagens e-CAC (GOB) —, com autenticação única, perfis de acesso compartilhados e identidade visual consistente entre os sistemas.

O HUB não substitui os sistemas individuais. Ele funciona como uma porta de entrada: autentica o usuário, mostra os sistemas disponíveis para o seu perfil e direciona (link/redirect) para cada aplicação, que continua sendo um projeto Lovable independente.

2. Arquitetura geral

┌─────────────────────────────────────────────┐
│              HUB (portal principal)          │
│  - Login único (Supabase Auth)                │
│  - Tela inicial com cards dos sistemas        │
│  - Gestão de usuários e perfis                │
└───────────────┬───────────────┬───────────────┘
                │               │
        ┌───────▼──────┐ ┌──────▼────────────┐
        │  PERDCOMP     │ │  e-CAC / GOB       │
        │ (já existe)   │ │  (novo sistema)    │
        └───────────────┘ └────────────────────┘
                │               │
        ┌───────▼───────────────▼───────────────┐
        │   Supabase compartilhado (mesmo projeto) │
        │   - auth.users                           │
        │   - usuarios / perfis / permissoes        │
        └───────────────────────────────────────────┘

Decisão-chave: todos os sistemas (HUB, PERDCOMP, e-CAC/GOB e futuros) devem apontar para o mesmo projeto Supabase, para que login, cadastro de colaboradores e permissões sejam únicos. Cada sistema pode ter suas próprias tabelas de negócio, mas compartilha as tabelas de autenticação/perfil.

Se o PERDCOMP já existe com um Supabase próprio, o primeiro passo prático é migrar (ou apontar) para esse Supabase compartilhado, ou then replicar nele apenas as tabelas de usuários/perfis via sincronização. Isso deve ser avaliado antes de iniciar o HUB.

3. Modelo de dados compartilhado (Supabase)

Tabela perfis

CampoTipoDescriçãoiduuid (PK)user_iduuid (FK → auth.users)nome_completotextemailtextcargotextEx: Analista, Coordenador, Gerenteativobooleancriado_emtimestamp

Tabela papeis (roles)

CampoTipoDescriçãoiduuid (PK)nometextEx: admin, coordenador, analistadescricaotext

Tabela perfil_papeis (N:N)

CampoTipoperfil_iduuid (FK)papel_iduuid (FK)

Tabela sistemas

CampoTipoDescriçãoiduuid (PK)nometextEx: "PERDCOMP", "e-CAC / GOB"descricaotexturltextLink do sistema (deploy do Lovable)iconetextNome/URL do íconeativobooleanordemintOrdem de exibição no HUB

Tabela sistema_papeis (controle de quem vê o quê)

CampoTipoDescriçãosistema_iduuid (FK)papel_iduuid (FK)Quais papéis podem acessar o sistema

4. Telas do HUB

4.1. Login

Autenticação via Supabase Auth (e-mail/senha; avaliar SSO corporativo se houver Google Workspace/Microsoft 365 no futuro).

Tela simples, com identidade visual da empresa.

4.2. Tela inicial (Dashboard de sistemas)

Grade de cards, um por sistema disponível para o perfil do usuário logado.

Cada card: ícone, nome do sistema, breve descrição, botão "Acessar" (abre em nova aba ou redireciona).

Se o usuário não tiver acesso a nenhum sistema, exibir mensagem orientando a contatar o administrador.

4.3. Administração (restrita a admin/coordenação)

CRUD de sistemas (nome, url, ícone, ativo/inativo, ordem).

CRUD de usuários/perfis (vincular papéis a cada colaborador).

CRUD de papéis e quais sistemas cada papel enxerga.

4.4. Perfil do usuário

Dados básicos, opção de trocar senha, visualização dos papéis atribuídos.

5. Identidade visual

Definir previamente (antes de gerar os prompts no Lovable):

Paleta de cores institucional (cor primária, secundária, tons neutros).

Logotipo do departamento/empresa.

Tipografia (ex: Inter, sugerida por padrão em projetos Lovable).

Esses tokens devem ser replicados manualmente em cada sistema (HUB, PERDCOMP, e-CAC/GOB) para dar sensação de produto único, já que são projetos Lovable separados.

6. Prompt sugerido para iniciar no Lovable

Crie um portal (HUB) para o departamento tributário de uma empresa de contabilidade.

Funcionalidades:
- Login com Supabase Auth (e-mail e senha)
- Após login, exibir uma tela inicial com cards dos sistemas disponíveis para o
  usuário, cada card com ícone, nome, descrição e botão "Acessar" que abre a URL
  do sistema em nova aba
- Área administrativa (visível apenas para usuários com papel "admin" ou
  "coordenador"):
  - Cadastro de sistemas (nome, descrição, url, ícone, ativo, ordem de exibição)
  - Cadastro de usuários e atribuição de papéis (admin, coordenador, analista)
  - Definição de quais papéis podem ver quais sistemas
- Tela de perfil do usuário logado, com opção de troca de senha

Modelo de dados (Supabase):
- perfis (vinculado a auth.users): nome_completo, email, cargo, ativo
- papeis: nome, descricao
- perfil_papeis: relação N:N entre perfis e papeis
- sistemas: nome, descricao, url, icone, ativo, ordem
- sistema_papeis: relação N:N entre sistemas e papeis (controle de visibilidade)

Design: interface limpa, corporativa, com [cores institucionais], usando cards
para a listagem de sistemas e um menu lateral para a área administrativa.

7. Roadmap sugerido de implantação

Definir/consolidar o Supabase compartilhado (auth + perfis + papéis).

Construir o HUB com login, dashboard de cards e administração básica.

Cadastrar o PERDCOMP como o primeiro "sistema" no HUB (apenas link, sem alterar o PERDCOMP em si inicialmente).

Desenvolver o sistema e-CAC/GOB (ver documento em separado) já usando o mesmo Supabase de autenticação.

Cadastrar o e-CAC/GOB como segundo sistema no HUB.

Padronizar visualmente PERDCOMP e e-CAC/GOB conforme os tokens definidos na seção 5 (pode ser feito de forma incremental, sem bloquear o uso).

Especificação Técnica — Sistema de Acompanhamento de Mensagens e-CAC (via API GOB)

Documento de briefing para desenvolvimento no Lovable

1. Objetivo

Criar um sistema que consuma a API do GOB (que já busca as mensagens recebidas via e-CAC) e permita ao departamento tributário:

Visualizar a lista de mensagens recebidas e seu conteúdo completo.

Distinguir a leitura automática feita pelo GOB da visualização humana feita por um colaborador, registrando quem e quando visualizou.

Registrar a ação de tratamento dada a cada mensagem (enviado ao cliente, enviado para análise/coordenação, comunicado, ou declaração), com histórico.

2. Integração com a API do GOB

Antes de iniciar o desenvolvimento, é necessário ter em mãos: endpoint da API, método de autenticação (token/chave), formato de resposta (JSON esperado) e frequência de atualização (polling periódico vs. webhook). Isso deve ser confirmado com quem mantém o sistema GOB.

Modelo sugerido de sincronização:

Uma rotina (Edge Function no Supabase, executada periodicamente) busca as mensagens novas na API do GOB e grava/atualiza na tabela mensagens local.

Campos mínimos esperados da API: protocolo, CNPJ do contribuinte, órgão de origem, assunto, data de recebimento, conteúdo/corpo da mensagem, indicador de leitura pelo GOB e data dessa leitura.

3. Modelo de dados (Supabase)

Tabela mensagens

CampoTipoDescriçãoiduuid (PK)protocolotextIdentificador único da mensagem no e-CACcnpj_contribuintetextnome_contribuintetextorgaotextEx: Receita Federal, PGFNassuntotextconteudotextCorpo/texto integral da mensagemdata_recebimentotimestampleitura_gobbooleanIndicador vindo da API (leitura automática)data_leitura_gobtimestampstatus_geraltextnova / visualizada / em_tratamento / concluidacriado_emtimestampatualizado_emtimestamp

Tabela visualizacoes

CampoTipoDescriçãoiduuid (PK)mensagem_iduuid (FK → mensagens)colaborador_iduuid (FK → perfis, do Supabase compartilhado do HUB)data_visualizacaotimestamp

Cada abertura de mensagem por um colaborador gera um registro aqui. Se quiser guardar apenas a "primeira" visualização humana, pode-se aplicar uma constraint de unicidade (mensagem_id, colaborador_id) ou simplesmente manter todas e exibir a primeira/última na tela.

Tabela acoes

CampoTipoDescriçãoiduuid (PK)mensagem_iduuid (FK → mensagens)colaborador_iduuid (FK → perfis)tipo_acaotextenviado_cliente / enviado_analise / comunicado / declaracaosub_tipotextemail / acessorias (preenchido só quando tipo_acao = enviado_cliente)observacaotextCampo livre, opcionaldata_acaotimestamp

4. Regras de negócio

Leitura GOB vs. visualização humana são independentes. A tela deve sempre exibir os dois indicadores lado a lado, nunca fundir os dois conceitos em um único status de "lida".

Ao abrir a mensagem pela primeira vez, o sistema grava automaticamente um registro em visualizacoes com o colaborador logado e a data/hora atual — sem exigir ação manual do colaborador para "marcar como visualizada".

O status status_geral da mensagem muda conforme o fluxo:

nova: acabou de chegar da API, nenhum colaborador visualizou ainda.

visualizada: ao menos um colaborador abriu a mensagem, mas nenhuma ação foi registrada.

em_tratamento: uma ação do tipo enviado_analise foi registrada (aguarda retorno).

concluida: uma ação do tipo enviado_cliente, comunicado ou declaracao foi registrada (ações consideradas terminais — mas isso deve ser validado com o time, pois pode haver caso de reabertura).

Uma mensagem pode receber mais de uma ação ao longo do tempo (histórico completo, nunca sobrescrever).

O campo sub_tipo só é exibido/obrigatório quando tipo_acao = enviado_cliente.

5. Telas do sistema

5.1. Lista de mensagens (dashboard principal)

Colunas sugeridas: protocolo, contribuinte, órgão, assunto, data de recebimento, status, indicador "visualizada por humano" (ícone/cor), responsável (se já houver ação).

Filtros:

Por status (nova / visualizada / em tratamento / concluída)

Por órgão

Por período de recebimento

Por colaborador responsável

Visualizada por humano: sim/não (para a coordenação identificar mensagens que o GOB marcou como lidas, mas que nenhum colaborador de fato abriu)

5.2. Detalhe da mensagem

Cabeçalho: protocolo, contribuinte (nome + CNPJ), órgão, data de recebimento.

Bloco de indicadores de leitura:

"Lida pelo GOB em [data]" (ou "não lida pelo GOB")

"Visualizada por [nome do colaborador] em [data]" — se ainda não houve visualização humana, exibir em destaque (ex: badge de alerta) "Ainda não visualizada por um colaborador".

Conteúdo completo da mensagem.

Campo de ação (formulário):

Seletor: Enviado ao cliente | Enviado para análise/coordenação | Comunicado | Declaração

Se "Enviado ao cliente": sub-seletor E-mail | Acessórias

Campo de observação (opcional)

Botão "Registrar ação"

Histórico de ações já tomadas na mensagem (lista cronológica com colaborador, data, tipo de ação e observação).

5.3. Painel gerencial (para coordenação)

Indicadores: total de mensagens novas, pendentes de visualização humana, em tratamento, concluídas.

Ranking por colaborador (quantidade de mensagens visualizadas/tratadas).

Filtro por período.

6. Prompt sugerido para iniciar no Lovable

Crie um sistema de acompanhamento de mensagens recebidas via e-CAC (integração com
API do sistema GOB), para o departamento tributário de uma empresa de contabilidade.

Modelo de dados (Supabase):
- mensagens: protocolo, cnpj_contribuinte, nome_contribuinte, orgao, assunto,
  conteudo, data_recebimento, leitura_gob (boolean), data_leitura_gob, status_geral
  (nova/visualizada/em_tratamento/concluida)
- visualizacoes: mensagem_id, colaborador_id, data_visualizacao
- acoes: mensagem_id, colaborador_id, tipo_acao
  (enviado_cliente/enviado_analise/comunicado/declaracao), sub_tipo
  (email/acessorias, só quando tipo_acao=enviado_cliente), observacao, data_acao

Funcionalidades:
1. Tela de listagem de mensagens em formato de tabela, com filtros por status,
   órgão, período, colaborador responsável e se já foi visualizada por um humano
   ou não. Cada linha mostra protocolo, contribuinte, órgão, assunto, data de
   recebimento e status.
2. Ao clicar em uma mensagem, abrir tela de detalhe que:
   - Registra automaticamente uma visualização (colaborador logado + data/hora)
     na primeira vez que a mensagem é aberta por aquele usuário
   - Exibe lado a lado: indicador de leitura automática pelo GOB (com data) e
     indicador de visualização humana (nome do colaborador e data, ou aviso
     em destaque caso ainda não tenha sido visualizada por ninguém)
   - Exibe o conteúdo completo da mensagem
   - Exibe um formulário de ação com as opções: "Enviado ao cliente" (com
     sub-opções E-mail / Acessórias), "Enviado para análise/coordenação",
     "Comunicado", "Declaração", mais um campo de observação opcional
   - Exibe o histórico de todas as ações já registradas para aquela mensagem
3. Um painel gerencial com indicadores agregados: quantidade de mensagens por
   status, mensagens pendentes de visualização humana, e volume tratado por
   colaborador.

Autenticação: usar Supabase Auth, reaproveitando a tabela de perfis de usuário
já existente (perfis, vinculada a auth.users) de um projeto compartilhado.

Design: interface limpa, corporativa, tabela como visão principal e uso de
badges/cores para status e alertas de visualização pendente.

7. Pontos a validar antes de iniciar o desenvolvimento

 Documentação da API do GOB (endpoint, autenticação, formato de dados, paginação).

 Frequência ideal de sincronização (tempo real via webhook, ou polling a cada X minutos).

 Confirmar regra de status "concluída" para as ações — é realmente terminal, ou pode haver reabertura de uma mensagem já tratada?

 Confirmar se visualizacoes deve permitir múltiplos registros por colaborador (reabertura da mensagem) ou apenas o primeiro.

 Definir quem terá acesso ao painel gerencial (todos ou só coordenação).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tax-hub-central.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7e3393c-76cd-4857-92e0-d7b7d81ee65a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
