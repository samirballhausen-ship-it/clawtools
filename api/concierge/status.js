"use strict";

const { getStatus } = require("../../server/concierge-core.cjs");

module.exports = function handler(req, res) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(getStatus(process.env)));
};
