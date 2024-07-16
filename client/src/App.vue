<!-- src/App.vue -->
<template>
  <div id="app">
    <TaskManager />
  </div>
</template>

<script>
import '@fortawesome/fontawesome-free/css/all.css';
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