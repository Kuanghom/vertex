const logger = require('../libs/logger');
const PresetMod = require('../model/PresetMod');

const presetMod = new PresetMod();

class Preset {
  async catalog (req, res) {
    try {
      res.send({
        success: true,
        data: presetMod.catalog()
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  }

  async apply (req, res) {
    try {
      const r = presetMod.apply(req.body || {});
      res.send({
        success: true,
        message: r.message,
        data: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  }

  async previewImport (req, res) {
    try {
      const file = req.files && (req.files.file || req.files);
      const r = presetMod.previewImport(file.file || file);
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  }

  async importSelected (req, res) {
    try {
      const file = req.files && (req.files.file || req.files);
      let sources = req.body && req.body.sources;
      if (typeof sources === 'string') {
        try { sources = JSON.parse(sources); } catch (err) { sources = []; }
      }
      const r = presetMod.importSelected({
        file: file.file || file,
        sources
      });
      res.send({
        success: true,
        message: r.message,
        data: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  }
}

module.exports = Preset;
