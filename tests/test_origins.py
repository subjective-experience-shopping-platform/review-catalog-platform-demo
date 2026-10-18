import pytest
from fastapi.testclient import TestClient

from demo import app as application


@pytest.mark.parametrize(
    "origin",
    ["https://experience-driven-product-catalog.github.io", "https://untrusted.example", "null"],
)
@pytest.mark.parametrize("path", ["/chat", "/report"])
def test_untrusted_origins_are_rejected_before_request_processing(monkeypatch, origin, path):
    def unexpected(*args, **kwargs):
        pytest.fail("Rejected origins must not start audit storage or model processing")

    monkeypatch.setattr(application.audit, "events", unexpected)
    response = TestClient(application.app).post(path, headers={"Origin": origin}, json={})
    assert response.status_code == 403
    assert response.json() == {"error": "ORIGIN_NOT_ALLOWED"}
    assert "access-control-allow-origin" not in response.headers


def test_allowed_origin_can_read_catalog_and_preflight():
    origin = application.ALLOWED_ORIGINS[0]
    client = TestClient(application.app)
    response = client.get("/catalog", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert len(response.json()["products"]) == 9
    response = client.options(
        "/chat",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_untrusted_origin_preflight_is_rejected():
    response = TestClient(application.app).options(
        "/chat",
        headers={"Origin": "https://experience-driven-product-catalog.github.io", "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 403


def test_health_without_origin_remains_available_for_operator_smoke_checks():
    assert TestClient(application.app).get("/health").status_code == 200
