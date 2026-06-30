const logger = require('../libs/logger');
const SiteTagMod = require('../model/SiteTagMod');

const siteTagMod = new SiteTagMod();

class SiteTag {
  async list (req, res) {
    try {
      const data = siteTagMod.list();
      res.send({ success: true, data });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  async modifySetting (req, res) {
    try {
      const message = siteTagMod.modifySetting(req.body);
      res.send({ success: true, message });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  async add (req, res) {
    try {
      const message = siteTagMod.add(req.body);
      res.send({ success: true, message });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  async modify (req, res) {
    try {
      const message = siteTagMod.modify(req.body);
      res.send({ success: true, message });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  async delete (req, res) {
    try {
      const message = siteTagMod.delete(req.body);
      res.send({ success: true, message });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  async resetDefault (req, res) {
    try {
      const message = siteTagMod.resetDefault();
      res.send({ success: true, message });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }
}

module.exports = SiteTag;
