import pytest

from emporio.config import DATA_DIR
from emporio.data.build import build


@pytest.fixture(scope="session")
def built(tmp_path_factory):
    """Gera store.db e policies.json uma vez por sessão, numa pasta temporária."""
    return build(DATA_DIR, tmp_path_factory.mktemp("var"))


@pytest.fixture(scope="session")
def store(built):
    from emporio.store import Store

    return Store(built["db"], built["policies"])
