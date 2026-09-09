import { createRouter, createWebHistory } from 'vue-router';
import { beginPageLoad } from '../util/pageLoad';

import Index from '@/pages/Index';
import Layout from '@/pages/Layout';

const Login = () => import(/* webpackChunkName: "page-login" */ '@/pages/user/Login');
const DashboardIndex = () => import(/* webpackChunkName: "page-dashboard" */ '@/pages/dashboard/Index');
const BaseServer = () => import(/* webpackChunkName: "page-base" */ '@/pages/base/Server');
const BaseDownloader = () => import(/* webpackChunkName: "page-base" */ '@/pages/base/Downloader');
const BaseSite = () => import(/* webpackChunkName: "page-base" */ '@/pages/base/Site');
const BaseNotification = () => import(/* webpackChunkName: "page-base" */ '@/pages/base/Notification');
const BaseSiteTag = () => import(/* webpackChunkName: "page-base" */ '@/pages/base/SiteTag');
const MetricServer = () => import(/* webpackChunkName: "page-metric" */ '@/pages/metric/Server');
const MetricDownloader = () => import(/* webpackChunkName: "page-metric" */ '@/pages/metric/Downloader');
const MetricSite = () => import(/* webpackChunkName: "page-metric" */ '@/pages/metric/Site');
const RuleDelete = () => import(/* webpackChunkName: "page-rule" */ '@/pages/rule/Delete');
const RuleLink = () => import(/* webpackChunkName: "page-rule" */ '@/pages/rule/Link');
const RuleRss = () => import(/* webpackChunkName: "page-rule" */ '@/pages/rule/Rss');
const RuleSelect = () => import(/* webpackChunkName: "page-rule" */ '@/pages/rule/Select');
const RuleAllocate = () => import(/* webpackChunkName: "page-rule" */ '@/pages/rule/Allocate');
const TaskRss = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/Rss');
const TaskSubscribe = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/Subscribe');
const TaskLink = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/Link');
const TaskBulkLink = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/BulkLink');
const TaskWatchCategory = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/WatchCategory');
const TaskScript = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/Script');
const TaskScrape = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/Scrape');
const TaskU2Rss = () => import(/* webpackChunkName: "page-task" */ '@/pages/task/U2Rss');
const GuideSubsribe = () => import(/* webpackChunkName: "page-guide" */ '@/pages/guide/Subscribe');
const GuidePresets = () => import(/* webpackChunkName: "page-guide" */ '@/pages/guide/Presets');
const GuideRss = () => import(/* webpackChunkName: "page-guide" */ '@/pages/guide/Rss');
const ToolMikanHistory = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/MikanHistory');
const ToolNetworkTest = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/NetworkTest');
const ToolMTeamLogin = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/MTeamLogin');
const ToolHosts = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/Hosts');
const ToolProxy = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/Proxy');
const ToolShell = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/Shell');
const ToolPathGenerator = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/PathGenerator');
const ToolClientLog = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/ClientLog');
const ToolClearHistory = () => import(/* webpackChunkName: "page-tool" */ '@/pages/tool/ClearHistory');
const InfoInfo = () => import(/* webpackChunkName: "page-info" */ '@/pages/info/Info');
const InfoLog = () => import(/* webpackChunkName: "page-info" */ '@/pages/info/Log');
const InfoAbout = () => import(/* webpackChunkName: "page-info" */ '@/pages/info/About');
const SettingBase = () => import(/* webpackChunkName: "page-setting" */ '@/pages/setting/Base');
const SettingStyle = () => import(/* webpackChunkName: "page-setting" */ '@/pages/setting/Style');
const SettingSecurity = () => import(/* webpackChunkName: "page-setting" */ '@/pages/setting/Security');
const SettingInteraction = () => import(/* webpackChunkName: "page-setting" */ '@/pages/setting/Interaction');
const SettingMenu = () => import(/* webpackChunkName: "page-setting" */ '@/pages/setting/Menu');
const SettingBackup = () => import(/* webpackChunkName: "page-setting" */ '@/pages/setting/Backup');
const SettingCookieCloud = () => import(/* webpackChunkName: "page-setting" */ '@/pages/setting/CookieCloud');
const SubscribeList = () => import(/* webpackChunkName: "page-subscribe" */ '@/pages/subscribe/List');
const SubscribeDetail = () => import(/* webpackChunkName: "page-subscribe" */ '@/pages/subscribe/Detail');
const SubscribeAdd = () => import(/* webpackChunkName: "page-subscribe" */ '@/pages/subscribe/Add');
const SubscribeSearch = () => import(/* webpackChunkName: "page-subscribe" */ '@/pages/subscribe/Search');
const HistoryRss = () => import(/* webpackChunkName: "page-history" */ '@/pages/history/Rss');
const HistorySubsribe = () => import(/* webpackChunkName: "page-history" */ '@/pages/history/Subscribe');
const HistoryWatchCategory = () => import(/* webpackChunkName: "page-history" */ '@/pages/history/WatchCategory');
const MixSearch = () => import(/* webpackChunkName: "page-mix" */ '@/pages/mix/Search');
const MixDownloader = () => import(/* webpackChunkName: "page-mix" */ '@/pages/mix/Downloader');

