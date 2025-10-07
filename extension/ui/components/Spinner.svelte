<script lang="ts">
  export let size: number = 14;
</script>

<div class="spinner" style={`width:${size}px;height:${size}px`}></div>

<style>
  .spinner {
    border: 2px solid #c7d2fe;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 6px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
