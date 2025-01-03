const express = require("express");
const moment = require("moment");
const Response = require("../lib/Response");
const AuditLogs = require("../db/models/AuditLogs");
const router = express.Router();
const auth = require("../lib/auth")();

router.all("*", auth.authenticate(), (req, res, next) => {
  next();
});

router.post("/", auth.checkRoles("auditLogs_view"), async (req, res, next) => {
  try {
    let body = req.body;
    let query = {};
    if (body.begin_date && body.end_date) {
      query.created_at = {
        $gte: moment(body.begin_date),
        $lte: moment(body.end_date),
      };
    } else {
      query.created_at = {
        $gte: moment().subtract(1, "day").startOf("day"),
        $lte: moment(),
      };
    }

    let auditLogs = await AuditLogs.find(query)
      .sort("created_at")
      .skip(body.skip)
      .limit(body.limit);
    res.json(Response.successResponse(auditLogs));
  } catch (err) {
    let errorResponse = Response.errorResponse(err, req.user?.language);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;
