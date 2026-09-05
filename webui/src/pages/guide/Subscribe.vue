<template>
  <div class="fn-page">
    <p class="fn-guide-lead">追剧任务走豆瓣想看列表。配置入口与「任务配置 → 订阅任务」相同。</p>
    <ol class="fn-guide-steps">
      <li>在「基础组件」准备下载器、站点和通知工具</li>
      <li>在「订阅任务」填写豆瓣 Cookie 并配置分类路径</li>
      <li>到「影视搜索 / 手动添加」写入想看条目，再到「订阅列表」查看</li>
    </ol>
    <a-space>
      <a-button @click="$goto('/task/subscribe', $router)">订阅任务</a-button>
      <a-button @click="$goto('/subscribe/search', $router)">影视搜索</a-button>
      <a-button type="primary" @click="$goto('/subscribe/list', $router)">订阅列表</a-button>
    </a-space>
  </div>
</template>
