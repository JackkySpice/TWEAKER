import pytest
from fastapi.testclient import TestClient
import os
import json
import shutil
from backend.main import app
from backend.config_manager import ConfigManager, PROFILES_FILE, RULES_FILE

# Setup TestClient
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_teardown():
    # Backup existing files
    if os.path.exists(PROFILES_FILE):
        shutil.copy(PROFILES_FILE, PROFILES_FILE + ".bak")
    if os.path.exists(RULES_FILE):
        shutil.copy(RULES_FILE, RULES_FILE + ".bak")

    # Reset to known state
    if os.path.exists(PROFILES_FILE):
        os.remove(PROFILES_FILE)

    yield

    # Restore files
    if os.path.exists(PROFILES_FILE + ".bak"):
        shutil.move(PROFILES_FILE + ".bak", PROFILES_FILE)
    if os.path.exists(RULES_FILE + ".bak"):
        shutil.move(RULES_FILE + ".bak", RULES_FILE)

def test_get_config_structure():
    """Test that GET /config returns the full profile structure."""
    response = client.get("/config")
    assert response.status_code == 200
    data = response.json()
    assert "profiles" in data
    assert "active_profile" in data
    assert "default" in data["profiles"]

def test_default_flags_present():
    """Test that the requested Gemini flags are present in default config."""
    response = client.get("/config")
    data = response.json()
    gemini_config = data["profiles"]["default"]["apps"]["gemini"]
    flags = gemini_config["flag_configs"]

    expected_flags = [
        "45709348", "45720836", "45728464", "45728377", "45711245",
        "45663720", "45691404", "45707395", "45715396", "45715303",
        "45730924", "45720638", "45685834", "45428791", "45461453"
    ]

    for flag in expected_flags:
        assert flag in flags, f"Flag {flag} missing from defaults"

def test_deep_update_config():
    """Test that POST /config handles deep updates correctly (partial updates)."""
    # First get current config
    response = client.get("/config")
    config = response.json()

    # Prepare update - Only updating 'enabled' status of one app, shouldn't wipe flags
    updates = {
        "apps": {
            "gemini": {
                "enabled": False
            }
        }
    }

    # Send update
    response = client.post("/config", json={"updates": updates})
    assert response.status_code == 200

    # Verify update persisted and didn't wipe other data
    response = client.get("/config")
    data = response.json()
    gemini_config = data["profiles"]["default"]["apps"]["gemini"]

    assert gemini_config["enabled"] is False
    # Flags should still be there
    assert len(gemini_config["flag_configs"]) > 0
    assert "45709348" in gemini_config["flag_configs"]

def test_invalid_update_handling():
    """Test handling of invalid updates."""
    # No updates key
    response = client.post("/config", json={})
    assert response.status_code == 422 # Validation error from Pydantic model

    # Empty updates
    response = client.post("/config", json={"updates": {}})
    assert response.status_code == 400

def test_proxy_rules_generation():
    """Test that rules.json is generated correctly."""
    cm = ConfigManager()
    # Ensure clean state
    if os.path.exists(RULES_FILE):
        os.remove(RULES_FILE)

    cm.generate_rules_json()

    assert os.path.exists(RULES_FILE)
    with open(RULES_FILE, 'r') as f:
        rules = json.load(f)

    assert "apps" in rules
    assert "gemini" in rules["apps"]
    assert isinstance(rules["apps"]["gemini"]["flags"], list)

def test_addon_proxy_logic():
    """Test the addon proxy logic (unit test)."""
    from backend.addon_proxy import AITweaker
    from mitmproxy.http import HTTPFlow
    from mitmproxy import ctx
    from unittest.mock import MagicMock

    # Patch ctx.log
    ctx.log = MagicMock()

    addon = AITweaker()

    # Mock rules
    addon.rules = {
        "apps": {
            "gemini": {
                "enabled": True,
                "flags": ["12345"]
            }
        }
    }

    # Mock Flow
    # We need to properly mock attributes for mitmproxy Flow objects
    flow = MagicMock()

    # Mock request
    request_mock = MagicMock()
    request_mock.url = "https://www.gstatic.com/some/path/m=_b"
    flow.request = request_mock

    # Mock response
    response_mock = MagicMock()
    response_mock.get_text.return_value = "original code;"
    flow.response = response_mock

    # Run modification
    addon.modify_gemini_script(flow)

    # Check injection
    # We verify that we set flow.response.text
    assert flow.response.text is not None
    injected_text = flow.response.text
    assert 'const ext_flags = ["12345"]' in injected_text
    assert 'self.getFlag = function' in injected_text
