"""
This script converts jupyter notebooks into html for rendering by hugo.
Notebook files are placed in the /static/notebooks/ directory in the source and
are copied to /notebooks/ folder after conversion to a static site.

* This script is to be called from the website root folder.
* For embedding notebooks, assumes frontmatter is in TOML format.
* For images etc. in converted markdown files, assumes static dir is /static/
* all notebooks to be stored in PRE_NBDIR (default: static/notebooks/)
* all linked images are local

Requires:
* hugo.exe in PATH
* jupyter notebook installed (along with nbconvert python library)
"""

import os
import glob
import json
import hashlib
import shutil
import re
from subprocess import Popen
from argparse import ArgumentParser
from urllib.parse import quote
from nbconvert import HTMLExporter, MarkdownExporter
from nbconvert.writers import FilesWriter

# static dir relative to draft root
STATIC_DIR = 'static'
STATIC_ABS = os.path.abspath(STATIC_DIR)
# .ipynb directory relative to draft root
PRE_NBDIR = os.path.join(STATIC_DIR, 'notebooks')
# directory where images etc. are stored for markdown files before compilation
PRE_NBASSETS = os.path.join(PRE_NBDIR, 'assets')
# location of PRE_NBDIR relative to root after compilation to website
POST_NBDIR = '/notebooks/'
# location of PRE_NBASSETS relative to root after compilation to website.
# os.path.join is not used to preserve starting '/' which hugo reads as
# website root
POST_NBASSETS = POST_NBDIR + 'assets/'
# notebook file extension
EXT = '*.ipynb'
# file containing store of notebooks since last change
TRACK = '.snapshot'
# directory of script
MYDIR = os.path.dirname(os.path.abspath(__file__))
# content directory containing markdown posts etc.
CONTENT_DIR = os.path.join(MYDIR, 'content')
# frontmatter markers (YAML or TOML)
FRONT_PAT = r'(?P<type>\+{3}|-{3})\n+(?P<config>.+?)\n+\1.*'
# links to resources in assets directory, relative to NBDIRs
ASSETS_PAT = r'(?P<name>\!\[.+?\])\((?P<link>.+?)\)'

parser = ArgumentParser(description=__doc__)
parser.add_argument('--files',
                    default='changed',
                    help='all or changed or file.ipynb')
parser.add_argument('--to',
                    default='md',
                    help='html or md or both format.')
parser.add_argument('--embed',
                    action='store_true',
                    default=False,
                    help='Embed notebook in new post file + delete converted file.')
parser.add_argument('--section',
                    default='post',
                    help='content subdirectory to which notebook post written if embedded.')
parser.add_argument('--force',
                    default=False,
                    help='Whether to overwrite existing posts with new content.',
                    action='store_true')
parser.add_argument('--append',
                    default=False,
                    help='Whether to append converted markdown to existing post.',
                    action='store_true')


def convert_html(nbfiles):
    """
    Convert a notebook to html w/o prompts, anchors, or styles and with embedded
    images. Change template_file to 'full' to embed style as well.
    """
    hx = HTMLExporter()
    hx.template_file = 'basic'
    hx.exclude_input_prompt = True
    hx.exclude_output_prompt = True
    hx.anchor_link_text = '\t'
    for nbfile in nbfiles:
        basepath, _ = os.path.splitext(nbfile)
        with open(basepath + '.html', 'w') as f:
            bd, _ = hx.from_file(nbfile)
            f.write(bd)


def convert_markdown(nbfiles):
    """
    Converts notebook to markdown with separated images. Images/assets stored in
    a sub-directory of notebooks and converted .md files.
    """
    mx = MarkdownExporter()
    wr = FilesWriter(build_directory=PRE_NBDIR)
    mx.template_file = 'markdown'
    for nbfile in nbfiles:
        basepath, _ = os.path.splitext(nbfile)  # path w/o extension
        basename = os.path.basename(basepath)   # name of notebook file
        bd, res = mx.from_file(nbfile)          # hex encoded data, asset file name
        
        # in case of embedded assets/images, save them to files on disk
        # rename asset files to remove spaces, add notebook filename as prefix
        for rfile in list(res['outputs'].keys()):
            new_rfile = '_'.join([*basename.split(), *rfile.split()])
            new_rel_url = quote(POST_NBASSETS + new_rfile)
            bd = bd.replace(rfile, new_rel_url)
            res['outputs'][new_rfile] = res['outputs'][rfile]
            del res['outputs'][rfile]
        
        # write hex data as file on disk
        wr.write(bd, res, basename)

        # move files to assets directory
        for new_rfile in list(res['outputs'].keys()):
            shutil.move(os.path.join(PRE_NBDIR, new_rfile),\
                        os.path.join(PRE_NBASSETS, new_rfile))


def take_snapshot():
    """
    Checks which notebook files have changed by comparing previously stored md5
    hashes against newly computed ones.
    """
    track_path = os.path.join(PRE_NBDIR, TRACK)
    if not os.path.exists(track_path):
        hashes = {}
    else:
        hashes = json.loads(open(track_path, 'r').read())
    changed = []
    for nbfile in glob.glob(os.path.join(PRE_NBDIR, EXT)):
        basename = os.path.basename(nbfile)
        md5 = hashlib.md5(open(nbfile, 'rb').read()).hexdigest()
        if basename in hashes:
            if md5 == hashes[basename]:
                continue
        hashes[basename] = md5
        changed.append(nbfile)
    with open(track_path, 'w') as f:
        f.write(json.dumps(hashes))
    return changed


def embed(nbfiles, section, to_ext, force=False, append=False):
    for nbfile in nbfiles:
        basepath, ext = os.path.splitext(nbfile)  # path w/o extension
        basename = os.path.basename(basepath)   # name of notebook file

        relpath = os.path.join(section, basename+'.md')
        abspath = os.path.join(CONTENT_DIR, relpath)
        sourcepath = basepath + '.' + to_ext  # converted .md or .html file to embed

        if not os.path.exists(abspath):
            Popen(['hugo', 'new', relpath]).wait()
        
        elif not (force or append):
            print(relpath, 'already exists.')
            print('Could not embed notebook. Provide --force flag to overwrite,\
            or --append flag to add to existing text.')
            return

        
        with open(abspath, 'r') as f:
            match = re.search(FRONT_PAT, f.read(), re.DOTALL)
            prepend = '\n'.join([match['type'], match['config'], match['type']])
        
        mode = 'a' if append else 'w'
        with open(abspath, mode) as f:
            with open(sourcepath, 'r') as g:
                text = g.read()
                text = re.sub(ASSETS_PAT, lambda m: ''.join([m.group('name'), '(',\
                                                    POST_NBDIR, m.group('link'),\
                                                    ')']), text)
                f.write('\n'.join([prepend, text]))
        os.remove(sourcepath)



if __name__ == '__main__':
    args = parser.parse_args()

    # create asset directory
    os.makedirs(PRE_NBASSETS, exist_ok=True)

    if args.files == 'all':
        changed = glob.glob(os.path.join(PRE_NBDIR, EXT))
    elif args.files == 'changed':
        changed = take_snapshot()
    else:
        changed = glob.glob(os.path.join(PRE_NBDIR, args.files))

    print('{} files converting ...'.format(len(changed)), end='')

    if args.to == 'md' or args.to == 'both':
        convert_markdown(changed)
    if args.to == 'html' or args.to =='both':
        convert_html(changed)
    
    if args.embed:
        to = 'md' if args.to == 'both' else args.to
        embed(changed, args.section, to, args.force, args.append)

    print('done')