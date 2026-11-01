"""Build a single-file page for the claude.ai Artifact (inline js/, no html/head/body skeleton)."""
import re, pathlib
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
def inline(m):
    src = m.group(1)
    return '<script>\n' + (root / src).read_text() + '\n</script>'
body = re.sub(r'<script src="(js/[^"]+)"></script>', inline, body)
out = head.strip() + '\n' + body.strip() + '\n'
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'pomodoro-world.html').write_text(out)
print('wrote', len(out), 'bytes')
