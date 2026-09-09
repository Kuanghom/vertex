import api from './api';
import moment from 'moment';
import 'less';
import { createApp, ref, defineComponent } from 'vue';
import {
  Button, Form, Input, Message, Menu, Layout,
  Drawer, Table, Divider, Descriptions, Col, Row, Tag,
  Checkbox, Select, Dropdown, Switch, Upload, Modal,
  Radio, Popover, Popconfirm, Tree, Alert, Tooltip, notification as Notification,
  Space, ConfigProvider, Pagination
} from 'ant-design-vue';
import App from './App';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, LineChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent,
  DataZoomComponent,
  ToolboxComponent
} from 'echarts/components';
import VChart from 'vue-echarts';
import 'zrender/lib/svg/svg';
import VueLazyLoad from 'vue-lazyload-next';
import md5 from 'md5-node';

import router from './routes';
import './registerServiceWorker';
import './styles/fnos.css';
import responsive, { initViewport } from './mixins/responsive';
import FnColumnSettings from './components/FnColumnSettings.vue';
import FnEntity from './components/FnEntity.vue';
import FnFilter from './components/FnFilter.vue';
import FnListSearch from './components/FnListSearch.vue';
import FnOps from './components/FnOps.vue';
import FnLogFeed from './components/FnLogFeed.vue';
import FnUnitInput from './components/FnUnitInput.vue';
import { applyListDensity } from './util/listDensity';

library.add(fas);
library.add(fab);

use([
  CanvasRenderer,
  PieChart,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphicComponent,
  DataZoomComponent,
  ToolboxComponent
]);

const app = createApp(App);
const components = [
  Button, Form, Input, Menu, Layout, Drawer,
  Table, Divider, Descriptions, Col, Row, Tag,
  Checkbox, Select, Dropdown, Switch, Upload, Modal,
  Radio, Popover, Popconfirm, Tree, Alert, Tooltip, Space, ConfigProvider, Pagination
];

for (const component of components) {
  app.use(component);
}

app.use(VueLazyLoad, {
  loading: '/assets/images/loading.gif'
});

app.component('v-chart', VChart);

app.component('v-nodes', (_, {
  attrs
}) => {
  return attrs.vnodes;
});

app.component('fa', FontAwesomeIcon);
app.component('fn-column-settings', FnColumnSettings);
app.component('fn-entity', FnEntity);
app.component('fn-filter', FnFilter);
app.component('fn-list-search', FnListSearch);
app.component('fn-ops', FnOps);
app.component('fn-log-feed', FnLogFeed);
app.component('fn-unit-input', FnUnitInput);

router.beforeEach((to, from) => {
  if (to.meta.title) {
    document.title = to.meta.title + ' :: Vertex';
  }
});

app.use(router);

const message = () => {
  return Message;
};

const notification = () => {
  return Notification;
};

const formatSize = (_size) => {
  const raw = Number(_size);
  const safe = Number.isFinite(raw) ? raw : 0;
  const tag = safe < 0;
  const size = Math.abs(safe);
  if (size < 1024) {
    return (tag ? '-' : '') + `${size.toFixed(2)} Byte`;
  }
  if (size < 1024 * 1024) {
    return (tag ? '-' : '') + `${(size / 1024).toFixed(2)} KiB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return (tag ? '-' : '') + `${(size / 1024 / 1024).toFixed(2)} MiB`;
  }
  if (size < 1024 * 1024 * 1024 * 1024) {
    return (tag ? '-' : '') + `${(size / 1024 / 1024 / 1024).toFixed(2)} GiB`;
  }
  if (size < 1024 * 1024 * 1024 * 1024 * 1024) {
    return (tag ? '-' : '') + `${(size / 1024 / 1024 / 1024 / 1024).toFixed(2)} TiB`;
  }
  if (size < 1024 * 1024 * 1024 * 1024 * 1024 * 1024) {
    return (tag ? '-' : '') + `${(size / 1024 / 1024 / 1024 / 1024 / 1024).toFixed(3)} PiB`;
  }
  return '0 Byte';
};

initViewport();
applyListDensity();
app.mixin(responsive);

app.mixin({
  methods: {
    $goto: (a, b) => {
      b.push(a);
    },
    $openDrawer: (name) => {
      window.dispatchEvent(new CustomEvent('vertex-drawer', { detail: name }));
    },
    $api: api,
    $moment: moment,
    $message: message,
    $notification: notification,
    $defineComponent: defineComponent,
    $formatSize: formatSize,
    $ref: ref,
    $md5: md5
  }
});

app.mount('#app');
