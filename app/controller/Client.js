const logger = require('../libs/logger');
const ClientMod = require('../model/ClientMod');

const clientMod = new ClientMod();

class Client {
  async add (req, res) {
    const options = req.body;
    try {
      const r = clientMod.add(options);
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
  };

  async delete (req, res) {
    const options = req.body;
    try {
      const r = clientMod.delete(options);
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
  };

  async modify (req, res) {
    const options = req.body;
    try {
      const r = clientMod.modify(options);
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
  };

  async list (req, res) {
    try {
      const r = clientMod.list();
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
  };

  async references (req, res) {
    try {
      const id = req.query.id;
      if (!id) {
        throw new Error('缺少下载器 ID');
      }
      const r = clientMod.getReferences(id);
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
  };

  async listMainInfo (req, res) {
    try {
      const r = clientMod.listMainInfo();
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
  };

  async listTop10 (req, res) {
    try {
      const r = clientMod.listTop10(req.query);
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
  };

  async getSpeedPerTracker (req, res) {
    try {
      const r = await clientMod.getSpeedPerTracker();
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
  };

  async getLogs (req, res) {
    try {
      const r = await clientMod.getLogs(req.query);
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      if (/登录失败|未登录|会话已失效|已禁用|未连接/.test(e.message)) {
        logger.warn(e.message);
      } else {
        logger.error(e);
      }
      res.send({
        success: false,
        message: e.message
      });
    }
  };
}
module.exports = Client;