const user = {
  path: 'user',
  component: Index,
  children: [
    {
      path: 'login',
      component: Login,
      meta: {
        title: '用户登录'
      }
    }
  ]
};

const index = {
  path: 'index',
  component: Layout,
  redirect: '/index',
  children: [
    {
      path: '',
      component: DashboardIndex,
      meta: {
        title: '首页'
      }
    }
  ]
};

const metric = {
  path: 'metric',
  component: Layout,
  redirect: '/metric/server',
  children: [
    {
      path: 'server',
      component: MetricServer,
      meta: {
        title: '服务器 - 数据监控'
      }
    }, {
      path: 'downloader',
      component: MetricDownloader,
      meta: {
        title: '下载器 - 数据监控'
      }
    }, {
      path: 'site',
      component: MetricSite,
      meta: {
        title: '站点 - 数据监控'
      }
    }
  ]
};

const rule = {
  path: 'rule',
  component: Layout,
  redirect: '/rule/delete',
  children: [
    {
      path: 'delete',
      component: RuleDelete,
      meta: {
        title: '删种规则 - 规则组件'
      }
    }, {
      path: 'rss',
      component: RuleRss,
      meta: {
        title: 'RSS 规则 - 规则组件'
      }
    }, {
      path: 'select',
      component: RuleSelect,
      meta: {
        title: '选种规则 - 规则组件'
      }
    },     {
      path: 'link',
      component: RuleLink,
      meta: {
        title: '链接规则 - 规则组件'
      }
    }, {
      path: 'allocate',
      component: RuleAllocate,
      meta: {
        title: '分配规则 - 规则组件'
      }
    }
  ]
};

const base = {
  path: 'base',
  component: Layout,
  redirect: '/base/server',
  children: [
    {
      path: 'server',
      component: BaseServer,
      meta: {
        title: '服务器 - 基础组件'
      }
    }, {
      path: 'downloader',
      component: BaseDownloader,
      meta: {
        title: '下载器 - 基础组件'
      }
    }, {
      path: 'site',
      component: BaseSite,
      meta: {
        title: '站点 - 基础组件'
      }
    }, {
      path: 'notification',
      component: BaseNotification,
      meta: {
        title: '通知工具 - 基础组件'
      }
    }, {
      path: 'siteTag',
      component: BaseSiteTag,
      meta: {
        title: '站点标签 - 基础组件'
      }
    }
  ]
};

const info = {
  path: 'info',
  component: Layout,
  redirect: '/info/about',
  children: [
    {
      path: 'info',
      component: InfoInfo,
      meta: {
        title: '系统信息 - 系统信息'
      }
    }, {
      path: 'log',
      component: InfoLog,
      meta: {
        title: '系统日志',
        bare: true
      }
    }, {
      path: 'about',
      component: InfoAbout,
      meta: {
        title: '关于 - 系统信息'
      }
    }
  ]
};

const setting = {
  path: 'setting',
  component: Layout,
  redirect: '/setting/base',
  children: [
    {
      path: 'base',
      component: SettingBase,
      meta: {
        title: '基础设置 - 系统设置'
      }
    }, {
      path: 'style',
      component: SettingStyle,
      meta: {
        title: '主题设置 - 系统设置'
      }
    }, {
      path: 'security',
      component: SettingSecurity,
      meta: {
        title: '安全设置 - 系统设置'
      }
    }, {
      path: 'interaction',
      component: SettingInteraction,
      meta: {
        title: '交互设置 - 系统设置'
      }
    }, {
      path: 'menu',
      component: SettingMenu,
      meta: {
        title: '菜单设置 - 系统设置'
      }
    }, {
      path: 'cc',
      component: SettingCookieCloud,
      meta: {
        title: 'CookieCloud - 系统设置'
      }
    }, {
      path: 'backup',
      component: SettingBackup,
      meta: {
        title: '备份还原 - 系统设置'
      }
    }
  ]
};

