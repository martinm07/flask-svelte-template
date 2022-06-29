### Using the Svelte UI Framework within a Python Flask Application

The goal here is to develop components/views using the Vite dev server. Then, when it's time to connect
them to the actual backend (i.e. Flask), building and adapting to the structure of a Flask app, transpiling
into regular Javascript and moving the bundled files into the Flask app around it (in the file tree) and
updating the file paths in the code accordingly. This will make it as simple as hooking up the `.html` file
like any other:

```python
@app.route('/about')
def about():
  return render_template('intro/about.html')
```

Here's the file structure for the Flask app, and then for the Svelte development:

```
my-flask-app/
├─ static/
│  ├─ intro/
│  │  ├─ css/
│  │  ├─ img/
│  ├─ auth/
│  │  ├─ css/
│  │  ├─ js/
|  ├─ shared/
├─ templates/
│  ├─ intro/
│  ├─ auth/
│  ├─ base.html
├─ __init__.py
├─ db.py
├─ intro.py
├─ auth.py
svelte/
├─ src/
│  ├─ intro/
│  │  ├─ about/
│  │  │  ├─ assets/
│  │  │  ├─ App.svelte
│  │  │  ├─ index.html
│  │  │  ├─ main.js
│  ├─ auth/
│  ├─ shared/
├─ vite.config.js
├─ package.json
├─ build-svelte.py
instance/
.gitignore
unibeautifyrc.yaml
```

To better sort concerns, we have general "sections" of the website, containing related pages.
In the above example that would be "intro" and "auth", with "intro" having the "about" page.

In `svelte/src/` the directories must be the section names, which must be the exact same names
as the directories in `my-flask-app/templates/` which must be the same as in `my-flask-app/static/`.<br>
In `svelte/src/<section-name>/` the directories must be the desired names of the `.html` files
when these get built later into "templates". Within those directories can be generic filenames like
`index.html`, `main.js`, `App.svelte`, etc. (these names will get replaced with the directory name
and input name in the Vite config). Note that the Vite development server only recognizes specifically
`index.html` as an entry point, and then for the about page it'd be `http://localhost:3000/intro/about/` (the
trailing slash is important).<br>
In `svelte/vite.config.js`, the `build.rollupOptions.input` object needs to contain key/value pairs
for all the pages you want to build, where the key is the desired name of the `.html` file (exactly like
the names of the directories within `svelte/src/<section-name>/`), and the value is the path to the
`index.html` file. Like this:

```javascript
import { defineConfig } from "vite";
import { resolve, dirname } from "path";

// ...boilerplate...

const entryPoints = {
  // HERE
  about: resolve(root, "intro/about/index.html"),
};

// ...
export default defineConfig({
  build: {
    rollupOptions: {
      input: entryPoints,
    },
  },
});
```
