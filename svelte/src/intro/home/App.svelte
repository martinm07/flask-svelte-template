<script lang="ts">
  import "./../about/style.css";
  import "./../privacy/style2.css";
  import forks from "./img1.png";
  let count = $state(0);
  let value = $state("Booyah");

  function increment() {
    count += 1;
  }
</script>

<h1>Home</h1>
<button onclick={increment}>clicks: {count}</button>
<input bind:value type="text" />
<h1>{value}</h1>
<img src={forks} alt="" />

<style>
  h1 {
    text-align: center;
  }
  button {
    padding: 3px 5px;
  }
</style>
