const INTERVAL = 4000;

export default {
  data () {
    return {
      live: true,
      _logTimer: null,
      _logBusy: false
    };
  },
  methods: {
    startLogLive () {
      this.stopLogLive();
      this._logTimer = setInterval(() => this.tickLogLive(), INTERVAL);
    },
    stopLogLive () {
      if (this._logTimer) clearInterval(this._logTimer);
      this._logTimer = null;
    },
    canPollLog () {
      return true;
    },
    async tickLogLive () {
      if (!this.live || this._logBusy) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!this.canPollLog()) return;
      this._logBusy = true;
      try {
        await this.refreshLog(true);
      } finally {
        this._logBusy = false;
      }
    },
    onLogVisible () {
      if (typeof document !== 'undefined' && !document.hidden && this.live) {
        this.tickLogLive();
      }
    }
  },
  watch: {
    live (on) {
      if (on) this.tickLogLive();
    }
  },
  mounted () {
    this.startLogLive();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onLogVisible);
    }
  },
  beforeUnmount () {
    this.stopLogLive();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onLogVisible);
    }
  }
};
