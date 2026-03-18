from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from typing import Literal

from .config import get_llm, get_embeddings, get_settings

def get_vectorstore():
    from langchain_chroma import Chroma
    settings = get_settings()
    embeddings = get_embeddings()
    return Chroma(
        persist_directory=settings.CHROMA_PERSIST_DIRECTORY,
        embedding_function=embeddings
    )

def get_retriever():
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(search_kwargs={"k": 7})

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

SUMMARY_LEVELS = ("BEGINNER", "INTERMEDIATE", "ADVANCED")

LEVEL_INSTRUCTIONS = {
    "BEGINNER": (
        "Explique para iniciantes absolutos. Evite jargoes quando possivel, "
        "defina termos tecnicos quando inevitaveis e use analogias simples."
    ),
    "INTERMEDIATE": (
        "Explique para leitores com base tecnica inicial. Pode usar termos da area, "
        "mas contextualize rapidamente conceitos mais especificos."
    ),
    "ADVANCED": (
        "Explique para leitores avancados. Mantenha alto rigor tecnico, inclua "
        "detalhes metodologicos e nuances de limitacoes/validade."
    ),
}

FINAL_PROMPT_TEMPLATE = """Voce e um comunicador cientifico especialista.

Sua tarefa e resumir o texto de um artigo cientifico em PORTUGUES DO BRASIL (pt-BR),
com tom claro e fiel ao conteudo original.

Nivel de explicacao alvo: {level}
Instrucao de nivel: {level_instructions}

Regras obrigatorias:
- Responda somente em portugues do Brasil.
- Nao invente resultados ou metricas que nao estejam no texto.
- Seja didatico, objetivo e mantenha precisao cientifica.

Estrutura da resposta (markdown):

# Titulo e Visao Geral
Crie um titulo claro e um resumo executivo curto.

## 1. Contexto e Problema
- Qual e o contexto do estudo?
- Qual problema os autores tentam resolver?
- Por que isso importa?

## 2. Metodologia
- Como o problema foi abordado?
- Quais tecnicas, experimentos ou estrategias foram usados?

## 3. Principais Resultados
- Quais foram os achados centrais?
- Cite evidencias relevantes presentes no texto.

## 4. Conclusoes e Implicacoes
- O que esses resultados significam?
- Quais impactos ou aplicacoes praticas sao sugeridos?

Texto para processar:
{context}

Resposta (em markdown, pt-BR):"""

def query_rag(query: str = "Provide a comprehensive summary of this research paper") -> str:
    llm = get_llm()
    retriever = get_retriever()
    
    prompt = ChatPromptTemplate.from_template(FINAL_PROMPT_TEMPLATE)
    
    rag_chain = (
        {
            "context": retriever | format_docs,
            "query": RunnablePassthrough(),
            "level": lambda _: "INTERMEDIATE",
            "level_instructions": lambda _: LEVEL_INSTRUCTIONS["INTERMEDIATE"],
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain.invoke(query)

def translate_text(text: str, level: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"]) -> str:
    """
    Generate a level-specific summary in pt-BR directly from article text.
    """
    if level not in SUMMARY_LEVELS:
        raise ValueError(f"Nivel de resumo invalido: {level}")

    llm = get_llm()
    prompt = ChatPromptTemplate.from_template(FINAL_PROMPT_TEMPLATE)
    
    chain = (
        {
            "context": lambda x: x,
            "level": lambda _: level,
            "level_instructions": lambda _: LEVEL_INSTRUCTIONS[level],
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return chain.invoke(text)