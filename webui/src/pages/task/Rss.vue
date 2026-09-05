<template>
  <div class="rss fn-page">
    <div class="fn-toolbar">
      <a-button type="primary" @click="openCreate">新增</a-button>
      <a-popover
        v-if="!isNarrow"
        v-model:visible="batchOpen"
        trigger="click"
        placement="bottomLeft"
        overlay-class-name="fn-batch-pop">
        <template #content>
          <div class="fn-batch-panel">
            <div class="fn-batch-count">{{ batchHint }}</div>
            <div class="fn-batch-actions">
              <a-select
                v-model:value="batchAction"
                :disabled="!selectedRssIds.length"
                :get-popup-container="batchPopupContainer"
                dropdown-class-name="fn-batch-dropdown"
                @change="onBatchActionChange">
                <a-select-option value="addClient">添加下载器</a-select-option>
                <a-select-option value="removeClient">移除下载器</a-select-option>
                <a-select-option value="setAllocate">设置分配方案</a-select-option>
              </a-select>
              <a-select
                v-model:value="batchValue"
                :placeholder="batchValuePlaceholder"
                :disabled="!selectedRssIds.length || !batchAction"
                :get-popup-container="batchPopupContainer"
                dropdown-class-name="fn-batch-dropdown"
                @change="runBatchAction">
                <a-select-option v-for="item of batchValueOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </div>
          </div>
        </template>
        <a-button :disabled="!selectedRssIds.length">
          {{ batchButtonText }}
        </a-button>
      </a-popover>
      <a-button v-else :disabled="!selectedRssIds.length" @click="batchOpen = true">
        {{ batchButtonText }}
      </a-button>
      <fn-column-settings
        :items="columnSettingItems"
        @toggle="toggleColumnVisible"
        @move="moveColumn"
        @dragstart="onColumnDragStart"
        @drop="onColumnDrop"
        @reset="resetColumnPrefs"/>
    </div>
    <teleport to="body">
      <div v-if="isNarrow && batchOpen" class="fn-ops-mask" @click.self="batchOpen = false">
        <div class="fn-ops-sheet fn-batch-sheet" @click.stop>
          <div class="fn-ops-sheet-handle"/>
          <div class="fn-batch-panel">
            <div class="fn-batch-count">{{ batchHint }}</div>
            <div class="fn-batch-actions">
              <a-select
                v-model:value="batchAction"
                :disabled="!selectedRssIds.length"
                :get-popup-container="batchPopupContainer"
                dropdown-class-name="fn-batch-dropdown"
                @change="onBatchActionChange">
                <a-select-option value="addClient">添加下载器</a-select-option>
                <a-select-option value="removeClient">移除下载器</a-select-option>
                <a-select-option value="setAllocate">设置分配方案</a-select-option>
              </a-select>
              <a-select
                v-model:value="batchValue"
                :placeholder="batchValuePlaceholder"
                :disabled="!selectedRssIds.length || !batchAction"
                :get-popup-container="batchPopupContainer"
                dropdown-class-name="fn-batch-dropdown"
                @change="runBatchAction">
                <a-select-option v-for="item of batchValueOptions" :key="'m-' + item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </div>
          </div>
          <button type="button" class="fn-ops-cancel" @click="batchOpen = false">取消</button>
        </div>
      </div>
    </teleport>
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="tableColumns"
      :loading="loading"
      :locale="tableLocale"
      size="middle"
      :data-source="rssList"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
      :row-selection="rssRowSelection"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enable'">
          <a-switch @change="enableTask(record)" v-model:checked="record.enable" checked-children="启用" un-checked-children="禁用"/>
        </template>
        <template v-if="column.dataIndex === 'clientArr'">
          {{ downloaders.filter(item => record.clientArr.indexOf(item.id) !== -1).map(item => item.alias).join(' / ') }}
        </template>
        <template v-if="column.dataIndex === 'allocateRule'">
          {{ allocateRuleAlias(record.allocateRule) }}
        </template>
        <template v-if="column.dataIndex === 'pushNotify'">
          <a-tag color="success" v-if="record.pushNotify">启用</a-tag>
          <a-tag color="error" v-if="!record.pushNotify">禁用</a-tag>
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="modifyClick(record)">编辑</a-button>
            <a-button type="link" @click="cloneClick(record)">克隆</a-button>
            <a-popconfirm title="确认删除这条数据？" ok-text="删除" cancel-text="取消" @confirm="deleteRss(record)">
              <a-button type="link" danger>删除</a-button>
            </a-popconfirm>
          </fn-ops>
        </template>
      </template>
    </a-table>
    <a-modal
      v-model:visible="formVisible"
      :title="formModalTitle"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
      :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="rss"
        size="small"
        @finish="modifyRss"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给 RSS 任务取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.alias"/>
        </a-form-item>
        <a-form-item
          label="启用"
          name="enable"
          extra="选择是否启用 RSS 任务"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="rss.enable">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          label="下载器"
          name="clientArr"
          extra="选择下载器, 仅可选择已经启用的下载器"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox-group style="width: 100%;" v-model:value="rss.clientArr">
            <a-row>
              <a-col v-for="downloader of downloaders" :span="8" :key="downloader.id">
                <a-checkbox
                  :disabled="!downloader.enable && !rss.clientArr.includes(downloader.id)"
                  v-model:value="downloader.id">
                  {{ downloader.alias }}
                  <span v-if="!downloader.enable" style="color: #999;">(已禁用)</span>
                </a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item
          label="分配方案"
          name="allocateRule"
          extra="多下载器时按此方案选台；可在「规则组件 - 分配规则」里扩展">
          <a-select size="small" v-model:value="rss.allocateRule">
            <a-select-option
              v-for="rule of allocateRules"
              :key="rule.id"
              :value="rule.id">
              {{ rule.alias }}{{ rule.builtin ? ' (内置)' : '' }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="排序规则"
          name="clientSortBy"
          extra="仅「原规则」分配方案使用此项；其他方案忽略"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="rss.clientSortBy">
            <a-select-option value="leechingCount">下载种子数量</a-select-option>
            <a-select-option value="uploadSpeed">当前上传速度</a-select-option>
            <a-select-option value="downloadSpeed">当前下载速度</a-select-option>
            <a-select-option value="freeSpaceOnDisk">当前剩余空间</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="下载器最高上传速度"
          name="maxClientUploadSpeed"
          extra="下载器上传速度在此速度之上时, 不添加种子, 留空或 0 不启用">
          <a-input size="small" v-model:value="rss.maxClientUploadSpeed">
            <template #addonAfter>
              <a-select size="small" v-model:value="rss.maxClientUploadSpeedUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte/s</a-select-option>
                <a-select-option value="KiB">KiB/s</a-select-option>
                <a-select-option value="MiB">MiB/s</a-select-option>
                <a-select-option value="GiB">GiB/s</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="下载器最高下载速度"
          name="maxClientDownloadSpeed"
          extra="下载器下载速度在此速度之上时, 不添加种子, 留空或 0 不启用">
          <a-input size="small" v-model:value="rss.maxClientDownloadSpeed">
            <template #addonAfter>
              <a-select size="small" v-model:value="rss.maxClientDownloadSpeedUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte/s</a-select-option>
                <a-select-option value="KiB">KiB/s</a-select-option>
                <a-select-option value="MiB">MiB/s</a-select-option>
                <a-select-option value="GiB">GiB/s</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="下载器下载任务上限"
          name="maxClientDownloadCount"
          extra="下载器下载任务之上时, 不添加种子, 留空或 0 不启用">
          <a-input size="small" v-model:value="rss.maxClientDownloadCount">
          </a-input>
        </a-form-item>
        <a-form-item
          label="RssUrl 列表"
          name="rssUrls"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-form-item-rest v-for="(item, index) in rss.rssUrls" :key="index">
            <a-input-group compact>
              <a-input size="small" v-model:value="rss.rssUrls[index]" style="width: calc(100% - 64px)"/>
              <a-button
                type="danger"
                size="small" @click="() => rss.rssUrls = rss.rssUrls.filter(i => i !== rss.rssUrls[index])"
                style="width: 64px;">删除</a-button>
            </a-input-group>
          </a-form-item-rest>
          <a-button
            size="small"
            type="primary"
            @click="rss.rssUrls.push('')"
            >
            新增
          </a-button>
        </a-form-item>
        <a-form-item
          label="促销筛选"
          name="scrapePromo"
          extra="勾选后仅添加符合促销状态的种子；多选为「或」关系，满足任一即可。不可选项表示当前 RSS 地址对应站点不支持该促销类型。">
          <a-checkbox-group v-model:value="rss.scrapePromo" style="width: 100%;">
            <a-row>
              <a-col v-for="item of promoOptions" :span="8" :key="item.value">
                <a-checkbox
                  :value="item.value"
                  :disabled="promoSupportReady && supportedPromo.indexOf(item.value) === -1">
                  <PromoTag :label="item.label" :promo-type="item.value" />
                  <span v-if="promoSupportReady && supportedPromo.indexOf(item.value) === -1" style="color: #999;">(不支持)</span>
                </a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item
          label="排除 HR"
          name="scrapeHr"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="rss.scrapeHr">排除 HR</a-checkbox>
        </a-form-item>
        <a-form-item
          label="分类增加-HR"
          name="categorySuffixHr"
          extra="勾选后，若种子为 H&R 状态，推送至下载器时会在「分类」后自动追加 -HR 后缀（例如分类 movie 变为 movie-HR）。需填写 Cookie 以检测 HR。">
          <a-checkbox v-model:checked="rss.categorySuffixHr">分类增加-HR</a-checkbox>
        </a-form-item>
        <a-form-item
          label="Cookie"
          v-if="needScrapeCookie"
          name="cookie"
          extra="Cookie, M-Team 为 api key"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.cookie"/>
        </a-form-item>
        <a-form-item
          label="Rss 周期"
          name="cron"
          extra="Rss Cron 表达式, 默认为 1 分钟更新一次"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.cron"/>
        </a-form-item>
        <a-form-item
          label="推送通知"
          name="pushNotify"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="rss.pushNotify">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          v-if="rss.pushNotify"
          label="通知方式"
          name="notify"
          extra="通知方式, 用于推送删种等信息, 在通知工具页面创建"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="rss.notify">
            <a-select-option v-for="notification of notifications" v-model:value="notification.id" :key="notification.id">{{ notification.alias }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="限制上传速度"
          name="uploadLimit"
          extra="限制种子的上传速度, 0 为不限速"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.uploadLimit">
            <template #addonAfter>
              <a-select size="small" v-model:value="rss.uploadLimitUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte/s</a-select-option>
                <a-select-option value="KiB">KiB/s</a-select-option>
                <a-select-option value="MiB">MiB/s</a-select-option>
                <a-select-option value="GiB">GiB/s</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="限制下载速度"
          name="downloadLimit"
          extra="限制种子的下载速度, 0 为不限速"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.downloadLimit">
            <template #addonAfter>
              <a-select size="small" v-model:value="rss.downloadLimitUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte/s</a-select-option>
                <a-select-option value="KiB">KiB/s</a-select-option>
                <a-select-option value="MiB">MiB/s</a-select-option>
                <a-select-option value="GiB">GiB/s</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="保存路径"
          name="savePath"
          extra="推送种子至下载器时的保存路径">
          <a-input size="small" v-model:value="rss.savePath"/>
        </a-form-item>
        <a-form-item
          label="分类"
          name="category"
          extra="推送种子至下载器时的分类">
          <a-input size="small" v-model:value="rss.category"/>
        </a-form-item>
        <a-form-item
          label="标签"
          name="tags"
          extra="推送至 qBittorrent 时附加的标签，多个用英文逗号分隔">
          <a-input size="small" v-model:value="rss.tags"/>
        </a-form-item>
        <a-form-item
          label="自动打标签"
          name="autoSiteTag"
          extra="勾选后按「基础组件 → 站点标签」中的规则自动匹配站点标签；未匹配则不添加">
          <a-checkbox v-model:checked="rss.autoSiteTag">自动打标签</a-checkbox>
        </a-form-item>
        <a-form-item
          label="每小时上限"
          name="addCountPerHour"
          extra="每小时向客户端推送种子数量上限, 留空为 20, 编辑 Rss 或重启后重置计数">
          <a-input size="small" v-model:value="rss.addCountPerHour"/>
        </a-form-item>
        <a-form-item
          label="添加种子时暂停"
          name="paused"
          extra="向下载器添加种子时暂停种子">
          <a-checkbox v-model:checked="rss.paused">添加种子时暂停</a-checkbox>
        </a-form-item>
        <a-form-item
          label="自动管理"
          name="autoTMM"
          extra="向下载器添加种子时启用种子的自动管理功能, 不了解请勿勾选">
          <a-checkbox v-model:checked="rss.autoTMM">自动管理</a-checkbox>
        </a-form-item>
        <a-form-item
          label="等待时间"
          name="sleepTime"
          extra="若在 Rss 时种子不符合促销筛选, 将在种子发布后的一段时间内重复检测促销状态, 建议等待时间略小于 Rss 周期">
          <a-input size="small" v-model:value="rss.sleepTime"/>
        </a-form-item>
        <a-form-item
          label="最长休眠时间"
          name="maxSleepTime"
          extra="最长休眠时间, 若上次成功 RSS 在 N 秒以前, 则本次 RSS 拒绝所有种子, 建议为 3-5 倍于 Rss 周期, 单位为秒"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.maxSleepTime"/>
        </a-form-item>
        <a-form-item
          label="跳过大小相同种子"
          name="skipSameTorrent"
          extra="跳过所有下载器内存在大小相同种子的种子"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="rss.skipSameTorrent">跳过大小相同种子</a-checkbox>
        </a-form-item>
        <a-form-item
          label="推送种子文件"
          name="pushTorrentFile"
          extra="是否直接推送种子文件, 默认推送种子下载链接至下载器">
          <a-checkbox v-model:checked="rss.pushTorrentFile">推送种子文件</a-checkbox>
        </a-form-item>
        <a-form-item
          label="自定义正则替换"
          v-if="!rss.pushTorrentFile"
          name="useCustomRegex"
          extra="对种子下载链接进行自定义正则表达式替换, 仅在推送方式为推送种子下载链接时生效。不完全理解本功能请勿设置, 不恰当的配置可能导致你的账号被ban。">
          <a-checkbox v-model:checked="rss.useCustomRegex">使用自定义正则</a-checkbox>
        </a-form-item>
        <a-form-item
          label="正则表达式"
          v-if="(!rss.pushTorrentFile) && rss.useCustomRegex"
          name="regexStr"
          extra="格式: /pattern/flags"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.regexStr"/>
        </a-form-item>
        <a-form-item
          label="替换为"
          v-if="(!rss.pushTorrentFile) && rss.useCustomRegex"
          name="replaceStr"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="rss.replaceStr"/>
        </a-form-item>
        <a-form-item
          label="拒绝规则"
          name="rejectRules"
          extra="拒绝规则, 种子状态符合其中一个时即触发拒绝种子操作">
          <a-checkbox-group style="width: 100%;" v-model:value="rss.rejectRules">
            <a-row>
              <a-col v-for="rssRule of rssRules" :span="8" :key="rssRule.id">
                <a-checkbox  v-model:value="rssRule.id">{{ rssRule.alias }}</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item
          label="选择规则"
          name="acceptRules"
          extra="选择规则, 种子状态符合其中一个时即触发添加种子操作">
          <a-checkbox-group style="width: 100%;" v-model:value="rss.acceptRules">
            <a-row>
              <a-col v-for="rssRule of rssRules" :span="8" :key="rssRule.id">
                <a-checkbox  v-model:value="rssRule.id">{{ rssRule.alias }}</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item class="fn-rss-actions">
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button html-type="button" :loading="ruleDryrunLoading" @click.prevent="dryrun">试运行</a-button>
          <a-button html-type="button" :loading="scrapeDryrunLoading" @click.prevent="scrapeDryrun">检测免费/HR</a-button>
          <a-button html-type="button" @click="closeForm">取消</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
  <a-modal
    v-model:visible="modalVisible"
    :title="dryrunModalTitle"
    :width="1100"
    wrap-class-name="fn-dryrun-modal"
    :footer="null"
    :bodyStyle="{ padding: '16px 20px 20px' }">
    <div class="fn-dryrun">
      <div class="fn-dryrun-note">{{ dryrunNote }}</div>
      <div v-if="dryrunRssUrl" class="fn-dryrun-url" :title="dryrunRssUrl">{{ dryrunRssUrl }}</div>

      <div class="fn-dryrun-cards">
        <article
          v-for="record of pagedDryrunResult"
          :key="record.link || record.name"
          class="fn-dryrun-card">
          <a
            v-if="record.link"
            class="fn-dryrun-title torrent-name-link"
            @click.prevent="gotoTorrentDetail(record)">{{ record.name }}</a>
          <div v-else class="fn-dryrun-title">{{ record.name }}</div>
          <div class="fn-dryrun-meta">
            <span>{{ $formatSize(record.size) }}</span>
            <span>{{ formatPubTime(record.pubTime) }}</span>
          </div>
          <div class="fn-dryrun-status">{{ record.status || '—' }}</div>
          <div v-if="dryrunMode === 'scrape'" class="fn-dryrun-flags">
            <div class="fn-dryrun-flag">
              <span>促销</span>
              <PromoTag :label="record.promo" :promo-type="record.promoType" />
              <em v-if="record.promoError">{{ record.promoError }}</em>
            </div>
            <div class="fn-dryrun-flag">
              <span>HR</span>
              <a-tag :color="hrTagColor(record.hr)">{{ record.hr || '未检测' }}</a-tag>
              <em v-if="record.hrError">{{ record.hrError }}</em>
            </div>
            <a-button
              type="primary"
              block
              :loading="record.scrapeLoading"
              @click="scrapeTorrent(record)">
              检测
            </a-button>
          </div>
        </article>
        <div v-if="!dryrunResult.length" class="fn-dryrun-empty">没有匹配到种子</div>
        <a-pagination
          v-if="dryrunResult.length > dryrunPageSize"
          class="fn-dryrun-pager"
          size="small"
          :simple="true"
          :current="dryrunPage"
          :pageSize="dryrunPageSize"
          :total="dryrunResult.length"
          @change="page => dryrunPage = page"/>
      </div>

      <a-table
        class="fn-dryrun-table"
        :columns="dryrunTableColumns"
        size="middle"
        :data-source="dryrunResult"
        :pagination="dryrunTablePagination"
        :scroll="{ x: dryrunTableScrollX }"
        :row-key="record => record.link || record.name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'name'">
            <a
              v-if="record.link"
              class="torrent-name-link"
              @click.prevent="gotoTorrentDetail(record)">{{ record.name }}</a>
            <span v-else>{{ record.name }}</span>
          </template>
          <template v-if="column.dataIndex === 'size'">
            {{ $formatSize(record.size) }}
          </template>
          <template v-if="column.dataIndex === 'pubTime'">
            {{ formatPubTime(record.pubTime) }}
          </template>
          <template v-if="column.dataIndex === 'promo'">
            <div class="fn-dryrun-cell">
              <PromoTag :label="record.promo" :promo-type="record.promoType" />
              <span v-if="record.promoError" class="fn-dryrun-err">{{ record.promoError }}</span>
            </div>
          </template>
          <template v-if="column.dataIndex === 'hr'">
            <div class="fn-dryrun-cell">
              <a-tag :color="hrTagColor(record.hr)">{{ record.hr || '未检测' }}</a-tag>
              <span v-if="record.hrError" class="fn-dryrun-err">{{ record.hrError }}</span>
            </div>
          </template>
          <template v-if="column.key === 'option' || column.title === '操作'">
            <a-button
              type="primary"
              size="small"
              :loading="record.scrapeLoading"
              @click="scrapeTorrent(record)">
              检测
            </a-button>
          </template>
        </template>
      </a-table>

      <div class="fn-dryrun-foot">
        <a-button @click="modalVisible = false">关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>
<script>
import PromoTag from '../../components/PromoTag.vue';
import { PROMO_OPTIONS } from '../../util/promoTag';
import { scrollToTop } from '../../util/scroll';
import adminCrud from '../../mixins/adminCrud';

export default {
  mixins: [adminCrud],
  components: {
    PromoTag
  },
  data () {
    const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 18,
        fixed: true
      }, {
        title: '别名',
        dataIndex: 'alias',
        sorter: (a, b) => a.alias.localeCompare(b.alias),
        defaultSortOrder: 'ascend',
        width: 20
      }, {
        title: '启用',
        dataIndex: 'enable',
        width: 15
      }, {
        title: '下载器',
        dataIndex: 'clientArr',
        width: 36
      }, {
        title: '分配方案',
        dataIndex: 'allocateRule',
        width: 22
      }, {
        title: '推送消息',
        dataIndex: 'pushNotify',
        width: 16
      }, {
        title: '操作',
        width: 28
      }
    ];
    const promoOptions = PROMO_OPTIONS;
    return {
      columns,
      promoOptions,
      supportedPromo: [],
      promoSupportReady: false,
      dryrunMode: 'rule',
      modalVisible: false,
      dryrunResult: [],
      dryrunPage: 1,
      dryrunPageSize: 10,
      ruleDryrunLoading: false,
      scrapeDryrunLoading: false,
      rssList: [],
      downloaders: [],
      allocateRules: [],
      notifications: [],
      rssRules: [],
      rss: {},
      defaultRss: {
        clientArr: [],
        allocateRule: 'builtin:original',
        clientSortBy: 'leechingCount',
        enable: false,
        scrapePromo: [],
        scrapeHr: false,
        categorySuffixHr: false,
        autoSiteTag: true,
        tags: '',
        autoReseed: false,
        onlyReseed: false,
        maxSleepTime: 600,
        skipSameTorrent: true,
        pushTorrentFile: true,
        cron: '* * * * *',
        addCountPerHour: '',
        pushNotify: false,
        acceptRules: [],
        rejectRules: [],
        reseedClients: [],
        rssUrls: [''],
        maxClientUploadSpeedUnit: 'MiB',
        maxClientDownloadSpeedUnit: 'MiB',
        uploadLimitUnit: 'MiB',
        downloadLimitUnit: 'MiB'
      },
      loading: true,
      registCode: [],
      selectedRssIds: [],
      batchOpen: false,
      batchAction: 'addClient',
      batchValue: undefined
    };
  },
  computed: {
    rssRowSelection () {
      return {
        selectedRowKeys: this.selectedRssIds,
        onChange: this.onRssSelectChange,
        columnWidth: '1%'
      };
    },
    batchHint () {
      return this.selectedRssIds.length
        ? `已选 ${this.selectedRssIds.length} 条，选择要执行的操作`
        : '请先勾选 RSS 任务';
    },
    batchButtonText () {
      return this.selectedRssIds.length
        ? `批量操作 · ${this.selectedRssIds.length}`
        : '批量操作';
    },
    batchValuePlaceholder () {
      if (this.batchAction === 'setAllocate') return '选择分配方案';
      if (this.batchAction === 'removeClient') return '选择要移除的下载器';
      return '选择下载器';
    },
    batchValueOptions () {
      if (this.batchAction === 'setAllocate') {
        return (this.allocateRules || []).map(rule => ({
          value: rule.id,
          label: rule.alias + (rule.builtin ? ' (内置)' : '')
        }));
      }
      return (this.downloaders || []).map(item => ({
        value: item.id,
        label: item.alias
      }));
    },
    needScrapeCookie () {
      return this.rss.scrapeHr ||
        (this.rss.scrapePromo && this.rss.scrapePromo.length > 0) ||
        this.rss.categorySuffixHr;
    },
    dryrunModalTitle () {
      return this.dryrunMode === 'scrape' ? '检测免费/HR' : 'RSS 试运行';
    },
    dryrunNote () {
      return this.dryrunMode === 'scrape'
        ? '先拉 RSS 列表，不会自动检测。点「检测」查看该条促销和 HR，与上方筛选无关。'
        : '只判断是否符合 RSS 规则，不检测促销或 HR，也不会推送到下载器。';
    },
    dryrunRssUrl () {
      return ((this.rss.rssUrls || [])[0] || '').trim();
    },
    pagedDryrunResult () {
      const start = (this.dryrunPage - 1) * this.dryrunPageSize;
      return (this.dryrunResult || []).slice(start, start + this.dryrunPageSize);
    },
    dryrunTableColumns () {
      const cols = [
        { title: '种子标题', dataIndex: 'name' },
        { title: '大小', dataIndex: 'size', width: 120, align: 'right' },
        { title: '发布时间', dataIndex: 'pubTime', width: 176 },
        { title: '结果', dataIndex: 'status', width: 220 }
      ];
      if (this.dryrunMode === 'scrape') {
        cols.push(
          { title: '促销', dataIndex: 'promo', width: 140 },
          { title: 'HR', dataIndex: 'hr', width: 88 },
          { title: '操作', key: 'option', width: 88, align: 'right' }
        );
      }
      return cols;
    },
    dryrunTableScrollX () {
      return this.dryrunMode === 'scrape' ? 1080 : 860;
    },
    dryrunTablePagination () {
      return {
        pageSize: 20,
        hideOnSinglePage: true,
        showSizeChanger: false,
        showTotal: total => `共 ${total} 条`
      };
    }
  },
  watch: {
    'rss.rssUrls': {
      handler () {
        this.refreshPromoSupport();
      },
      deep: true
    },
    batchOpen (open) {
      document.body.classList.toggle('fn-ops-open', !!open && this.isNarrow);
    }
  },
  beforeUnmount () {
    document.body.classList.remove('fn-ops-open');
  },
  methods: {
    batchPopupContainer (node) {
      return (node && (node.closest('.fn-batch-actions') || node.parentNode)) || document.body;
    },
    async refreshPromoSupport () {
      const hosts = [];
      for (const url of this.rss.rssUrls || []) {
        if (!url) continue;
        try {
          hosts.push(new URL(url).host);
        } catch (e) {
          // ignore invalid url
        }
      }
      if (hosts.length === 0) {
        this.supportedPromo = [];
        this.promoSupportReady = false;
        return;
      }
      try {
        const res = await this.$api().rss.promoSupport(hosts);
        this.supportedPromo = res.data.merged || [];
        this.promoSupportReady = this.supportedPromo.length > 0;
      } catch (e) {
        this.supportedPromo = [];
        this.promoSupportReady = false;
      }
    },
    async listRss () {
      try {
        const res = await this.$api().rss.list();
        this.rssList = res.data;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    onRssSelectChange (keys) {
      this.selectedRssIds = keys;
    },
    allocateRuleAlias (id) {
      const rule = this.allocateRules.find(item => item.id === (id || 'builtin:original'));
      if (rule) return rule.alias;
      const builtin = {
        'builtin:original': '原规则',
        'builtin:roundRobin': '轮询',
        'builtin:leastLeech': '最少下载任务',
        'builtin:mostSpace': '最大剩余空间',
        'builtin:leastLoad': '最低综合负载',
        'builtin:random': '随机'
      };
      return builtin[id] || id || '原规则';
    },
    detailFieldText (col, record) {
      const key = col && (col.dataIndex || col.key);
      if (key === 'allocateRule') return this.allocateRuleAlias(record.allocateRule);
      if (key === 'clientArr') {
        const names = (this.downloaders || [])
          .filter(item => (record.clientArr || []).indexOf(item.id) !== -1)
          .map(item => item.alias);
        return names.length ? names.join(' / ') : '—';
      }
      return null;
    },
    async batchUpdateRss (payload) {
      if (!this.selectedRssIds.length) {
        this.$message().error('请先勾选 RSS 任务');
        return;
      }
      try {
        const res = await this.$api().rss.batchUpdate({
          ...payload,
          rssIds: this.selectedRssIds
        });
        this.$message().success(res.message || '批量更新成功');
        this.batchOpen = false;
        await this.listRss();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    onBatchActionChange () {
      this.batchValue = undefined;
    },
    async runBatchAction (value) {
      if (!value || !this.batchAction) return;
      this.batchValue = undefined;
      if (this.batchAction === 'addClient') {
        await this.batchUpdateRss({ action: 'addClient', clientId: value });
        return;
      }
      if (this.batchAction === 'removeClient') {
        await this.batchUpdateRss({ action: 'removeClient', clientId: value });
        return;
      }
      if (this.batchAction === 'setAllocate') {
        await this.batchUpdateRss({ action: 'setAllocate', allocateRule: value });
      }
    },
    async listNotification () {
      try {
        const res = await this.$api().notification.list();
        this.notifications = res.data.sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listRssRule () {
      try {
        const res = await this.$api().rssRule.list();
        this.rssRules = res.data.sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listDownloader () {
      try {
        const res = await this.$api().downloader.list();
        this.downloaders = res.data.sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listAllocateRule () {
      try {
        const res = await this.$api().allocateRule.list();
        this.allocateRules = (res && res.data && res.data.length)
          ? res.data
          : [{ id: 'builtin:original', alias: '原规则', builtin: true }];
      } catch (e) {
        this.allocateRules = [{ id: 'builtin:original', alias: '原规则', builtin: true }];
        this.$message().error(e.message);
      }
    },
    formatPubTime (pubTime) {
      if (!pubTime) {
        return '-';
      }
      return this.$moment(pubTime * 1000).format('YYYY-MM-DD HH:mm:ss');
    },
    hrTagColor (hr) {
      if (hr === '是' || hr === '检测失败') return 'error';
      if (hr === '否') return 'success';
      return 'default';
    },
    gotoTorrentDetail (record) {
      if (!record.link) {
        this.$message().error('链接不存在');
        return;
      }
      window.open(record.link);
    },
    async modifyRss () {
      try {
        const payload = {
          ...this.rss,
          scrapeFree: (this.rss.scrapePromo || []).indexOf('free') !== -1
        };
        await this.$api().rss.modify(payload);
        this.$message().success((this.rss.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        this.closeForm();
        this._formEditing = false;
        setTimeout(() => this.listRss(), 1000);
        this.clearRss();
        scrollToTop();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    getValidRssUrls () {
      return (this.rss.rssUrls || []).map(url => (url || '').trim()).filter(Boolean);
    },
    async dryrun () {
      const rssUrls = this.getValidRssUrls();
      if (rssUrls.length === 0) {
        this.$message().error('请先填写有效的 RSS 链接');
        return;
      }
      try {
        this.ruleDryrunLoading = true;
        const res = await this.$api().rss.dryrun({ ...this.rss, rssUrls });
        this.dryrunResult = res.data;
        this.dryrunMode = 'rule';
        this.dryrunPage = 1;
        this.modalVisible = true;
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.ruleDryrunLoading = false;
      }
    },
    async scrapeDryrun () {
      const rssUrls = this.getValidRssUrls();
      if (rssUrls.length === 0) {
        this.$message().error('请先填写有效的 RSS 链接');
        return;
      }
      try {
        if (!this.rss.cookie) {
          this.$message().error('检测促销/HR 需要填写 Cookie');
          return;
        }
        this.scrapeDryrunLoading = true;
        const res = await this.$api().rss.scrapeDryrun({ ...this.rss, rssUrls });
        this.dryrunResult = res.data.map(item => ({
          ...item,
          promo: '未检测',
          hr: '未检测',
          scrapeLoading: false
        }));
        this.dryrunMode = 'scrape';
        this.dryrunPage = 1;
        this.modalVisible = true;
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.scrapeDryrunLoading = false;
      }
    },
    async scrapeTorrent (record) {
      const index = this.dryrunResult.findIndex(item => item.link === record.link);
      if (index === -1) {
        return;
      }
      try {
        this.dryrunResult[index] = { ...this.dryrunResult[index], scrapeLoading: true };
        const res = await this.$api().rss.scrapeTorrent({
          link: record.link,
          cookie: this.rss.cookie
        });
        this.dryrunResult[index] = {
          ...this.dryrunResult[index],
          ...res.data,
          scrapeLoading: false
        };
        const { promo, hr, promoError, hrError } = res.data;
        if (promo === '检测失败' || hr === '检测失败') {
          this.$message().warning(`检测完成: 促销 ${promo}${promoError ? ` (${promoError})` : ''}, HR ${hr}${hrError ? ` (${hrError})` : ''}`);
        } else {
          this.$message().success(`检测完成: 促销 ${promo}, HR ${hr}`);
        }
      } catch (e) {
        this.dryrunResult[index] = { ...this.dryrunResult[index], scrapeLoading: false };
        this.$message().error(e.message);
      }
    },
    async enableTask (record) {
      try {
        await this.$api().rss.modify({ ...record });
        this.$message().success('修改成功, 列表正在刷新...');
        setTimeout(() => this.listRss(), 1000);
        this.clearRss();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this._formEditing = false;
      if (typeof this.clearRss === 'function') this.clearRss();
      this.formVisible = true;
    },
    modifyClick (row) {
      this.rss = {
        ...row,
        scrapePromo: row.scrapePromo || (row.scrapeFree ? ['free'] : []),
        categorySuffixHr: row.categorySuffixHr || false,
        autoSiteTag: row.autoSiteTag !== false,
        tags: row.tags || '',
        maxClientUploadSpeedUnit: row.maxClientUploadSpeedUnit || 'MiB',
        maxClientDownloadSpeedUnit: row.maxClientDownloadSpeedUnit || 'MiB',
        uploadLimitUnit: row.uploadLimitUnit || 'MiB',
        downloadLimitUnit: row.downloadLimitUnit || 'MiB'
      };
      this.refreshPromoSupport();
      this._formEditing = true;
      this.formVisible = true;
    },
    cloneClick (row) {
      this.rss = JSON.parse(JSON.stringify(row));
      this.rss.id = null;
      this.rss.alias = this.rss.alias + '-克隆';
      this._formEditing = false;
      this.formVisible = true;
    },
    async deleteRss (row) {
      try {
        await this.$api().rss.delete(row.id);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listRss();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    clearRss () {
      this.rss = {
        ...this.defaultRss,
        acceptRules: [],
        clientArr: [],
        rejectRules: [],
        reseedClients: [],
        rssUrls: [''],
        scrapePromo: []
      };
      this.supportedPromo = [];
      this.promoSupportReady = false;
    }
  },
  async mounted () {
    this.clearRss();
    this.listNotification();
    this.listDownloader();
    this.listAllocateRule();
    this.listRssRule();
    this.listRss();
  }
};
</script>
<style scoped>
.rss {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
.rss :deep(col.ant-table-selection-col),
.rss :deep(.ant-table-selection-column) {
  width: 1% !important;
  min-width: 36px;
  padding-left: 8px !important;
  padding-right: 8px !important;
}
.torrent-name-link {
  color: inherit;
  text-decoration: none;
}
.torrent-name-link:hover {
  color: var(--blue);
  text-decoration: none;
}
.fn-dryrun-note {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.55;
  margin-bottom: 8px;
}
.fn-dryrun-url {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.45;
  margin-bottom: 14px;
  word-break: break-all;
}
.fn-dryrun-cards {
  flex-direction: column;
  gap: 12px;
}
.fn-dryrun-card {
  padding: 14px 14px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
}
.fn-dryrun-title {
  display: block;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--text);
  word-break: break-word;
}
.fn-dryrun-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 10px;
  color: var(--text-2);
  font-size: 13px;
}
.fn-dryrun-status {
  margin-top: 8px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
}
.fn-dryrun-flags {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.fn-dryrun-flag {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 28px;
}
.fn-dryrun-flag > span:first-child {
  width: 36px;
  color: var(--text-3);
  font-size: 13px;
}
.fn-dryrun-flag em {
  flex: 1 1 100%;
  margin-left: 44px;
  font-style: normal;
  color: var(--bad);
  font-size: 12px;
}
.fn-dryrun-flags :deep(.ant-btn) {
  height: 44px;
  margin-top: 2px;
}
.fn-dryrun-empty {
  padding: 36px 12px;
  text-align: center;
  color: var(--text-3);
}
.fn-dryrun-pager {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}
.fn-dryrun-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.fn-dryrun-err {
  color: var(--bad);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
}
.fn-dryrun-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.fn-dryrun-foot :deep(.ant-btn) {
  min-width: 88px;
  height: 40px;
}
.fn-rss-actions :deep(.ant-form-item-control-input-content) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
:deep(.ant-checkbox-wrapper) {
  align-items: center;
}
:deep(.ant-checkbox + span) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
