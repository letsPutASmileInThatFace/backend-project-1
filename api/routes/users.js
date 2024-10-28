const bcrypt = require("bcrypt");
const is = require("is_js");
var express = require("express");
var router = express.Router();
const Users = require("../db/models/Users");
const Response = require("../lib/Response");
const CustomError = require("../lib/Error");
const Enum = require("../config/Enum");
const UserRoles = require("../db/models/UserRoles");
const Roles = require("../db/models/Roles");
const config = require("../config");
const jwt_simple = require("jwt-simple");
const RolePrivileges = require("../db/models/RolePrivileges");
const auth = require("../lib/auth")();
const role_privileges = require("../config/role_privileges");
const i18n = new (require("../lib/i18n"))(config.DEFAULT_LANGUAGE);

router.post("/register", async (req, res) => {
  let body = req.body;
  try {
    let user = await Users.findOne({});
    if (user) {
      return res.sendStatus(Enum.HTTP_CODES.NOT_FOUND);
    }
    if (!body.email)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "email",
        ])
      );
    if (!is.email(body.email))
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.IS_NOT_VALID", req.user.language, ["email"])
      );
    if (!body.password)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "password",
        ])
      );

    if (body.password.length < Enum.PASS_LENGTH)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.PASS_LENGTH", req.user.language)
      );
    let password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

    let createdUser = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number,
    });
    let role = await Roles.create({
      role_name: Enum.SUPER_ADMIN,
      is_active: true,
      created_by: createdUser._id,
    });
    await UserRoles.create({
      role_id: role._id,
      user_id: createdUser._id,
    });
    let privileges = role_privileges.privileges;
    privileges.forEach(async (priv) => {
      await RolePrivileges.create({
        role_id: role._id,
        permission: priv.key,
        created_by: createdUser._id,
      });
    });
    res
      .status(Enum.HTTP_CODES.CREATED)
      .json(
        Response.successResponse({ success: true }, Enum.HTTP_CODES.CREATED)
      );
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/auth", async (req, res) => {
  try {
    let { email, password } = req.body;
    Users.validateFieldsBeforeAuth(email, password);
    let user = await Users.findOne({ email });
    if (!user)
      throw new CustomError(
        Enum.HTTP_CODES.UNAUTHORIZED,
        i18n.translate("COMMON.AUTH_ERROR", req.user.language),
        i18n.translate("COMMON.AUTH_ERROR_MESSAGE", req.user.language)
      );
    if (!bcrypt.compareSync(password, user.password))
      throw new CustomError(
        Enum.HTTP_CODES.UNAUTHORIZED,
        i18n.translate("COMMON.AUTH_ERROR", req.user.language),
        i18n.translate("COMMON.AUTH_ERROR_MESSAGE", req.user.language)
      );

    let payload = {
      id: user._id,
      exp: Math.floor(Date.now() / 1000) * config.JWT.EXPIRE_TIME,
    };
    let token = jwt_simple.encode(payload, config.JWT.SECRET);
    let userData = {
      _id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
    };
    res.json(
      Response.successResponse({ token, user: userData }, Enum.HTTP_CODES.OK)
    );
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.all("*", auth.authenticate(), (req, res, next) => {
  next();
});
/* GET users listing. */
router.get("/", auth.checkRoles("user_view"), async (req, res, next) => {
  try {
    let users = await Users.find({});
    res.json(Response.successResponse(users));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/add", auth.checkRoles("user_add"), async (req, res) => {
  let body = req.body;
  try {
    if (!body.email)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "email",
        ])
      );
    if (!is.email(body.email))
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.IS_NOT_VALID", req.user.language, ["email"])
      );
    if (!body.password)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "password",
        ])
      );

    if (body.password.length < Enum.PASS_LENGTH)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.PASS_LENGTH", req.user.language)
      );

    if (!body.roles || !Array.isArray(body.roles) || body.roles.length === 0)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "roles",
        ])
      );

    let roles = await Roles.find({ _id: { $in: body.roles } });
    if (roles.length === 0) {
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "roles",
        ])
      );
    }

    let password = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

    let user = await Users.create({
      email: body.email,
      password,
      is_active: true,
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number,
    });

    for (let i = 0; i < roles.length; i++) {
      await UserRoles.create({
        role_id: roles[i]._id,
        user_id: user._id,
      });
    }
    res
      .status(Enum.HTTP_CODES.CREATED)
      .json(
        Response.successResponse({ success: true }, Enum.HTTP_CODES.CREATED)
      );
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/update", auth.checkRoles("user_update"), async (req, res) => {
  try {
    let body = req.body;
    let updates = {};
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "_id",
        ])
      );
    if (body.password && body.password.length < Enum.PASS_LENGTH) {
      updates.password = bcrypt.hashSync(
        body.password,
        bcrypt.genSaltSync(8),
        null
      );
    }
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    if (body.first_name) updates.first_name = body.first_name;
    if (body.last_name) updates.last_name = body.last_name;
    if (body.phone_number) updates.phone_number = body.phone_number;

    if (Array.isArray(body.roles) && body.roles.length > 0) {
      let userRoles = await Roles.find({ user_id: body._id });
      let removedRoles = userRoles.filter(
        (x) => !body.roles.includes(x.role_id.toString())
      );
      let newRoles = body.rules.filter(
        (x) => !userRoles.map((y) => y.role_id).includes(x)
      );

      if (removedRoles.length > 0) {
        await UserRoles.deleteMany({
          _id: { $in: removedRoles.map((x) => x._id.toString()) },
        });
      }
      if (newRoles.length > 0) {
        await UserRoles.insertMany(
          newRoles.map((x) => ({
            role_id: x,
            user_id: body._id,
          }))
        );
      }
    }

    await Users.findOneAndUpdate({ _id: body._id }, updates);
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post("/delete", auth.checkRoles("user_delete"), async (req, res) => {
  try {
    let body = req.body;
    if (!body._id)
      throw new CustomError(
        Enum.HTTP_CODES.BAD_REQUEST,
        i18n.translate("COMMON.VALIDATION_ERROR", req.user.language),
        i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, [
          "_id",
        ])
      );
    await Users.findOneAndDelete({ _id: body._id });
    await UserRoles.deleteMany({ user_id: body._id });
    res.json(Response.successResponse({ success: true }));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

module.exports = router;
