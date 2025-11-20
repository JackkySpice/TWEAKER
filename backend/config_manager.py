import json
import os
import shutil

PROFILES_FILE = "profiles.json"
RULES_FILE = "rules.json"

DEFAULT_PROFILE = {
    "active_profile": "default",
    "profiles": {
        "default": {
            "proxy_port": 8080,
            "apps": {
                "gemini": {
                    "enabled": True,
                    "flag_configs": {}
                },
                "copilot": {
                    "enabled": True,
                    "flags": [],
                    "allow_beta": False
                },
                "google_labs": {
                    "enabled": True,
                    "music_fx_replace": "None",
                    "bypass_not_found": False
                }
            }
        }
    }
}

class ConfigManager:
    def __init__(self):
        self.load_profiles()

    def load_profiles(self):
        if not os.path.exists(PROFILES_FILE):
            self.save_data(PROFILES_FILE, DEFAULT_PROFILE)
            self.profiles_data = DEFAULT_PROFILE
        else:
            try:
                with open(PROFILES_FILE, "r") as f:
                    self.profiles_data = json.load(f)
            except Exception:
                self.profiles_data = DEFAULT_PROFILE

    def save_data(self, filename, data):
        with open(filename, "w") as f:
            json.dump(data, f, indent=4)

    def get_active_profile(self):
        active_name = self.profiles_data.get("active_profile", "default")
        return self.profiles_data["profiles"].get(active_name, DEFAULT_PROFILE["profiles"]["default"])

    def update_active_profile(self, updates):
        active_name = self.profiles_data.get("active_profile", "default")
        if active_name in self.profiles_data["profiles"]:
            # Deep update logic could go here, but for now we replace/merge top keys
            current = self.profiles_data["profiles"][active_name]
            current.update(updates)
            self.save_data(PROFILES_FILE, self.profiles_data)
            self.generate_rules_json()
            return current
        return None

    def generate_rules_json(self):
        """Generates the rules.json file used by the mitmproxy addon script."""
        profile = self.get_active_profile()
        apps_for_backend = {}

        if "apps" in profile:
            # Gemini
            if "gemini" in profile["apps"]:
                gemini_config = profile["apps"]["gemini"]
                enabled_flags_configs = {k: v for k, v in gemini_config.get("flag_configs", {}).items() if v.get("enabled", True)}

                enabled_flags = []
                for id in enabled_flags_configs.keys():
                    # Keep ranges as strings, numbers as ints if possible, but backend handles mixed
                    if '-' in id:
                        enabled_flags.append(id)
                    else:
                        try:
                            enabled_flags.append(int(id))
                        except ValueError:
                            enabled_flags.append(id)

                apps_for_backend["gemini"] = {
                    "enabled": gemini_config.get("enabled", True),
                    "flags": enabled_flags
                }

            # Copilot
            if "copilot" in profile["apps"]:
                copilot_config = profile["apps"]["copilot"]
                enabled_flags = [f["name"] for f in copilot_config.get("flags", []) if f.get("enabled", True)]
                apps_for_backend["copilot"] = {
                    "enabled": copilot_config.get("enabled", True),
                    "flags": sorted(enabled_flags),
                    "allow_beta": copilot_config.get("allow_beta", False)
                }

            # Google Labs
            if "google_labs" in profile["apps"]:
                apps_for_backend["google_labs"] = profile["apps"]["google_labs"]

        self.save_data(RULES_FILE, {"apps": apps_for_backend})
