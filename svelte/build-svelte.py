import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

project_root = Path(__file__).parent.parent
[load_dotenv(path) for path in project_root.glob(".*env")]
os.chdir(project_root)

flaskapp = os.environ.get("FLASK_APP")
if not flaskapp:
    raise Exception(
        'Environment variable "FLASK_APP" is not set. \
        Please set it to relevant value that would run the Flask app \
        (e.g. "flaskapp") either through a .env file in the project root \
        or setting it manually.'
    )

# Python/Flask configuration
FLASK_PATH = os.path.join(project_root, flaskapp)
STATIC_PATH = os.path.join(project_root, flaskapp, "static")
TEMPLATES_PATH = os.path.join(project_root, flaskapp, "templates")
PUBLIC_PATH = os.path.join(project_root, flaskapp, "public")
# Vite/Svelte configuration
STATIC_DIRNAME = "static"
PUBLIC_DIRNAME = "public"
DIST_PATH = os.path.join(project_root, "svelte", "dist")
SRC_PATH = os.path.join(project_root, "svelte", "src")

distfiles = []
for root, dirs, files in os.walk(DIST_PATH):
    if files == ["index.html"]:
        sec = Path(root).parent.name
        name = Path(root).name

        dst_dir = os.path.join(TEMPLATES_PATH, sec)
        os.makedirs(dst_dir, exist_ok=True)

        shutil.copyfile(
            os.path.join(root, "index.html"), os.path.join(dst_dir, f"{name}.html")
        )
    for file in files:
        fullpath = os.path.join(root, file)
        projectpath = Path(fullpath).relative_to(DIST_PATH)
        distfiles.append(str(projectpath))

shutil.copytree(
    os.path.join(DIST_PATH, STATIC_DIRNAME), STATIC_PATH, dirs_exist_ok=True
)
shutil.copytree(os.path.join(SRC_PATH, PUBLIC_DIRNAME), PUBLIC_PATH, dirs_exist_ok=True)

DISTFILES_PATH = "svelte/distfiles.txt"

with open(DISTFILES_PATH, "r") as f:
    old_distfiles = f.read().split("\n")
with open(DISTFILES_PATH, "w+") as f:
    old_distfiles_str = f.read()
    f.write("\n".join(distfiles))

to_delete = [file for file in old_distfiles if file not in distfiles]

# Delete old HTML files

for filepath in to_delete.copy():
    path = Path(filepath)
    if path.name == "index.html":
        sec = path.parent.parent.name
        name = path.parent.name

        dst_dir = os.path.join(TEMPLATES_PATH, sec)
        Path(os.path.join(dst_dir, f"{name}.html")).unlink(missing_ok=True)
        to_delete.remove(filepath)

# Delete old static files

for filepath in to_delete.copy():
    path = Path(filepath)
    if Path(os.path.commonpath([STATIC_DIRNAME, filepath])) == Path(STATIC_DIRNAME):
        # if path.parts[0] == "static":
        Path(os.path.join(FLASK_PATH, path)).unlink(missing_ok=True)
        to_delete.remove(filepath)

# Delete old public files

for filepath in to_delete:
    Path(os.path.join(PUBLIC_PATH, filepath)).unlink(missing_ok=True)


# Delete empty directories
# https://stackoverflow.com/a/65624165/11493659
def delete_empty_folders(root):
    deleted = set()

    for current_dir, subdirs, files in os.walk(root, topdown=False):
        still_has_subdirs = False
        for subdir in subdirs:
            if os.path.join(current_dir, subdir) not in deleted:
                still_has_subdirs = True
                break

        if not any(files) and not still_has_subdirs:
            os.rmdir(current_dir)
            deleted.add(current_dir)


delete_empty_folders(FLASK_PATH)
