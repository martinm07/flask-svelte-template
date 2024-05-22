<script lang="ts">
  import "/intro/about/style.css";
  import "/intro/privacy/style2.css";
  import { fetch_ } from "/shared/helper";

  import forks from "./img1.png";

  let count = $state(0);
  let value = $state("Booyah");
  function increment() {
    count += 1;
  }

  function addUser() {
    fetch_("add_user", {
      method: "POST",
      body: value,
      headers: { "Content-Type": "text/plain" },
    }).then((resp) => console.log(resp));
  }
</script>

<h1>Home</h1>
<button onclick={increment}>clicks: {count}</button>
<input bind:value type="text" />
<h1>{value}</h1>
<button onclick={addUser}>Add User!</button>

<img src={forks} alt="" />

<style>
  h1 {
    text-align: center;
  }
  button {
    padding: 3px 5px;
  }
</style>
