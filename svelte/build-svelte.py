from warnings import warn
import os
import shutil
import re

if not os.environ.get('FLASK_APP'):
    raise Exception("Environment variable \"FLASK_APP\" is not set. Please set it to relevant value to run the Flask app (e.g. \"flask-app\".")
STATIC_PATH = os.path.abspath('./../' + os.environ.get('FLASK_APP') + '/static/')
TEMPLATES_PATH = os.path.abspath('./../' + os.environ.get('FLASK_APP') + '/templates/')

### Update paths in code

def fixPath(path:str, source_dirpath:str="intro/js/"):
    if path[0] != "/":
        # Path is relative
        if path.startswith('./'):
            path = path[2:]
        path = os.path.normpath(os.path.join(source_dirpath, path)).replace('\\', '/')

    if '/assets/' not in path:
        warn(" \"/assets/\" not part of this absolute file path. Behaviour uncertain.")
    path = path.split('/assets/')[-1]
    path = f"\"/static/{path}\""
    return path

def jsUpdateFile(src:str, source_dirpath:str="intro/js/"):
    final_src = src
    js_regex = re.compile(r"(\").+?(?<!\\)\1") # Note here we assume that the built js files will never use 
    #single quotes, such that all instances of them are paths we already worked with and thus safe to ignore.
    for match in js_regex.finditer(src):
        s = match.group(0)[1:-1]
        if ('.' in s[-5:]) and ('//' not in s) and ('/' in s):
            new_path = fixPath(s, source_dirpath)
            # print(f"\"{s}\" --> \"{new_path}\"")
            final_src = final_src.replace(match.group(0), new_path)
    return final_src
def cssUpdateFile(src:str, source_dirpath:str="intro/css/"):
    final_src = src
    css_regex = re.compile(r"(?<=url\().+?(?=#|\))")
    for match in css_regex.finditer(src):
        s = match.group(0)
        if ('.' in s[-5:]) and ('//' not in s) and ('http' not in s) and ('/' in s):
            new_path = fixPath(s, source_dirpath)
            # print(f"\"{s}\" --> \"{new_path}\"")
            final_src = final_src.replace(s, new_path)
    return final_src
def htmlUpdateFile(src:str, source_dirpath:str="intro/css/"):
    final_src = src
    html_regex = re.compile(r"(?<=href=| src=)(\"|').+?\1")
    for match in html_regex.finditer(src):
        s = match.group(0)[1:-1]
        if ('.' in s[-5:]) and ('//' not in s) and ('/' in s):
            new_path = fixPath(s, source_dirpath).replace('/static/', '')[1:-1]
            new_path = "\"{{ url_for('static', filename='"+new_path+"') }}\""
            # print(f"\"{s}\" --> \"{new_path}\"")
            final_src = final_src.replace(match.group(0), new_path)
    return final_src

for root, dirs, files in os.walk("dist/"):
    for file in files:
        extType = file.split('.')[-1]
        filepath = os.path.join(root, file).replace('\\', '/')
        if (extType == 'js') or (extType == 'css') or (extType == 'html'):
            updateFile = jsUpdateFile if (extType == 'js') else cssUpdateFile if (extType == 'css') else htmlUpdateFile
            # print('-=-=-=-=-=-= ', filepath, ' =-=-=-=-=-=-')
            with open(filepath, "r+") as f:
                updated = updateFile(f.read(), root.replace("dist/assets/", ""))
                f.seek(0)
                f.truncate()
                f.write(updated)

### Change html file names

        if (extType == 'html'):
            new_name = filepath.split('/')[-2] + '.html'
            new_filepath = os.path.join(*filepath.split('/')[:-1], new_name).split('\\')
            final_filepath = new_filepath[:-2] + new_filepath[-1:]

            os.rename(filepath, '/'.join(final_filepath))
            os.rmdir('/'.join(new_filepath[:-1]))

### Delete files in static/templates that we're now replacing

for root, dirs, files in os.walk('dist/'):
    get_etag = lambda filepath : '-'.join((filepath.split('/')[-1]).split('-')[:-1]) + f".{filepath.split('.')[-1]}"
    check_ext = lambda filename, ext : filename.split('.')[-1] == ext
    for file in files:
        filepath = os.path.join(root, file).replace('\\', '/')
        filepath = filepath.replace('dist/', '').replace('assets/', '')
        dirpath  = "/".join(filepath.split('/')[:-1]) + '/'

        check_condition = get_etag(filepath)
        if check_ext(filepath, 'html'):
            future_dirpath = os.path.join(TEMPLATES_PATH, dirpath)
            check_condition = file # because the .html files don't have any hash
        else:
            future_dirpath = os.path.join(STATIC_PATH, dirpath)

        for old_filename in os.listdir(future_dirpath):
            old_etag = get_etag(old_filename) if not check_ext(old_filename, 'html') else old_filename
            if old_etag == check_condition:
                os.remove(os.path.join(future_dirpath, old_filename))

### Move assets to static

assetsPath = os.path.join(os.getcwd(), 'dist', 'static/')
os.rename(os.path.join(os.getcwd(), 'dist', 'assets'), assetsPath)
shutil.copytree(assetsPath, STATIC_PATH, dirs_exist_ok=True)
shutil.rmtree(assetsPath)

### Move html to templates

htmlPath = os.path.join(os.getcwd(), 'templates/')
os.rename(os.path.join(os.getcwd(), 'dist'), htmlPath)
shutil.copytree(htmlPath, TEMPLATES_PATH, dirs_exist_ok=True)
shutil.rmtree(htmlPath)
