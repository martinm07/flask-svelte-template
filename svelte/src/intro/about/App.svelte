<script>
  import inkling from "./assets/inkling_pink.jpg";
  let count = 0;
</script>

<main class="main">
  <img src={inkling} alt="" />
  <button on:click={() => count++}>Clicks: {count}</button><br />
  If I'm able to view this text in a font that isn't monospace, then I'm happy, but
  less so because I'm more confident that I'll be able to.
</main>

<style>
  :root {
    --colour-red: #ff0000;
  }

  .main {
    color: var(--colour-red);
    text-decoration: dotted;
  }
  main img {
    border: 2px solid #000;
  }
</style>
