const logger = require('../libs/logger');
const allocate = require('../libs/allocate');
const AllocateRuleMod = require('../model/AllocateRuleMod');

const allocateRuleMod = new AllocateRuleMod();

class AllocateRule {
  async add (req, res) {
    const options = req.body;
    try {
      const r = allocateRuleMod.add(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  }

  async delete (req, res) {
    const options = req.body;
    try {
      const r = allocateRuleMod.delete(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  }

  async modify (req, res) {
    const options = req.body;
    try {
      const r = allocateRuleMod.modify(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  }

  async list (req, res) {
    try {
      const r = allocateRuleMod.list();
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

  async debug (req, res) {
    try {
      const r = allocate.debugPick(req.body || {});
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
}

module.exports = AllocateRule;
