### Using the Svelte UI Framework within a Python Flask Application

The goal here is to develop [Svelte](https://svelte.dev/) components/views using the [Vite](https://vitejs.dev/) dev server. Then, when it's time to connect
them to the actual backend (i.e. [Flask](https://flask.palletsprojects.com/en/2.1.x/)), building and adapting to the structure of a Flask app, transpiling
into regular Javascript and moving the bundled files into the Flask app around it (in the file tree) and
updating the file paths in the code accordingly. This will make it as simple as hooking up the `.html` file
like any other:

```python
@app.route('/about')
def about():
  return render_template('intro/about.html')
```

Here's an example of the file structure for the Flask app, and then for the Svelte development:

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
`index.html`, `main.js`, `App.svelte`, etc. and within `assets/` you can sort and nest your files however you want (these things will get replaced when being built). Note that the Vite development server only recognizes specifically
`index.html` as an entry point, and then for the about page it'd be `http://localhost:3000/intro/about/` (the
trailing slash is important).<br>
In `svelte/` all `assets` folders must always be called `assets`.<br>
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

### Using it

The idea is to have the development of a regular Flask app, and then when you want to develop views with
a more advanced frontend, switch to the svelte folder, where you use the Vite development server to develop
the Svelte components. As the `package.json` defines, simply use `npm run dev` to start.<br>
Of course during this development, the frontend will still need to communicate with a backend. This would
typically be done with `{{ url_for() }}` to make fetch requests along with other Jinja templates, however
we obviously don't have Jinja here, and the backend wouldn't be running (or at most on a different domain).
There isn't much that can be done here, and you would just kind of have to pretend that such code will work
and do development using test/placeholder values. Something like this, for example:

```html
<head>
  <!-- ... -->
</head>
<body>
  <!-- ... -->
  <script>
    let getUser, getNotifs, posts;
    try {
      getUser = "{{ url_for('auth.get_active') }}";
      getNotifs = "{{ url_for('blog.get_notifs', user=current_user.id) }}";
      posts = "{{ posts }}";

      if (!Number.parseInt("{{ 1 }}")) throw new Error("Jinja wasn't parsed.");
    } catch (e) {
      return;
    }
  </script>
  <script type="module" src="./main.js"></script>
</body>
```

Then in your `App.svelte` you could assign test values at the top like this:

```javascript
posts ??= [
  { title: "The Philosophy of Grasshoppers", body: "..." },
  { title: "An Adventure in Stubbornness and Ignorance", body: "..." },
];

// and then fetches later on as they show up:
const res = (await getNotifs) ? fetch(getNotifs) : timeout(3, ["blah blah..."]);

function timeout(s, data) {
  return new Promise(function (resolve, _) {
    setTimeout(function () {
      resolve(data);
    }, s * 1000);
  });
}
```

This code can work in the Vite dev server and the Flask server without needing to change anything.
Of course that doesn't forgive the fact that this is quite tedious, and the big pain point of this
workflow, but it's the best solution I could come up with.

Anyways, once you'd like to move your new views into the Flask server, simply run `npm run build`.
This will build the Svelte into regular Javascript and do all the annoying stuff like deleting old
files, moving the bundled files into the flask app, updating all the links to static files (a.k.a.
"assets" in Vite land) within the code to work on a flask app, and sorting it as intended. Once
you've done this you can just set up a simple view (like at top of this README) and it should work.

Note to run the Flask server get out of the "svelte" directory, set some environment variables
`set FLASK_APP=flask-app` (this one's also required for the build command), `set FLASK_ENV=development`,
and then `flask run`.
