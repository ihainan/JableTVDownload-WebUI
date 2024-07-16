<!-- src/App.vue -->
<template>
  <div id="app">
    <TaskManager />
  </div>
</template>

<script>
import TaskManager from './components/TaskManager.vue';

export default {
  name: 'App',
  components: {
    TaskManager
  }
};
</script>

<style>
/* 你的样式 */
</style>