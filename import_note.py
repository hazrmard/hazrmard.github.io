import os
import re
from glob import glob
from argparse import ArgumentParser
import subprocess
import difflib

parser = ArgumentParser()
parser.add_argument('files', nargs='+')
args = parser.parse_args()

files = []
for f in args.files:
    files.extend(glob(f))

for f in files:
    with open(f, 'r') as file:
        newtext = file.read()
    fname = os.path.basename(f)
    localfname = os.path.join('./content/post', fname)
    if not os.path.exists(localfname):
        # run command: hugo new post/fname
        subprocess.run(['hugo', 'new', 'post/'+fname])
    with open(localfname, 'r') as f:
        text = f.read()
        frontmatter = re.search(r'\+\+\+\n(.*)\n\+\+\+', text, re.DOTALL).group(1)
        textbody = re.search(r'\+\+\+\n.*\n\+\+\+\n(.*)', text, re.DOTALL).group(1)
        diff = difflib.Differ().compare(textbody.splitlines(True), newtext.splitlines(True))
        print(''.join(diff))