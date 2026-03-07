-- SciNewsAI Database Initialization

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profile type enum
CREATE TYPE USERS_profileType AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'beginner', 'intermediate', 'advanced');

-- Users table
CREATE TABLE IF NOT EXISTS USERS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profileType USERS_profileType DEFAULT 'BEGINNER',
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics table
CREATE TABLE IF NOT EXISTS TOPICS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

-- Articles table (matches user's schema)
CREATE TABLE IF NOT EXISTS ARTICLES (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT[],
    publicationDate DATE,
    abstract TEXT,
    keywords TEXT[],
    `fullText` TEXT,
    sourceUrl TEXT,
    originalPdfPath TEXT,
    processingStatus VARCHAR(50) DEFAULT 'pending',
    simplifiedText TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    relevanceScore FLOAT DEFAULT 0.0
);


-- Subscriptions table (user-topic relationship)
CREATE TABLE IF NOT EXISTS subscribes (
    idUser UUID NOT NULL REFERENCES USERS(id) ON DELETE CASCADE,
    idTopic UUID NOT NULL REFERENCES TOPICS(id) ON DELETE CASCADE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (idUser, idTopic)
);


-- Likes table (user-article relationship for likes)
CREATE TABLE IF NOT EXISTS likes (
    idUser UUID NOT NULL REFERENCES USERS(id) ON DELETE CASCADE,
    idArticle TEXT NOT NULL REFERENCES ARTICLES(id) ON DELETE CASCADE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (idUser, idArticle)
);


CREATE INDEX USERS_email_IDX ON USERS(email);
CREATE INDEX TOPICS_slug_IDX ON TOPICS(slug);
CREATE INDEX ARTICLES_status_IDX ON ARTICLES(processingStatus);
CREATE INDEX ARTICLES_publicationDate_IDX ON ARTICLES(publicationDate DESC);
CREATE INDEX subscribes_idUser_IDX ON subscribes(idUser);
CREATE INDEX subscribes_idTopic_IDX ON subscribes(idTopic);
CREATE INDEX likes_idUser_IDX ON likes(idUser);
CREATE INDEX likes_idArticle_IDX ON likes(idArticle);
CREATE INDEX likes_createdAt_IDX ON likes(createdAt DESC);


-- Trigger para a tabela USERS
CREATE TRIGGER update_USERS_updatedAt
    BEFORE UPDATE ON USERS
    FOR EACH ROW
    BEGIN
        NEW.updatedAt = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';


-- Standard Topics
INSERT INTO TOPICS (name, slug, description) VALUES
    ('Inteligência Artificial', 'inteligencia-artificial', 'IA, sistemas inteligentes, raciocínio automático e aplicações'),
    ('Arquitetura de Hardware', 'arquitetura-de-hardware', 'Arquitetura de processadores, microarquitetura e sistemas embarcados'),
    ('Complexidade Computacional', 'complexidade-computacional', 'Teoria da complexidade, classes de complexidade e problemas intratáveis'),
    ('Engenharia Computacional, Financeira e Científica', 'engenharia-computacional-financeira-e-cientifica', 'Modelagem numérica, simulação e aplicações em finanças e ciências'),
    ('Geometria Computacional', 'geometria-computacional', 'Algoritmos para problemas geométricos, estruturas e aplicações'),
    ('Computação e Linguagem', 'computacao-e-linguagem', 'Processamento de linguagem natural, semântica e linguística computacional'),
    ('Criptografia e Segurança', 'criptografia-e-seguranca', 'Criptografia, segurança de redes, privacidade e proteção de dados'),
    ('Visão Computacional e Reconhecimento de Padrões', 'visao-computacional-e-reconhecimento-de-padroes', 'Detecção, reconhecimento e análise de imagens e vídeo'),
    ('Computadores e Sociedade', 'computadores-e-sociedade', 'Impacto social, ética, políticas públicas e implicações sociais da computação'),
    ('Bancos de Dados', 'bancos-de-dados', 'Modelagem, armazenamento, consultas e otimização em bancos de dados'),
    ('Computação Distribuída, Paralela e em Cluster', 'computacao-distribuida-paralela-e-em-cluster', 'Sistemas distribuídos, paralelismo, escalabilidade e computação em cluster'),
    ('Bibliotecas Digitais', 'bibliotecas-digitais', 'Catalogação, preservação e acesso a coleções digitais'),
    ('Matemática Discreta', 'matematica-discreta', 'Combinatória, teoria dos grafos e estruturas discretas'),
    ('Estruturas de Dados e Algoritmos', 'estruturas-de-dados-e-algoritmos', 'Projetos de algoritmos, análise e estruturas de dados'),
    ('Tecnologias Emergentes', 'tecnologias-emergentes', 'Computação quântica, blockchain e novas tecnologias em P&D'),
    ('Linguagens Formais e Teoria dos Autômatos', 'linguagens-formais-e-teoria-dos-automatos', 'Autômatos, gramáticas e teoria formal de linguagens'),
    ('Literatura Geral', 'literatura-geral', 'Artigos de revisão, ensaios e visão geral sobre temas em computação'),
    ('Gráfica Computacional', 'grafica-computacional', 'Renderização, modelagem 3D, visualização e gráficos por computador'),
    ('Ciência da Computação e Teoria dos Jogos', 'ciencia-da-computacao-e-teoria-dos-jogos', 'Aplicações da teoria dos jogos, algoritmos econômicos e teoria dos mecanismos'),
    ('Interação Humano-Computador', 'interacao-humano-computador', 'UX, design de interfaces, usabilidade e estudo de interação'),
    ('Recuperação de Informação', 'recuperacao-de-informacao', 'Sistemas de busca, indexação, recuperação e ranking de documentos'),
    ('Teoria da Informação', 'teoria-da-informacao', 'Codificação, compressão, entropia e comunicação de informação'),
    ('Aprendizado de Máquina', 'aprendizado-de-maquina', 'Modelos de aprendizado supervisionado, não supervisionado e deep learning'),
    ('Lógica na Ciência da Computação', 'logica-na-ciencia-da-computacao', 'Verificação formal, lógica matemática e especificação de sistemas'),
    ('Sistemas Multiagente', 'sistemas-multiagente', 'Agentes autônomos, coordenação e sistemas distribuídos multiagente'),
    ('Multimídia', 'multimidia', 'Processamento de áudio, vídeo, imagens e aplicações multimídia'),
    ('Software Matemático', 'software-matematico', 'Ferramentas, bibliotecas e algoritmos para matemática computacional'),
    ('Análise Numérica', 'analise-numerica', 'Métodos numéricos, aproximação e solução de problemas contínuos por métodos computacionais'),
    ('Computação Neural e Evolutiva', 'computacao-neural-e-evolutiva', 'Redes neurais, algoritmos evolutivos e otimização baseada em evolução'),
    ('Redes e Arquitetura da Internet', 'redes-e-arquitetura-da-internet', 'Protocolos de rede, roteamento, infraestrutura e arquiteturas de internet'),
    ('Outras Áreas de Ciência da Computação', 'outras-ciencias-da-computacao', 'Tópicos diversos e interdisciplinares em computação'),
    ('Sistemas Operacionais', 'sistemas-operacionais', 'Kernel, gerenciamento de processos, memória e abstrações de sistema'),
    ('Desempenho', 'desempenho', 'Medição, otimização e análise de desempenho de software e hardware'),
    ('Linguagens de Programação', 'linguagens-de-programacao', 'Design de linguagens, compiladores, interpretadores e semântica'),
    ('Robótica', 'robotica', 'Percepção, controle, planejamento e sistemas robóticos'),
    ('Computação Simbólica', 'computacao-simbolica', 'Manipulação simbólica, álgebra computacional e sistemas simbólicos'),
    ('Som', 'som', 'Processamento de áudio, síntese, análise e reconhecimento de som'),
    ('Engenharia de Software', 'engenharia-de-software', 'Processos, metodologias, testes e arquitetura de software'),
    ('Redes Sociais e de Informação', 'redes-sociais-e-de-informacao', 'Análise de grafos, difusão de informação e comportamento em redes sociais'),
    ('Sistemas e Controle', 'sistemas-e-controle', 'Teoria de controle, sistemas dinâmicos e automação')
ON CONFLICT (slug) DO NOTHING;