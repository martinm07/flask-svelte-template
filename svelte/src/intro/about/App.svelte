<script lang="ts">
  import "./style.css";
  import "./../privacy/style2.css";
  import inkling from "./inkling_pink.jpg";
  import disgust from "./disgust.png";

  let count = $state(0);
  let value = $state("Booyah");

  function increment() {
    count += 1;
  }
</script>

<h1>About</h1>
<button onclick={increment}>clicks: {count}</button>
<input bind:value type="text" />
<h1>{value}</h1>
<img src={inkling} alt="" />
<img src={disgust} alt="" />

<style>
  button {
    color: #f00;
    padding: 5px 15px;
    border-radius: 10px;
  }
</style>
