import numpy as np

class EmbeddingEngine:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            from sentence_transformers import SentenceTransformer
            # Load the lightweight, high-performance 384-dimensional embedding model
            cls._model = SentenceTransformer("all-MiniLM-L6-v2")
        return cls._model

    @classmethod
    def get_embedding(cls, text: str) -> list:
        """
        Generates a 384-dimensional list of floats representing the semantic embedding.
        """
        model = cls.get_model()
        # Ensure we normalize embeddings so cosine similarity can be calculated via simple dot product
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    @classmethod
    def calculate_similarity(cls, vec1: list, vec2: list) -> float:
        """
        Calculates cosine similarity between two vectors.
        Since we encode with normalize_embeddings=True, this is just a dot product.
        We provide a fallback just in case.
        """
        a = np.array(vec1)
        b = np.array(vec2)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

embedding_engine = EmbeddingEngine()
