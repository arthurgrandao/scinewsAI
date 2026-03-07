-- Inserir artigos de exemplo
INSERT INTO articles (id, title, authors, publicationDate, abstract, keywords, sourceUrl, processingStatus, simplifiedText) VALUES
    ('arxiv-2401-00001', 
     'Atenção é Tudo que Você Precisa: Uma Revisão Abrangente das Arquiteturas Transformer',
     ARRAY['Maria Santos', 'John Chen', 'Ahmed Hassan'],
     '2024-01-15',
     'Este artigo fornece uma revisão abrangente das arquiteturas transformer e sua evolução desde o artigo original "Attention Is All You Need". Analisamos os componentes-chave que tornam os transformers eficazes e discutimos avanços recentes em mecanismos de atenção eficientes.',
     ARRAY['transformers', 'atenção', 'aprendizado profundo', 'redes neurais'],
     'https://arxiv.org/abs/2401.00001',
     'translated',
     '## Sobre o que é este artigo?

Este artigo analisa profundamente as **arquiteturas transformer** — a tecnologia por trás de sistemas modernos de IA como ChatGPT e BERT.

## A Inovação Principal: Atenção

A ideia principal por trás dos transformers é algo chamado **atenção**. Imagine ler uma frase e entender a que "ele" se refere anteriormente no texto. Os transformers fazem isso automaticamente e de forma muito eficiente.

## Por que Isso Importa?

Antes dos transformers, os sistemas de IA processavam texto palavra por palavra. Os transformers podem olhar para frases inteiras de uma só vez, entendendo relações entre todas as palavras simultaneamente.

## Principais Descobertas

1. **Eficiência**: Modelos transformer mais novos estão ficando mais rápidos
2. **Escalabilidade**: Funcionam bem para frases únicas ou milhões de documentos
3. **Versatilidade**: A mesma arquitetura funciona para texto, imagens e música'),
    
    ('arxiv-2401-00002',
     'Aprendizado Federado em Escala: Aprendizado de Máquina com Preservação de Privacidade para Saúde',
     ARRAY['Elena Rodriguez', 'Michael Zhang', 'Sarah Johnson'],
     '2024-01-18',
     'Apresentamos uma nova abordagem para aprendizado federado que permite que múltiplas instituições de saúde treinem colaborativamente modelos de aprendizado de máquina sem compartilhar dados sensíveis de pacientes.',
     ARRAY['aprendizado federado', 'privacidade', 'saúde', 'aprendizado de máquina'],
     'https://arxiv.org/abs/2401.00002',
     'translated',
     '## Sobre o que é este artigo?

Esta pesquisa introduz uma nova forma de treinar sistemas de IA em saúde mantendo os dados dos pacientes completamente privados através do **aprendizado federado**.

## O Problema

Hospitais possuem dados médicos valiosos que poderiam ajudar a treinar IA, mas compartilhar dados de pacientes levanta sérias preocupações de privacidade.

## A Solução

Em vez de trazer todos os dados para um único lugar, esta abordagem leva o treinamento de IA para onde os dados já estão:

1. Cada hospital treina um modelo local de IA com seus próprios dados
2. Apenas os padrões aprendidos (não os dados reais) são compartilhados
3. Esses padrões são combinados para criar um modelo global

## Principais Benefícios

- **Privacidade**: Dados dos pacientes nunca saem do hospital
- **Conformidade**: Atende às regulamentações de privacidade em saúde
- **Precisão**: O modelo combinado é tão bom quanto se todos os dados fossem compartilhados')
ON CONFLICT (id) DO NOTHING;