const task = {
  path: 'task',
  component: Layout,
  redirect: '/task/rss',
  children: [
    {
      path: 'rss',
      component: TaskRss,
      meta: {
        title: 'Rss 任务 - 任务配置'
      }
    }, {
      path: 'subscribe',
      component: TaskSubscribe,
      meta: {
        title: '订阅任务 - 任务配置'
      }
    }, {
      path: 'link',
      component: TaskLink,
      meta: {
        title: '链接文件 - 任务配置'
      }
    }, {
      path: 'bulkLink',
      component: TaskBulkLink,
      meta: {
        title: '批量链接 - 任务配置'
      }
    }, {
      path: 'watchCategory',
      component: TaskWatchCategory,
      meta: {
        title: '监控分类 - 任务配置'
      }
    }, {
      path: 'script',
      component: TaskScript,
      meta: {
        title: '定时脚本 - 任务配置'
      }
    }, {
      path: 'u2Rss',
      component: TaskU2Rss,
      meta: {
        title: 'U2 RSS - 任务配置'
      }
    }, {
      path: 'scrape',
      component: TaskScrape,
      meta: {
        title: '站点扩展 - 任务配置'
      }
    }
  ]
};

const history = {
  path: 'history',
  component: Layout,
  redirect: '/history/rss',
  children: [
    {
      path: 'rss',
      component: HistoryRss,
      meta: {
        title: 'RSS 历史 - 任务历史'
      }
    }, {
      path: 'subscribe',
      component: HistorySubsribe,
      meta: {
        title: '订阅历史 - 任务历史'
      }
    }, {
      path: 'watchCategory',
      component: HistoryWatchCategory,
      meta: {
        title: '监控分类历史 - 任务历史'
      }
    }
  ]
};

const mix = {
  path: 'mix',
  component: Layout,
  redirect: '/mix/search',
  children: [
    {
      path: 'search',
      component: MixSearch,
      meta: {
        title: '种子搜索 - 聚合操作'
      }
    }, {
      path: 'downloader',
      component: MixDownloader,
      meta: {
        title: '种子聚合 - 聚合操作'
      }
    }
  ]
};

const guide = {
  path: 'guide',
  component: Layout,
  redirect: '/guide/presets',
  children: [
    {
      path: 'presets',
      component: GuidePresets,
      meta: {
        title: '快速导入 - 任务引导'
      }
    }, {
      path: 'rss',
      component: GuideRss,
      meta: {
        title: 'RSS 引导 - 任务引导'
      }
    }, {
      path: 'subscribe',
      component: GuideSubsribe,
      meta: {
        title: '订阅引导 - 任务引导'
      }
    }
  ]
};

const tool = {
  path: 'tool',
  component: Layout,
  redirect: '/tool/networkTest',
  children: [
    {
      path: 'mikanHistory',
      component: ToolMikanHistory,
      meta: {
        title: '蜜柑番剧历史 - 常用工具'
      }
    }, {
      path: 'networkTest',
      component: ToolNetworkTest,
      meta: {
        title: '网络测试 - 常用工具'
      }
    }, {
      path: 'mteamLogin',
      component: ToolMTeamLogin,
      meta: {
        title: 'MTEAM 登录 - 常用工具'
      }
    }, {
      path: 'hosts',
      component: ToolHosts,
      meta: {
        title: '修改 HOSTS - 常用工具'
      }
    }, {
      path: 'proxy',
      component: ToolProxy,
      meta: {
        title: 'HTTP 代理 - 常用工具'
      }
    }, {
      path: 'pathGenerator',
      component: ToolPathGenerator,
      meta: {
        title: '路径生成器 - 常用工具'
      }
    }, {
      path: 'clearHistory',
      component: ToolClearHistory,
      meta: {
        title: '清除历史记录 - 常用工具'
      }
    }, {
      path: 'shell/:id',
      component: ToolShell,
      meta: {
        title: 'Shell',
        bare: true
      }
    }, {
      path: 'clientLog',
      component: ToolClientLog,
      meta: {
        title: '下载器日志',
        bare: true
      }
    }
  ]
};

const subscribe = {
  path: 'subscribe',
  component: Layout,
  redirect: '/subscribe/list',
  children: [
    {
      path: 'list',
      component: SubscribeList,
      meta: {
        title: '订阅列表 - 影视订阅'
      }
    }, {
      path: 'detail/:douban/:id',
      component: SubscribeDetail,
      meta: {
        title: '详情 - 影视订阅'
      }
    }, {
      path: 'search',
      component: SubscribeSearch,
      meta: {
        title: '影视搜索 - 影视订阅'
      }
    }, {
      path: 'add',
      component: SubscribeAdd,
      meta: {
        title: '手动添加 - 影视订阅'
      }
    }
  ]
};

const routes = [{
  path: '/',
  component: Index,
  redirect: '/index',
  children: [
    user,
    index,
    metric,
    rule,
    base,
    task,
    tool,
    info,
    guide,
    subscribe,
    setting,
    history,
    mix,
    {
      path: 'scrape',
      redirect: '/task/scrape'
    }
  ]
}];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.afterEach((to, from) => {
  if (!from || to.path === from.path) return;
  if (to.path === '/user/login') return;
  beginPageLoad();
});

export default router;
