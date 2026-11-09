#!/usr/bin/env python3
"""Chromium regression comparison of the 16 RPG chapter screens against main."""
import json
import pathlib
import subprocess
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
STAGES = ("starter", "task1", "task2", "solution")

def snapshot(page):
    return page.evaluate("""() => ({
      characters: [...document.querySelectorAll('.character')].map(e => e.innerText),
      actors: document.querySelector('#actors')?.innerText ?? null,
      log: document.querySelector('#log')?.innerText ?? null,
      nextDisabled: document.querySelector('#next-turn')?.disabled ?? null,
      select: document.querySelector('#friend-target') ? {
        options: [...document.querySelector('#friend-target').options].map(e => [e.value, e.textContent]),
        value: document.querySelector('#friend-target').value,
        disabled: document.querySelector('#friend-target').disabled
      } : null,
      auto: document.querySelector('#auto-friend')?.checked ?? null
    })""")

def run_case(browser, url):
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(url, wait_until="load")
    states = [snapshot(page)]
    if page.locator("#friend-target").count() and page.locator("#friend-target option").count() > 1:
        page.locator("#friend-target").select_option(index=1)
        states.append(snapshot(page))
    if page.locator("#auto-friend").count():
        page.locator("#auto-friend").check()
        states.append(snapshot(page))
        page.locator("#auto-friend").uncheck()
        states.append(snapshot(page))
    for _ in range(12):
        if not page.locator("#next-turn").count() or page.locator("#next-turn").is_disabled():
            break
        page.locator("#next-turn").click()
        states.append(snapshot(page))
    if page.locator("#reset").count():
        page.locator("#reset").click()
        states.append(snapshot(page))
    page.close()
    return {"states": states, "errors": errors}

def main():
    with tempfile.TemporaryDirectory() as td:
        baseline = pathlib.Path(td) / "baseline"
        baseline.mkdir()
        # Exact pre-change source for each file comes from main.
        for chapter in range(1, 5):
            for stage in STAGES:
                rel = pathlib.Path("examples") / f"chapter{chapter}" / stage
                dest = baseline / rel
                dest.mkdir(parents=True)
                for filename in ("index.html", "game.js"):
                    content = subprocess.check_output(["git", "show", f"origin/main:{rel}/{filename}"], cwd=ROOT)
                    (dest / filename).write_bytes(content)
        servers = []
        try:
            for directory in (baseline, ROOT):
                handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
                server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
                threading.Thread(target=server.serve_forever, daemon=True).start()
                servers.append(server)
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True)
                results = []
                for chapter in range(1, 5):
                    for stage in STAGES:
                        rel = f"examples/chapter{chapter}/{stage}/index.html"
                        try:
                            before = run_case(browser, f"http://127.0.0.1:{servers[0].server_port}/{rel}")
                            after = run_case(browser, f"http://127.0.0.1:{servers[1].server_port}/{rel}")
                            status = "PASS" if before == after and not before["errors"] else "FAIL"
                            results.append({"case": rel, "status": status, "before": before, "after": after})
                        except Exception as exc:
                            results.append({"case": rel, "status": "INDETERMINATE", "error": str(exc)})
                browser.close()
            pathlib.Path("rpg-browser-regression-report.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
            for result in results:
                print(result["status"], result["case"], result.get("error", ""))
            if len(results) != 16 or any(result["status"] != "PASS" for result in results):
                raise SystemExit(1)
        finally:
            for server in servers:
                server.shutdown()

if __name__ == "__main__":
    main()
