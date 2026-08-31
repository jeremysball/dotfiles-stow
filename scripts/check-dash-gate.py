#!/usr/bin/env python3
"""Exercise the global pre-commit dash gate against a block/pass matrix.

Runs the real hook over a real staged diff in a scratch repo, once per locale,
rather than matching the regex in isolation. Exits non-zero on any mismatch.

Every banned sequence below is built from codepoints instead of written out,
so this file can itself be committed through the gate it tests.
"""
import os
import shutil
import subprocess
import sys
import tempfile

HOOK = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".config", "git", "hooks", "pre-commit",
)
LOCALES = ("en_US.UTF-8", "C")

EM, EN, BAR = chr(0x2014), chr(0x2013), chr(0x2015)
NBSP, NNBSP, FIGSP = chr(0x00A0), chr(0x202F), chr(0x2007)
DD = "-" * 2

CASES = [
    ("block", "em dash",            "prose " + EM + " more"),
    ("block", "en dash",            "prose " + EN + " more"),
    ("block", "horizontal bar",     "prose " + BAR + " more"),
    ("block", "space on both sides", "prose " + DD + " more"),
    ("block", "tight between words", "prose word" + DD + "more"),
    ("block", "nbsp flanked",       "prose" + NBSP + DD + NBSP + "more"),
    ("block", "narrow nbsp flanked", "prose" + NNBSP + DD + NNBSP + "more"),
    ("block", "figure space flanked", "prose" + FIGSP + DD + FIGSP + "more"),
    ("block", "tab flanked",        "prose\t" + DD + "\tmore"),
    ("block", "markdown + bullet",  "+ bullet " + EM + " text"),
    ("pass",  "long option",        "run " + DD + "flag now"),
    ("pass",  "space on the left only", "prose " + DD + "more"),
    ("pass",  "nothing on the right", "prose word" + DD + " "),
    ("pass",  "decrement",          "i" + DD),
    ("pass",  "horizontal rule",    "-" * 3),
    ("pass",  "table separator",    "| " + "-" * 3 + " | " + "-" * 3 + " |"),
    ("pass",  "html comment",       "<!" + DD + " a comment " + DD + ">"),
    ("pass",  "hyphenated word",    "well-known thing"),
    ("pass",  "plain prose",        "nothing to see here"),
]


def stage_and_run(line, locale):
    """Stage one line in a throwaway repo and return the hook's exit code."""
    work = tempfile.mkdtemp()
    try:
        env = dict(
            os.environ,
            LC_ALL=locale,
            LANG=locale,
            GIT_AUTHOR_NAME="dash-gate-test",
            GIT_AUTHOR_EMAIL="dash-gate-test@invalid",
            GIT_COMMITTER_NAME="dash-gate-test",
            GIT_COMMITTER_EMAIL="dash-gate-test@invalid",
        )
        subprocess.run(["git", "init", "-q", work], env=env, check=True)
        with open(os.path.join(work, "f.txt"), "w", encoding="utf-8") as fh:
            fh.write(line + "\n")
        subprocess.run(["git", "-C", work, "add", "f.txt"], env=env, check=True)
        done = subprocess.run(
            ["bash", HOOK], cwd=work, env=env, capture_output=True, text=True
        )
        return done.returncode
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    if not os.path.isfile(HOOK):
        print("check-dash-gate: no hook at %s" % HOOK, file=sys.stderr)
        return 2
    failures = 0
    for locale in LOCALES:
        print("locale %s" % locale)
        for want, name, line in CASES:
            got = "block" if stage_and_run(line, locale) != 0 else "pass"
            ok = got == want
            failures += not ok
            print("  %-4s got=%-5s want=%-5s %s"
                  % ("ok" if ok else "FAIL", got, want, name))
    if failures:
        print("\ncheck-dash-gate: %d mismatch(es)" % failures, file=sys.stderr)
        return 1
    print("\ncheck-dash-gate: %d cases pass in %d locales"
          % (len(CASES), len(LOCALES)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
