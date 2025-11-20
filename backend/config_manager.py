import json
import os
import shutil
import collections.abc

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
                    "flag_configs": {
                        "45709348": {"note": "Visual Layout", "enabled": True},
                        "45720836": {"note": "Rollout switcher", "enabled": True},
                        "45728464": {"note": "Black sidebar", "enabled": True},
                        "45728377": {"note": "Chat name at top of chat", "enabled": True},
                        "45711245": {"note": "My Stuff", "enabled": True},
                        "45663720": {"note": "Separate activity and settings & help in sidebar", "enabled": True},
                        "45691404": {"note": "Search tool", "enabled": True},
                        "45707395": {"note": "Agent mode", "enabled": True},
                        "45715396": {"note": "Canvas Creative / Dynamic View", "enabled": True},
                        "45715303": {"note": "Deep Think IMO version", "enabled": True},
                        "45730924": {"note": "Enables default tools in gem edit/creation page", "enabled": True},
                        "45720638": {"note": "Alternative prompt box", "enabled": True},
                        "45685834": {"note": "Prompt power up", "enabled": True},
                        "45428791": {"note": "Quick follow up", "enabled": True},
                        "45461453": {"note": "Personalisation Try Now CTA", "enabled": True}
                    }
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

def deep_update(source, overrides):
    """
    Update a nested dictionary or similar mapping.
    Modify ``source`` in place.
    """
    for key, value in overrides.items():
        if isinstance(value, collections.abc.Mapping) and value:
            returned = deep_update(source.get(key, {}), value)
            source[key] = returned
        else:
            source[key] = overrides[key]
    return source

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

                # Attempt to merge default flags if they don't exist
                # This is a simple migration helper for existing users
                active = self.profiles_data.get("active_profile", "default")
                profile = self.profiles_data.get("profiles", {}).get(active, {})
                if "apps" in profile and "gemini" in profile["apps"]:
                    gemini = profile["apps"]["gemini"]
                    if "flag_configs" not in gemini:
                        gemini["flag_configs"] = {}

                    defaults = DEFAULT_PROFILE["profiles"]["default"]["apps"]["gemini"]["flag_configs"]
                    for k, v in defaults.items():
                        if k not in gemini["flag_configs"]:
                            gemini["flag_configs"][k] = v

                    self.save_data(PROFILES_FILE, self.profiles_data)

            except Exception:
                self.profiles_data = DEFAULT_PROFILE

    def save_data(self, filename, data):
        with open(filename, "w") as f:
            json.dump(data, f, indent=4)

    def get_active_profile(self):
        active_name = self.profiles_data.get("active_profile", "default")
        return self.profiles_data["profiles"].get(active_name, DEFAULT_PROFILE["profiles"]["default"])

    def get_full_config(self):
        return self.profiles_data

    def update_active_profile(self, updates):
        active_name = self.profiles_data.get("active_profile", "default")
        if active_name in self.profiles_data["profiles"]:
            current = self.profiles_data["profiles"][active_name]

            # Perform deep update
            deep_update(current, updates)

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
