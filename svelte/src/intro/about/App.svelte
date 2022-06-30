<script>
  import { fly } from "svelte/transition";
  let open = false;
</script>

<main class="main">
  <div class="btn-container">
    <button on:click={() => (open = !open)}
      >{open ? "Close" : "Open"} About section</button
    >
  </div>
  {#if open}
    <div transition:fly={{ y: -10, duration: 300 }}>
      Welcome to the about section of nothing in particular.<br />
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
      incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
      nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
      eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
      in culpa qui officia deserunt mollit anim id est laborum.
    </div>
  {/if}
</main>

<style>
  :root {
    --colour-red: #ff0000;
  }
  .main {
    color: var(--colour-red);
    font-family: "Courier New", Courier, monospace;
    font-weight: bold;
  }

  .btn-container {
    text-align: center;
  }
  button {
    width: 200px;
    height: 33px;
  }

  div {
    width: 50vw;
    margin-left: 25vw;
    margin-top: 20px;
  }
</style>
