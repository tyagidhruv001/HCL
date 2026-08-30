"""
Real ML component: TF-IDF vector space model + cosine similarity, implemented
in pure NumPy — no scikit-learn, no scipy, no torch, no sentence-transformers.

Why this replaced the sentence-transformers version: sentence-transformers
pulls in torch, which ships a large stack of unsigned native DLLs alongside
scikit-learn's own compiled extensions (scipy). On locked-down Windows
machines (Application Control Policy / enterprise antivirus), those unsigned
DLLs get blocked at import time and crash every endpoint that touches the
ranker — which is exactly what happened here. TF-IDF only needs NumPy, whose
wheels are signed/trusted far more reliably, and it has zero native-code
imports beyond that.

This is still a legitimate, classic IR/NLP technique (this is literally what
basic search-engine relevance ranking looked like before neural embeddings)
so it's a fair answer to "where's the ML" — just explain the tradeoff if
asked: TF-IDF matches on vocabulary overlap (weighted by term rarity), not
deep semantic meaning, so "ML engineer" and "deep learning" won't match each
other the way a neural embedding would. Good enough for a hackathon catalog
of a few dozen courses.

If you're demoing on a machine WITHOUT the Windows DLL restriction, you can
swap this module's internals back to sentence-transformers for stronger
semantic matching — nothing outside this file needs to change, since
`rank_by_semantic_similarity()` is the only function other modules call.
"""

import re
from collections import Counter
import numpy as np

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _build_tfidf_matrix(documents: list[str]) -> np.ndarray:
    """documents[0] is treated the same as any other doc; caller decides ordering."""
    tokenized = [_tokenize(doc) for doc in documents]

    vocab: dict[str, int] = {}
    for tokens in tokenized:
        for tok in tokens:
            if tok not in vocab:
                vocab[tok] = len(vocab)

    n_docs = len(documents)
    n_terms = len(vocab)
    if n_terms == 0:
        return np.zeros((n_docs, 0))

    tf = np.zeros((n_docs, n_terms))
    for i, tokens in enumerate(tokenized):
        counts = Counter(tokens)
        length = max(len(tokens), 1)
        for tok, count in counts.items():
            tf[i, vocab[tok]] = count / length

    df = np.count_nonzero(tf > 0, axis=0)
    idf = np.log((1 + n_docs) / (1 + df)) + 1  # smoothed idf, avoids div-by-zero

    tfidf = tf * idf

    norms = np.linalg.norm(tfidf, axis=1, keepdims=True)
    norms[norms == 0] = 1  # avoid div-by-zero for empty docs
    return tfidf / norms


def rank_by_semantic_similarity(query: str, candidate_texts: list[str]) -> list[float]:
    """
    Returns a cosine-similarity score (0-1) for each candidate against the
    query, same order as input. Query and candidates share one TF-IDF
    vocabulary so their vectors are comparable.
    """
    if not candidate_texts:
        return []

    all_docs = [query] + candidate_texts
    matrix = _build_tfidf_matrix(all_docs)

    if matrix.shape[1] == 0:
        return [0.0] * len(candidate_texts)

    query_vec = matrix[0]
    doc_vecs = matrix[1:]
    scores = doc_vecs @ query_vec  # vectors already L2-normalized -> dot == cosine
    return scores.tolist()
