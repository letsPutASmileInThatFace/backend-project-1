var express = require("express");
var router = express.Router();
const Categories = require("../db/models/Categories");
const Response = require("../lib/Response");
const CustomError = require("../lib/Error");
const Enum = require("../config/Enum");
const AuditLogs = require("../lib/Auditlogs");
const logger = require("../lib/logger/LoggerClass");

router.get("/", async (req, res, next) => {
  try {
    let categories = await Categories.find({});

    res.json(Response.successResponse(categories));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);

    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/add", async (req, res) => {
  let body = req.body;
  try {
    if (!body.name)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "Name is required"
      );
    let category = new Categories({
      name: body.name,
      is_active: true,
      created_by: req.user?.id,
    });

    await category.save();
    AuditLogs.info(req.user?.email, "Categories", "ADD", {
      _id: category._id,
      name: category.name,
      isActive: category.isActive,
      created_at: category.created_at,
      updated_at: category.updated_at,
    });
    logger.info(req.user?.email, "Categories", "ADD", category);
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    logger.error(req.user?.email, "Categories", "ADD", err);
    let errorResponse = Response.errorResponse(err);

    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/update", async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "_id is required"
      );

    let updates = {};
    if (body.name) updates.name = body.name;
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    await Categories.findOneAndUpdate({ _id: body._id }, updates);
    AuditLogs.info(req.user?.email, "Categories", "UPDATE", {
      _id: body._id,
      name: updates.name,
      isActive: updates.isActive,
    });
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);

    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/delete", async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "_id is required"
      );
    await Categories.findOneAndDelete({ _id: body._id });
    AuditLogs.info(req.user?.email, "Categories", "DELETE", { _id: body._id });
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;
