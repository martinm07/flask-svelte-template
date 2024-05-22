### Using the Svelte UI Framework within a Python Flask Application

**This project uses the (current experimental) Svelte 5 and vite-plugin-svelte v4.**

The goal here is to develop [Svelte](https://svelte.dev/) components/views using the [Vite](https://vitejs.dev/) dev server. Then, when it's time to connect
them to the actual backend (i.e. [Flask](https://flask.palletsprojects.com/en/2.1.x/)), building and adapting to the structure of a Flask app, transpiling into regular Javascript and moving the bundled files into the Flask app around it (in the file tree).
This will make it as simple as hooking up the `.html` file like any other:

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
│  │  ├─ about.html
│  ├─ auth/
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
│  │  │  ├─ main.ts
│  ├─ auth/
│  ├─ shared/
├─ vite.config.ts
├─ package.json
├─ build-svelte.py
├─ distfiles.txt
.gitignore
```

To better sort concerns, we have general "sections" of the website, containing related pages.
In the above example that would be "intro" and "auth", with "intro" having the "about" page.

### Usage

**Every Svelte view you develop MUST be within svelte/src under a subdirectory indicating the section name, and a sub-sub directory indicating the view's name.** Specifically, it is the `index.html` file&mdash;serving as the entry point&mdash;that must follow this rule. Nothing else technically has to, and the build step will see for itself what in the dependency graph can go under what sections.

In the Vite development server (change directory to "svelte/" and run "npm run dev"), you can access your views as "http://localhost:5173/intro/about/" (note the trailing slash, and make sure port is correct). It will only recognize specifically the name `index.html` as the entry point for any directory, and other parts of this project are the same. **Make sure your entry point is named `index.html`.**

In `svelte/vite.config.ts`, near the top of the file you should see the definition for `entryPoints`. Make sure you modify this with whatever views you want to include in the build:

```typescript
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

The build is created with "npm run build". This will place it in `svelte/dist/`, already following the structure of the Flask app thanks to `vite.config.ts`, and the `build-svelte.py` script will copy it over to `flaskapp` (or whatever you call it), deleting the old versions of files from the previous build using `distfiles.txt`, which it keeps updated automatically.

The frontend still needs to communicate with the backend. One way to do this is with Jinja templating. However, that whole system is significantly neutered in this workflow. Any templating you want needs to be inside the `index.html` file, so you'd do something like this:

```html
<head>
  <!-- ... -->
</head>
<body>
  <!-- ... -->
  <script>
    // We need to use globalThis because the main.ts script being type="module"
    //  means there's no other way to share information.
    globalThis.jinjaParsed = false;
    try {
      if (!Number.parseInt("{{ 1 }}")) throw new Error("Jinja wasn't parsed.");
      globalThis.jinjaParsed = true;

      globalThis.csrfToken = "{{ csrf_token() }}";
      globalThis.getUser = "{{ url_for('auth.get_active') }}";
      globalThis.getNotifs =
        "{{ url_for('blog.get_notifs', user=current_user.id) }}";
      globalThis.posts = "{{ posts }}";
    } catch (e) {
      globalThis.getUser = "http://127.0.0.1:5000/auth/get_active";
      globalThis.getNotifs = "http://127.0.0.1:5000/blog/get_notifs?user=0";
      globalThis.posts = `[
        { title: "Seventeen And a Half Voice Modalities", body: "..." },
        { title: "A Triage of Spoons Indicating Water Wealth", body: "..." },
      ]`;
      return;
    }
  </script>
  <script type="module" src="./main.ts"></script>
</body>
```

Because the Vite dev server obviously can't process the Jinja, for development purposes you also need to provide default (mock) values. This kind of ruins the point of using url_for instead of, well, hardcoding the URLs, for example, but for things like `globalThis.posts` the benefit is in production you have 1 less additional request you're making every time someone loads the page.

Jinja isn't the only way though. The same can be done by making API endpoints on the Flask side, and using them with `fetch()` calls on the Svelte side. Note above, that when we mock `getUser` and `getNotifs` we're providing fully resolved URLs to a seperate localhost! What this implies is that during development you have two servers active simultaneously; the Vite dev server, and the Flask server (`flask run` at the project root). That way you can work on both simultaneously, making sure the two ends integrate properly. This does mean that you're making cross-origin (CORS) requests (only during development, in production it's all same-origin), which is something you need to enable explicitly for your Flask views and fetch calls. To do that there is a custom decorator and fetch function respectively you can use:

```svelte
<!-- In, for example, svelte/intro/home/App.svelte -->
<script lang="ts">
  import { fetch_ } from "/shared/helper";

  let value = $state("Username");

  function addUser() {
    fetch_("http://127.0.0.1:5000/add_user", {
      method: "POST",
      body: value,
      headers: { "Content-Type": "text/plain" },
    }).then((resp) => console.log(resp));
  }
</script>

<input bind:value type="text" />
<button onclick={addUser}>Add User!</button>
```

```python
# In, for example, flaskapp/home.py
from .helper import cors_enabled

@bp.route("/add_user", methods=["OPTIONS", "POST"])
@cors_enabled(methods=["POST"])
def add_user():
    username: str = request.data.decode("utf-8")
    # Add user logic...

    return "", 201
```

There is some additional boilerplate needed in the `index.html` (specifically the `globalThis.jinjaParsed` and `globalThis.csrfToken` variable as included in the above Jinja HTML example) in order to get it to switch behaviour appropriately in production.

### Running it (CMD)

```cmd
git clone https://github.com/martinm07/flask-svelte-template.git
cd flask-svelte-template
python -m venv ./venv
venv/Scripts/activate
pip install -r requirements.txt
cd svelte
npm install
npm run build
cd ..
flask run
```
