const express = require("express");
const router = express.Router();

const Roles = require("../db/models/Roles");
const RolePrivileges = require("../db/models/RolePrivileges");
const Response = require("../lib/Response");
const CustomError = require("../lib/Error");
const Enum = require("../config/Enum");
const role_privileges = require("../config/role_privileges");

const auth = require("../lib/auth")();

router.all("*", auth.authenticate(), (req, res, next) => {
  next();
});

router.get("/", auth.checkRoles("role_view"), async (req, res, next) => {
  try {
    let roles = await Roles.find({});

    res.json(Response.successResponse(roles));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/add", auth.checkRoles("role_add"), async (req, res) => {
  let body = req.body;
  try {
    if (!body.role_name) {
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "Role name is required"
      );
    }

    if (
      !body.permissions ||
      !Array.isArray(body.permissions) ||
      body.permissions.length === 0
    ) {
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "Permissions is required"
      );
    }
    let role = new Roles({
      role_name: body.role_name,
      is_active: true,
      created_by: req.user?._id,
    });
    await role.save();

    for (let i = 0; i < body.permissions.length; i++) {
      let permission = body.permissions[i];
      let role_privilege = new RolePrivileges({
        role_id: role._id,
        permission: permission,
        created_by: req.user?._id,
      });
      await role_privilege.save();
    }
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/update", auth.checkRoles("role_update"), async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "_id is required"
      );
    let updates = {};
    if (body.role_name) updates.role_name = body.role_name;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    if (
      body.permissions &&
      Array.isArray(body.permissions) &&
      body.permissions.length !== 0
    ) {
      let permissions = await RolePrivileges.find({ role_id: body._id });
      let removedPermissions = permissions.filter(
        (x) => !body.permissions.includes(x.permission)
      );
      let newPermissions = body.permissions.filter(
        (x) => !permissions.map((y) => y.permission).includes(x)
      );

      if (removedPermissions.length > 0) {
        await RolePrivileges.deleteMany({
          _id: { $in: removedPermissions.map((x) => x._id) },
        });
      }
      if (newPermissions.length > 0) {
        await RolePrivileges.insertMany(
          newPermissions.map((x) => ({
            role_id: body._id,
            permission: x,
            created_by: req.user?._id,
          }))
        );
      }
    }

    await Roles.findOneAndUpdate({ _id: body._id }, updates);
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/delete", auth.checkRoles("role_delete"), async (req, res) => {
  let body = req.body;
  try {
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        "Validation Error",
        "_id is required"
      );

    await Roles.findOneAndDelete({ _id: body._id });
    await RolePrivileges.deleteMany({ role_id: body._id });
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.get("/role_privileges", async (req, res, next) => {
  res.json(role_privileges);
});

module.exports = router;
