const express = require("express");
const { head } = require(".");
const router = express.Router();

router.get("/:id", function (req, res, next) {
  res.json({
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
  });
});

module.exports = router;
