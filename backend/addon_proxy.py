import json
import re
from mitmproxy import http, ctx

class AITweaker:
    def __init__(self):
        self.rules = {}
        self.gemini_url_pattern = re.compile(r'^https?:\/\/www\.gstatic\.com\/.*m=_b(\?.*)?$', re.S)
        self.copilot_url_pattern = re.compile(r'^https?:\/\/copilot\.microsoft\.com\/c\/api\/start.*')
        self.google_labs_url_pattern = re.compile(r'^https?:\/\/labs\.google\/fx\/_next\/static\/chunks\/pages\/index-.*\.js')
        self.google_labs_json_pattern = re.compile(r'^https?:\/\/labs\.google\/fx\/_next\/data\/.*\.json(\?.*)?$')

    def load_rules(self):
        try:
            # Assume rules.json is in the same directory
            with open('rules.json', 'r') as f:
                self.rules = json.load(f)
        except Exception as e:
            ctx.log.error(f"Error loading rules: {e}")

    def modify_gemini_script(self, flow: http.HTTPFlow) -> None:
        app = self.rules.get("apps", {}).get("gemini", {})
        if not app.get("enabled", False):
            return

        try:
            content = flow.response.get_text()
            flags = app.get("flags", [])
            flags_string = json.dumps(flags)

            injection = f"""
;(function(){{
    try {{
        const ext_flags = {flags_string};
        const originalFlagFunc = self.getFlag;

        self.getFlag = function(id, fallback) {{
            if (ext_flags.includes(id)) return true;
            return originalFlagFunc.call(self, id, fallback);
        }};
    }} catch (e) {{}}
}})();
"""
            flow.response.text = injection + content
            ctx.log.info("Injected Gemini flags into script.")
        except Exception as e:
            ctx.log.error(f"Error modifying Gemini script: {e}")

    def modify_copilot_response(self, flow: http.HTTPFlow) -> None:
        app = self.rules.get("apps", {}).get("copilot", {})
        if not app.get("enabled", False):
            return

        allow_beta = app.get("allow_beta", False)
        flags_to_add = set(app.get("flags", []))

        try:
            content = flow.response.get_text()

            if content.startswith(")]}'"):
                content = content[4:]

            data = json.loads(content)
            modified = False

            if allow_beta:
                if data.get("allowBeta") != True:
                    data["allowBeta"] = True
                    modified = True

            if "features" in data and isinstance(data["features"], list):
                original_flags = set(data["features"])
                combined_flags = list(original_flags.union(flags_to_add))

                if combined_flags != data["features"]:
                    data["features"] = combined_flags
                    modified = True

            if modified:
                flow.response.text = json.dumps(data)
                ctx.log.info("Modified Copilot features.")

        except Exception as e:
            ctx.log.error(f"Error modifying Copilot response: {e}")

    def modify_google_labs_script(self, flow: http.HTTPFlow) -> None:
        app = self.rules.get("apps", {}).get("google_labs", {})
        if not app.get("enabled", False):
            return

        mode = app.get("music_fx_replace", "debug")
        try:
            content = flow.response.get_text()

            if mode == "debug":
                new_content = content.replace("/fx/music", "/fx/music?debug")
                if content != new_content:
                    flow.response.text = new_content
                    ctx.log.info("Replaced MusicFX link.")
            else:
                new_content = content.replace("/fx/music", f"/fx/music?{mode}")
                flow.response.text = new_content
                ctx.log.info("Replaced MusicFX link with custom query.")

        except Exception as e:
            ctx.log.error(f"Error modifying Google Labs script: {e}")

    def modify_json_response(self, flow: http.HTTPFlow) -> None:
        app = self.rules.get("apps", {}).get("google_labs", {})
        if not app.get("enabled", False) or not app.get("bypass_not_found", False):
            return

        try:
            content_type = flow.response.headers.get("content-type", "").lower()

            if "application/json" in content_type:
                text = flow.response.get_text()

                if text.strip() == "{\"notFound\":true}":
                    flow.response.text = "{\"notFound\":false}"
                    ctx.log.info("Bypassed notFound JSON.")

            if flow.response.status_code == 404 and self.google_labs_json_pattern.match(flow.request.url):
                flow.response.status_code = 200
                flow.response.text = "{\"notFound\":false}"
                flow.response.headers["Content-Type"] = "application/json"
                ctx.log.info(f"Bypassed 404 notFound for {flow.request.url}")

        except Exception as e:
            ctx.log.error(f"Error modifying JSON response: {e}")

    def request(self, flow: http.HTTPFlow) -> None:
        self.load_rules()

        app = self.rules.get("apps", {}).get("google_labs", {})
        if app.get("enabled", False) and app.get("bypass_not_found", False):
            try:
                if flow.request.method == "HEAD" and self.google_labs_json_pattern.match(flow.request.url):
                    flow.request.method = "GET"
                    ctx.log.info(f"Replaced HEAD with GET request for {flow.request.url}")
            except Exception as e:
                ctx.log.error(f"Error modifying request: {e}")

    def response(self, flow: http.HTTPFlow) -> None:
        self.load_rules()

        if self.gemini_url_pattern.match(flow.request.url):
            self.modify_gemini_script(flow)

        if self.copilot_url_pattern.match(flow.request.url):
            self.modify_copilot_response(flow)

        if self.google_labs_url_pattern.match(flow.request.url) or self.google_labs_json_pattern.match(flow.request.url):
            self.modify_google_labs_script(flow)

        self.modify_json_response(flow)

addons = [
    AITweaker()
]
