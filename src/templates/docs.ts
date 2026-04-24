export interface DocTemplate {
  id: string
  name: string
  icon: string
  description: string
  content: string
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'blank',
    name: 'Em branco',
    icon: '📄',
    description: 'Comece do zero',
    content: '',
  },
  {
    id: 'letter',
    name: 'Carta formal',
    icon: '✉️',
    description: 'Modelo de carta de apresentação',
    content: `
<p style="text-align: right"><strong>Cidade, DD de MMMM de AAAA</strong></p>
<p></p>
<p>Prezado(a) <strong>[Nome do destinatário]</strong>,</p>
<p></p>
<p>Escrevo para [objetivo da carta]. [Desenvolvimento do assunto em um ou dois parágrafos.]</p>
<p></p>
<p>Coloco-me à disposição para quaisquer esclarecimentos.</p>
<p></p>
<p>Atenciosamente,</p>
<p><strong>[Seu nome]</strong></p>
`.trim(),
  },
  {
    id: 'resume',
    name: 'Currículo',
    icon: '🧾',
    description: 'Estrutura básica de CV',
    content: `
<h1>Seu Nome Completo</h1>
<p><em>Cargo / Área de atuação</em> · email@exemplo.com · (00) 00000-0000 · Cidade, UF</p>
<h2>Resumo</h2>
<p>Descreva em 2–3 linhas sua experiência e o que você busca.</p>
<h2>Experiência</h2>
<p><strong>Cargo</strong> · Empresa · MM/AAAA – MM/AAAA</p>
<ul><li>Principal responsabilidade ou entrega.</li><li>Resultado mensurável.</li></ul>
<h2>Formação</h2>
<p><strong>Curso</strong> · Instituição · AAAA – AAAA</p>
<h2>Habilidades</h2>
<ul><li>Habilidade 1</li><li>Habilidade 2</li><li>Idioma</li></ul>
`.trim(),
  },
  {
    id: 'meeting',
    name: 'Ata de reunião',
    icon: '📋',
    description: 'Registro de pauta e decisões',
    content: `
<h1>Ata de Reunião</h1>
<p><strong>Data:</strong> DD/MM/AAAA &nbsp; <strong>Horário:</strong> HH:MM</p>
<p><strong>Participantes:</strong> Nome 1, Nome 2, Nome 3</p>
<h2>Pauta</h2>
<ol><li>Item 1</li><li>Item 2</li></ol>
<h2>Discussão</h2>
<p>Resumo dos pontos discutidos.</p>
<h2>Decisões</h2>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Ação 1 — responsável</p></li><li data-type="taskItem" data-checked="false"><p>Ação 2 — responsável</p></li></ul>
<h2>Próximos passos</h2>
<p>Próxima reunião: DD/MM/AAAA</p>
`.trim(),
  },
  {
    id: 'report',
    name: 'Relatório',
    icon: '📊',
    description: 'Relatório com seções padrão',
    content: `
<h1>Título do Relatório</h1>
<p><em>Autor · DD/MM/AAAA</em></p>
<h2>Sumário executivo</h2>
<p>Síntese de 3–5 linhas com os principais achados e recomendação.</p>
<h2>Contexto</h2>
<p>O que motivou este relatório.</p>
<h2>Análise</h2>
<p>Dados, gráficos e observações.</p>
<h2>Conclusões</h2>
<ul><li>Conclusão 1</li><li>Conclusão 2</li></ul>
<h2>Recomendações</h2>
<ol><li>Ação recomendada</li></ol>
`.trim(),
  },
  {
    id: 'article',
    name: 'Artigo',
    icon: '📝',
    description: 'Estrutura de artigo com intro e corpo',
    content: `
<h1>Título do Artigo</h1>
<p><em>Subtítulo ou resumo de uma linha</em></p>
<p>Parágrafo de abertura que apresenta o tema ao leitor.</p>
<h2>Primeiro ponto</h2>
<p>Desenvolvimento da ideia.</p>
<h2>Segundo ponto</h2>
<p>Continuação.</p>
<h2>Conclusão</h2>
<p>Encerramento e chamada para reflexão.</p>
`.trim(),
  },
]
