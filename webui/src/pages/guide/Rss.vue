<template>
  <div class="fn-page">
    <p class="fn-guide-lead">按这三步就能建好一条 RSS 任务，字段与「任务配置 → Rss 任务」相同。</p>
    <ol class="fn-guide-steps">
      <li>在「基础组件 → 下载器」添加并启用下载器</li>
      <li>在「规则组件 → RSS 规则」写接受 / 拒绝条件</li>
      <li>在「Rss 任务」填写 RSS 地址、绑定下载器后保存</li>
    </ol>
    <a-space>
      <a-button type="primary" @click="$goto('/guide/presets', $router)">快速导入</a-button>
      <a-button @click="$goto('/base/downloader', $router)">下载器</a-button>
      <a-button @click="$goto('/rule/rss', $router)">RSS 规则</a-button>
      <a-button type="primary" @click="$goto('/task/rss', $router)">去创建任务</a-button>
    </a-space>
  </div>
</template>
