<template>
  <div class="shell-page">
    <div class="shell-bar">
      <span class="shell-dot"></span>
      <span class="shell-name">SHELL</span>
      <span class="shell-hint">Tab 补全 · 右键复制/粘贴 · Ctrl+Shift+C/V</span>
      <button type="button" class="shell-act" @click="copySelection">复制</button>
      <button type="button" class="shell-act" @click="pasteClipboard">粘贴</button>
    </div>
    <div id="xterm" class="xterm" @contextmenu.prevent="onContext"/>
  </div>
</template>
<script>
import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';

const MONO = 'consolas, Consolas, "Cascadia Mono", "Courier New", ui-monospace, monospace';

export default {
  name: 'Xterm',
  props: {
    socketURI: {
      type: String,
      default: '/api/server/shell/'
    }
  },
  methods: {
    async waitFont () {
      if (!document.fonts) return;
      try {
        await document.fonts.load('16px consolas');
        await document.fonts.load('16px Consolas');
        await document.fonts.ready;
      } catch (e) {
        /* keep fallback stack */
      }
    },
    copySelection () {
      const text = this.term && this.term.getSelection ? this.term.getSelection() : '';
      if (!text) {
        this.$message().warning('没有选中文本');
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      }
    },
    async pasteClipboard () {
      let text = '';
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          text = await navigator.clipboard.readText();
        }
      } catch (e) {
        text = '';
      }
      if (!text || !this.term) return;
      if (typeof this.term.paste === 'function') this.term.paste(text);
      else if (this.socket && this.socket.readyState === 1) this.socket.send(text);
    },
    onContext () {
      if (this.term && this.term.hasSelection && this.term.hasSelection()) this.copySelection();
      else this.pasteClipboard();
    },
    fitTerm () {
      if (!this.fitAddon || !this.term || !this.socket) return;
      this.fitAddon.fit();
      if (this.socket.readyState === 1) {
        this.socket.send(`setWindow:${this.term.rows}:${this.term.cols}`);
      }
    },
    async initTerm () {
      await this.waitFont();
      const term = new Terminal({
        fontFamily: MONO,
        fontSize: 15,
        lineHeight: 1.2,
        letterSpacing: 0,
        cols: 120,
        rows: 36,
        cursorBlink: true,
        customGlyphs: false,
        cursorStyle: 'bar',
        rightClickSelectsWord: false,
        macOptionIsMeta: true,
        scrollback: 5000
      });
      const websocket = this.socket;
      const attachAddon = new AttachAddon(this.socket);
      const fitAddon = new FitAddon();
      term.loadAddon(attachAddon);
      term.loadAddon(fitAddon);
      term.open(document.getElementById('xterm'));
      term.attachCustomKeyEventHandler((ev) => {
        if (ev.type !== 'keydown') return true;
        const ctrl = ev.ctrlKey || ev.metaKey;
        if (ev.key === 'Tab') {
          ev.preventDefault();
          return true;
        }
        if (ctrl && ev.shiftKey && (ev.key === 'C' || ev.key === 'c')) {
          ev.preventDefault();
          this.copySelection();
          return false;
        }
        if (ctrl && ev.shiftKey && (ev.key === 'V' || ev.key === 'v')) {
          ev.preventDefault();
          this.pasteClipboard();
          return false;
        }
        if (ctrl && (ev.key === 'v' || ev.key === 'V')) {
          ev.preventDefault();
          this.pasteClipboard();
          return false;
        }
        if (ctrl && (ev.key === 'c' || ev.key === 'C') && term.hasSelection()) {
          ev.preventDefault();
          this.copySelection();
          return false;
        }
        if (ev.key === 'Insert' && ev.shiftKey) {
          ev.preventDefault();
          this.pasteClipboard();
          return false;
        }
        return true;
      });
      term.focus();
      this.term = term;
      this.fitAddon = fitAddon;
      this.fitTerm();
      requestAnimationFrame(() => this.fitTerm());
      setTimeout(() => this.fitTerm(), 80);
      setTimeout(() => this.fitTerm(), 320);
      term.onResize((evt) => {
        if (websocket.readyState === 1) websocket.send(`setWindow:${evt.rows}:${evt.cols}`);
      });
      this._onResize = () => this.fitTerm();
      window.addEventListener('resize', this._onResize);
    },
    initSocket () {
      const { protocol, host } = window.document.location;
      this.socket = new WebSocket((protocol === 'http:' ? 'ws:' : 'wss:') + '//' + host + this.socketURI + this.$route.params.id);
      this.socketOnClose();
      this.socketOnOpen();
      this.socketOnError();
    },
    socketOnOpen () {
      this.socket.onopen = () => {
        this.initTerm();
      };
    },
    socketOnClose () {
      this.socket.onclose = () => {
        if (this.term) this.term.writeln('\r\n*** SSH SHELL DISCONNECTED ***\r\n');
      };
    },
    socketOnError () {
      this.socket.onerror = () => {};
    }
  },
  async mounted () {
    this.initSocket();
  },
  beforeUnmount () {
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this.socket) this.socket.close();
    if (this.term) this.term.dispose();
  }
};
</script>
<style scoped>
.shell-page {
  display: flex;
  flex-direction: column;
  height: calc(var(--vh, 1vh) * 100 - 56px);
  min-height: 360px;
  margin: 0 -4px;
}
.shell-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px 10px;
  color: var(--text);
}
.shell-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00a0e9;
}
.shell-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.shell-hint {
  color: var(--text-3);
  font-size: 12px;
  flex: 1;
}
.shell-act {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
}
.shell-act:hover {
  border-color: #00a0e9;
  color: #00a0e9;
}
.xterm {
  flex: 1;
  min-height: 0;
  text-align: left;
  border-radius: 10px;
  overflow: hidden;
  background: #11161c;
}
.xterm, .xterm:deep(*) {
  font-family: consolas, Consolas, "Cascadia Mono", "Courier New", ui-monospace, monospace !important;
}
.xterm:deep(.xterm) {
  height: 100%;
}
.xterm:deep(.xterm-viewport) {
  width: initial !important;
  height: initial !important;
}
</style>
