<script lang="ts">
  import "./style2.css";
  // import "./../about/style.css";
  let count = $state(0);
  let value = $state("Booyah");

  function increment() {
    count += 1;
  }
</script>

<h1>Privacy</h1>
<button onclick={increment}>clicks: {count}</button>
<input bind:value type="text" />
<h1>{value}</h1>

<style>
  h1 {
    text-align: center;
  }
  button {
    padding: 3px 5px;
  }
</style>
