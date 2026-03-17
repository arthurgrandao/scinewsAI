import os
from dotenv import load_dotenv

# Carrega as variáveis de ambiente
load_dotenv()

S2_API_KEY = os.getenv("S2_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

CS_MACRO_TOPICS = [
    "Software Engineering", "Computer Security", "Distributed Systems",
    "Artificial Intelligence", "Computer Vision", "Database Systems",
    "Human Computer Interaction", "Computer Networks", "Operating Systems"
]
