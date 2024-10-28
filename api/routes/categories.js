var express = require("express");
var router = express.Router();
const Categories = require("../db/models/Categories");
const Response = require("../lib/Response");
const CustomError = require("../lib/Error");
const Enum = require("../config/Enum");
const AuditLogs = require("../lib/Auditlogs");
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require("../config");
const i18n = new (require("../lib/i18n"))(config.DEFAULT_LANGUAGE);
const emitter = require("../lib/Emitter");

router.all("*", auth.authenticate(), (req, res, next) => {
  next();
});

router.get("/", auth.checkRoles("category_view"), async (req, res, next) => {
  try {
    let categories = await Categories.find({});

    res.json(Response.successResponse(categories));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);

    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/add", auth.checkRoles("category_add"), async (req, res) => {
  let body = req.body;
  try {
    if (!body.name)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "name",
        ])
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
    emitter.getEmitter("notifications").emit("messages", {
      message: category.name + " is added",
    });
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    logger.error(req.user?.email, "Categories", "ADD", err);
    let errorResponse = Response.errorResponse(err);

    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/update", auth.checkRoles("category_update"), async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "_id",
        ])
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

router.post("/delete", auth.checkRoles("category_delete"), async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "_id",
        ])
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
